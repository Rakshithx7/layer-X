import type { ObjectId } from "mongodb";

export type ContactDoc = {
  _id: ObjectId;
  userId: string;
  name: string;
  nameNormalized: string;
  wallet: string;
  walletNormalized: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDoc = {
  _id: string;
  wallet: string;
  walletNormalized: string;
  username?: string;
  usernameNormalized?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ApiContact = {
  id: string;
  userId: string;
  name: string;
  wallet: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error: string;
  details?: string;
};
