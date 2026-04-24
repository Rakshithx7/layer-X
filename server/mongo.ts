import { MongoClient } from "mongodb";
import type { ContactDoc, UserDoc } from "./types";

let client: MongoClient;
let connectPromise: Promise<MongoClient> | null = null;

function getMongoUri() {
  return process.env.MONGODB_URI?.trim() || "";
}

function getDbName() {
  return process.env.MONGODB_DB?.trim() || "cryptochat";
}

function getContactsCollectionName() {
  return process.env.COLLECTION_CONTACTS?.trim() || "contacts";
}

function getUsersCollectionName() {
  return process.env.COLLECTION_USERS?.trim() || "users";
}

export function isMongoConfigured() {
  return Boolean(getMongoUri());
}

async function getClient() {
  const uri = getMongoUri();
  if (!uri) throw new Error("Missing MONGODB_URI");

  if (client) {
    return client;
  }

  if (!connectPromise) {
    console.log("[mongo] connecting", {
      dbName: getDbName(),
      contactsCollection: getContactsCollectionName(),
      usersCollection: getUsersCollectionName(),
    });

    connectPromise = new MongoClient(uri)
      .connect()
      .then((connectedClient) => {
        client = connectedClient;
        console.log("[mongo] connected");
        return connectedClient;
      })
      .catch((error) => {
        connectPromise = null;
        console.error("[mongo] connection failed", error);
        throw error;
      });
  }

  return connectPromise;
}

export async function getCollections() {
  const client = await getClient();
  const db = client.db(getDbName());

  return {
    contacts: db.collection<ContactDoc>(getContactsCollectionName()),
    users: db.collection<UserDoc>(getUsersCollectionName()),
  };
}

export async function ensureIndexes() {
  if (!isMongoConfigured()) {
    console.warn("[mongo] skipping index creation because MONGODB_URI is missing");
    return;
  }

  const { contacts, users } = await getCollections();

  await contacts.createIndex({ userId: 1, nameNormalized: 1 }, { unique: true });
  await contacts.createIndex({ userId: 1, walletNormalized: 1 }, { unique: true });
  await users.createIndex({ walletNormalized: 1 }, { unique: true });

  console.log("[mongo] indexes ensured");
}
