// actions/user.actions.ts
"use server";

import User from "@/modals/user.modal";
import { connect } from "@/db";

/** DTOs returned to the client (plain JSON, dates as strings) */
export type CreditHistoryEntryDTO = {
  coin: string;
  strategy: string;
  creditsUsed: number;
  timestamp: string; // ISO
};

export type UserDTO = {
  _id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: "free" | "basic";
  customerId: string;
  credits: number;
  topCoins: string[];
  creditHistory: CreditHistoryEntryDTO[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** Input for creation */
export type CreateUserInput = {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: "free" | "basic";
  customerId?: string;
  credits?: number; // optional; schema default is 10
};

/** Helper: cast JSON.parse(JSON.stringify(...)) to DTO */
function toDTO<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

/**
 * Create (or fetch) a user by clerkId. Safe for webhook retries.
 */
export async function createUser(user: CreateUserInput): Promise<UserDTO> {
  await connect();

  const doc = await User.findOneAndUpdate(
    { clerkId: user.clerkId },
    {
      $setOnInsert: {
        clerkId: user.clerkId,
        email: user.email.toLowerCase().trim(),
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        subscriptionTier: user.subscriptionTier ?? "free",
        customerId: user.customerId ?? "",
        credits: user.credits ?? undefined, // allow schema default to apply if undefined
        topCoins: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return toDTO<UserDTO>(doc);
}

/** Fetch by Clerk ID (returns DTO with date strings) */
export async function getUser(userId: string): Promise<UserDTO | null> {
  await connect();
  const user = await User.findOne({ clerkId: userId });
  return user ? toDTO<UserDTO>(user) : null;
}

/**
 * Deduct credits for a backtest and log coin + strategy (atomic).
 */
export async function consumeBacktestCredits(
  userId: string,
  amount: number,
  opts: { coin: string; strategy: string }
): Promise<UserDTO> {
  await connect();
  if (amount <= 0) throw new Error("Amount must be > 0");

  const entry = {
    coin: opts.coin,
    strategy: opts.strategy,
    creditsUsed: amount,
    timestamp: new Date(),
  };

  const updated = await User.findOneAndUpdate(
    { clerkId: userId, credits: { $gte: amount } },
    {
      $inc: { credits: -amount },
      $push: {
        creditHistory: {
          $each: [entry],
          $position: 0,
          $slice: 50,
        },
      },
    },
    { new: true }
  );

  if (!updated) throw new Error("User not found or not enough credits");
  return toDTO<UserDTO>(updated);
}

/** Add credits (atomic) */
export async function addCredits(
  userId: string,
  amount: number
): Promise<UserDTO> {
  await connect();
  if (amount <= 0) throw new Error("Amount must be > 0");

  const updated = await User.findOneAndUpdate(
    { clerkId: userId },
    { $inc: { credits: amount } },
    { new: true }
  );

  if (!updated) throw new Error("User not found");
  return toDTO<UserDTO>(updated);
}

/** Check available credits */
export async function hasEnoughCredits(
  userId: string,
  requiredCredits = 1
): Promise<boolean> {
  await connect();
  const user = await User.findOne({ clerkId: userId }, { credits: 1, _id: 0 });
  if (!user) throw new Error("User not found");
  return user.credits >= requiredCredits;
}

/** Top coins */
export async function getUserTopCoins(userId: string): Promise<string[]> {
  await connect();
  const user = await User.findOne({ clerkId: userId }, { topCoins: 1, _id: 0 });
  return user?.topCoins ?? [];
}

/** Update top coins (max 3) */
export async function updateUserTopCoins(
  userId: string,
  topCoins: string[]
): Promise<string[]> {
  if (topCoins.length > 3) throw new Error("Only 3 coins can be selected");

  await connect();
  const user = await User.findOneAndUpdate(
    { clerkId: userId },
    { topCoins },
    { new: true, projection: { topCoins: 1 } }
  );

  if (!user) throw new Error("User not found");
  return toDTO<{ topCoins: string[] }>(user).topCoins;
}
