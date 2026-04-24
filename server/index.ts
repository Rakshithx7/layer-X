import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root even when command is started from ./server.
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import http from "node:http";
import { MongoServerError, ObjectId } from "mongodb";
import { PublicKey } from "@solana/web3.js";
import { ensureIndexes, getCollections, isMongoConfigured } from "./mongo";
import type { ApiContact, ApiError, ContactDoc } from "./types";

const port = Number(process.env.PORT ?? 8787);

function jsonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function sendJson(res: http.ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, jsonHeaders());
  res.end(JSON.stringify(body));
}

function sendError(res: http.ServerResponse, statusCode: number, error: string, details?: string) {
  const payload: ApiError = details ? { error, details } : { error };
  sendJson(res, statusCode, payload);
}

async function readJsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isValidSolanaAddress(address: string) {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function normalizeSolanaAddress(address: string) {
  return new PublicKey(address).toBase58();
}

function normalizeContactName(name: string) {
  return name.trim().replace(/^@+/, "").replace(/\s+/g, " ").toLowerCase();
}

function displayContactName(name: string) {
  return name.trim().replace(/^@+/, "").replace(/\s+/g, " ");
}

function toApiContact(doc: ContactDoc): ApiContact {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId,
    name: doc.name,
    wallet: doc.wallet,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function ensureUserRecord(userId: string, users: any) {
  if (!isValidSolanaAddress(userId)) {
    throw new Error("Invalid userId");
  }

  const wallet = normalizeSolanaAddress(userId);
  const now = new Date();

  await users.updateOne(
    { _id: userId },
    {
      $setOnInsert: {
        _id: userId,
        createdAt: now,
      },
      $set: {
        wallet,
        walletNormalized: wallet,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
}

async function main() {
  console.log("[startup] mongo configured:", Boolean(process.env.MONGODB_URI?.trim()));

  try {
    await ensureIndexes();
  } catch (error) {
    console.error("[startup] failed to initialize MongoDB", error);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    if (!req.url || !req.method) {
      return sendError(res, 400, "Bad request");
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, jsonHeaders());
      return res.end();
    }

    try {
      console.log("[request]", req.method, url.pathname, url.search);

      if (url.pathname === "/health") {
        return sendJson(res, 200, { ok: true, mongoConfigured: isMongoConfigured() });
      }

      if (!isMongoConfigured()) {
        console.error("[mongo] request rejected because MONGODB_URI is missing at runtime");
        return sendError(res, 503, "MongoDB not configured", "Missing MONGODB_URI");
      }

      const { contacts, users } = await getCollections();

      // GET CONTACTS
      if (url.pathname === "/contacts" && req.method === "GET") {
        const userId = url.searchParams.get("userId") ?? "";

        if (!isValidSolanaAddress(userId)) {
          return sendError(res, 400, "Invalid userId");
        }

        await ensureUserRecord(userId, users);

        const docs = await contacts.find({ userId }).sort({ createdAt: -1 }).toArray();
        console.log("[contacts] fetched", { userId, count: docs.length });
        return sendJson(res, 200, { contacts: docs.map(toApiContact) });
      }

      // ADD CONTACT
      if (url.pathname === "/contacts" && req.method === "POST") {
        const body = await readJsonBody(req);
        const { userId = "", name = "", wallet = "" } = body || {};

        if (!isValidSolanaAddress(userId)) return sendError(res, 400, "Invalid userId");
        if (!name) return sendError(res, 400, "Name required");
        if (!isValidSolanaAddress(wallet)) return sendError(res, 400, "Invalid wallet");

        await ensureUserRecord(userId, users);

        const now = new Date();
        const normalizedName = normalizeContactName(name);
        const normalizedWallet = normalizeSolanaAddress(wallet);

        const duplicate = await contacts.findOne({
          userId,
          $or: [{ nameNormalized: normalizedName }, { walletNormalized: normalizedWallet }],
        });
        if (duplicate) {
          return sendError(res, 409, "Contact already exists", "A contact with this name or wallet already exists.");
        }

        const doc = {
          _id: new ObjectId(),
          userId,
          name: displayContactName(name),
          nameNormalized: normalizedName,
          wallet: normalizedWallet,
          walletNormalized: normalizedWallet,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await contacts.insertOne(doc);
        } catch (error) {
          if (error instanceof MongoServerError && error.code === 11000) {
            return sendError(res, 409, "Contact already exists", "A contact with this name or wallet already exists.");
          }
          throw error;
        }
        console.log("[contacts] created", {
          userId,
          contactId: doc._id.toHexString(),
          name: doc.name,
          wallet: doc.wallet,
        });
        return sendJson(res, 201, { contact: toApiContact(doc as any) });
      }

      return sendError(res, 404, "Route not found");
    } catch (err: any) {
      console.error("[request] failed", {
        method: req.method,
        path: url.pathname,
        search: url.search,
        message: err?.message,
        stack: err?.stack,
      });
      return sendError(res, 500, "Internal server error", err?.message);
    }
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("[startup] fatal error", error);
  process.exit(1);
});
