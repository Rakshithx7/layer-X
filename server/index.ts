import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root even when command is started from ./server.
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import http from "node:http";
import { DeepgramClient } from "@deepgram/sdk";
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

async function ensureUserRecord(userId: string, users: import("mongodb").Collection<any>) {
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
    { upsert: true },
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
          return sendError(
            res,
            409,
            "Contact already exists",
            "A contact with this name or wallet already exists.",
          );
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
            return sendError(
              res,
              409,
              "Contact already exists",
              "A contact with this name or wallet already exists.",
            );
          }
          throw error;
        }
        console.log("[contacts] created", {
          userId,
          contactId: doc._id.toHexString(),
          name: doc.name,
          wallet: doc.wallet,
        });
        return sendJson(res, 201, { contact: toApiContact(doc) });
      }

      // UPDATE CONTACT
      if (url.pathname.startsWith("/contacts/") && req.method === "PATCH") {
        const contactId = url.pathname.split("/")[2] ?? "";
        if (!ObjectId.isValid(contactId)) {
          return sendError(res, 400, "Invalid contact id");
        }

        const body = (await readJsonBody(req)) as {
          userId?: string;
          name?: string;
          wallet?: string;
        } | null;
        const userId = body?.userId?.trim() ?? "";

        if (!isValidSolanaAddress(userId)) {
          return sendError(res, 400, "Invalid userId");
        }

        await ensureUserRecord(userId, users);

        const existing = await contacts.findOne({ _id: new ObjectId(contactId), userId });
        if (!existing) {
          return sendError(res, 404, "Contact not found");
        }

        const nextName = body?.name?.trim();
        const nextWallet = body?.wallet?.trim();
        const updates: Partial<ContactDoc> = {};

        if (nextName !== undefined) {
          if (!nextName) {
            return sendError(res, 400, "Contact name is required");
          }

          const normalizedName = normalizeContactName(nextName);
          const nameConflict = await contacts.findOne({
            userId,
            nameNormalized: normalizedName,
            _id: { $ne: existing._id },
          });
          if (nameConflict) {
            return sendError(res, 409, "Contact name already exists");
          }

          updates.name = displayContactName(nextName);
          updates.nameNormalized = normalizedName;
        }

        if (nextWallet !== undefined) {
          if (!isValidSolanaAddress(nextWallet)) {
            return sendError(res, 400, "Invalid Solana wallet address");
          }

          const normalizedWallet = normalizeSolanaAddress(nextWallet);
          const walletConflict = await contacts.findOne({
            userId,
            walletNormalized: normalizedWallet,
            _id: { $ne: existing._id },
          });
          if (walletConflict) {
            return sendError(res, 409, "Contact wallet already exists");
          }

          updates.wallet = normalizedWallet;
          updates.walletNormalized = normalizedWallet;
        }

        updates.updatedAt = new Date();

        try {
          await contacts.updateOne({ _id: existing._id, userId }, { $set: updates });
        } catch (error) {
          if (error instanceof MongoServerError && error.code === 11000) {
            return sendError(
              res,
              409,
              "Contact already exists",
              "A contact with this name or wallet already exists.",
            );
          }
          throw error;
        }

        const updated = await contacts.findOne({ _id: existing._id, userId });
        return sendJson(res, 200, { contact: updated ? toApiContact(updated) : null });
      }

      // DEEPGRAM TOKEN
      if (url.pathname === "/speech-token" && req.method === "GET") {
        if (!process.env.DEEPGRAM_API_KEY) {
          return sendError(res, 500, "Deepgram API key not configured");
        }

        try {
          const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY });
          // Create a temporary key valid for 10 minutes
          const result = (await deepgram.manage.v1.projects.keys.create(
            process.env.DEEPGRAM_PROJECT_ID!,
            {
              comment: "Temporary speech recognition token",
              scopes: ["usage:write"],
              time_to_live_in_seconds: 600,
            } as unknown,
          )) as unknown as { key: string };

          if (!result.key) {
            throw new Error("Missing key in response");
          }

          return sendJson(res, 200, { key: result.key });
        } catch (err: unknown) {
          console.error("Deepgram key generation exception:", err);
          return sendError(res, 500, "Failed to generate speech token", err.message);
        }
      }

      // DELETE CONTACT
      if (url.pathname.startsWith("/contacts/") && req.method === "DELETE") {
        const contactId = url.pathname.split("/")[2] ?? "";
        const userId = url.searchParams.get("userId") ?? "";

        if (!ObjectId.isValid(contactId)) {
          return sendError(res, 400, "Invalid contact id");
        }

        if (!isValidSolanaAddress(userId)) {
          return sendError(res, 400, "Invalid userId");
        }

        await ensureUserRecord(userId, users);

        const result = await contacts.deleteOne({ _id: new ObjectId(contactId), userId });
        if (result.deletedCount === 0) {
          return sendError(res, 404, "Contact not found");
        }

        return sendJson(res, 200, { ok: true });
      }

      // RESOLVE RECIPIENT
      if (url.pathname === "/contacts/resolve" && req.method === "GET") {
        const userId = url.searchParams.get("userId") ?? "";
        const query = url.searchParams.get("query")?.trim() ?? "";

        if (!isValidSolanaAddress(userId)) {
          return sendError(res, 400, "Invalid userId");
        }

        if (!query) {
          return sendError(res, 400, "Query is required");
        }

        await ensureUserRecord(userId, users);

        const nameQuery = normalizeContactName(query);
        const contact = await contacts.findOne({ userId, nameNormalized: nameQuery });
        if (contact) {
          return sendJson(res, 200, {
            matchType: "contact",
            contact: toApiContact(contact),
          });
        }

        const usernameMatch = await users.findOne({ usernameNormalized: nameQuery });
        if (usernameMatch) {
          return sendJson(res, 200, {
            matchType: "username",
            username: usernameMatch.username ?? query,
            wallet: usernameMatch.wallet,
            userId: usernameMatch._id,
          });
        }

        if (isValidSolanaAddress(query)) {
          return sendJson(res, 200, {
            matchType: "wallet",
            wallet: normalizeSolanaAddress(query),
          });
        }

        return sendJson(res, 404, {
          matchType: "missing",
          query,
          message: `No contact found for ${query}`,
        });
      }

      return sendError(res, 404, "Route not found");
    } catch (err: unknown) {
      console.error("[request] failed", {
        method: req.method,
        path: url.pathname,
        search: url.search,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return sendError(
        res,
        500,
        "Internal server error",
        err instanceof Error ? err.message : undefined,
      );
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
