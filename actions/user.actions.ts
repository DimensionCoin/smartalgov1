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
  username?: string | null;
  subscriptionTier: "free" | "basic";
  customerId: string;
  credits: number;
  topCoins: string[];
  creditHistory: CreditHistoryEntryDTO[];
  solanaWallet: string; // ← added
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** Input for creation (compatible with your webhook) */
export type CreateUserInput = {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: "free" | "basic";
  customerId?: string;
  credits?: number; // optional; schema default is 10
  username?: string | null; // optional; usually set later from profile
  // solanaWallet?: string | null; // optional — usually set via setSolanaWallet()
};

/** Helper: cast JSON.parse(JSON.stringify(...)) to DTO */
function toDTO<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

/**
 * Create (or fetch) a user by clerkId. Safe for webhook retries.
 * - Keeps email/name in sync with Clerk on every call.
 * - Inserts defaults on first run.
 * - If a username is provided, sets both username and usernameLower.
 */
export async function createUser(user: CreateUserInput): Promise<UserDTO> {
  await connect();

  const normalizedEmail = user.email.toLowerCase().trim();

  const $set: Record<string, unknown> = {
    email: normalizedEmail,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
  };

  if (user.username && user.username.trim()) {
    $set.username = user.username.trim();
    $set.usernameLower = user.username.trim().toLowerCase();
  }

  const doc = await User.findOneAndUpdate(
    { clerkId: user.clerkId },
    {
      $set,
      $setOnInsert: {
        clerkId: user.clerkId,
        subscriptionTier: user.subscriptionTier ?? "free",
        customerId: user.customerId ?? "",
        credits: user.credits ?? undefined, // let schema default apply if undefined
        topCoins: [],
        // everything else in the schema has defaults already (incl. solanaWallet="")
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

/* -----------------------------
   Username helpers
----------------------------- */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin",
  "root",
  "support",
  "help",
  "contact",
  "about",
  "api",
  "app",
  "login",
  "signup",
  "settings",
  "profile",
  "user",
  "users",
  "me",
  "dashboard",
  "feed",
  "explore",
  "news",
]);

export async function isUsernameAvailable(
  desiredRaw: string
): Promise<{ ok: boolean; reason?: string }> {
  await connect();

  const desired = (desiredRaw || "").trim();
  if (!USERNAME_RE.test(desired)) {
    return {
      ok: false,
      reason: "Username must be 3–20 chars (letters, numbers, underscore).",
    };
  }
  const lower = desired.toLowerCase();
  if (RESERVED.has(lower)) {
    return { ok: false, reason: "That username is reserved." };
  }
  const exists = await User.exists({ usernameLower: lower });
  if (exists) return { ok: false, reason: "That username is taken." };
  return { ok: true };
}

type MongoDupErr = { code?: number; keyPattern?: Record<string, unknown> };

export async function setUsername(
  clerkId: string,
  desiredRaw: string
): Promise<UserDTO> {
  await connect();

  const desired = (desiredRaw || "").trim();
  if (!USERNAME_RE.test(desired)) {
    throw new Error(
      "Username must be 3–20 chars (letters, numbers, underscore)."
    );
  }
  const lower = desired.toLowerCase();
  if (RESERVED.has(lower)) {
    throw new Error("That username is reserved.");
  }

  try {
    const updated = await User.findOneAndUpdate(
      { clerkId },
      { $set: { username: desired, usernameLower: lower } },
      { new: true }
    );
    if (!updated) throw new Error("User not found");
    return toDTO<UserDTO>(updated);
  } catch (err: unknown) {
    const e = err as MongoDupErr;
    if (
      e?.code === 11000 &&
      (e.keyPattern?.usernameLower || e.keyPattern?.username)
    ) {
      throw new Error("That username is taken.");
    }
    throw err;
  }
}

/* -----------------------------
   Solana wallet helpers (new)
----------------------------- */

// Same regex used in the model: base58 (no 0,O,I,l), 43–44 chars.
const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

/** Validate a Solana address format */
function isValidSolAddress(addr: string): boolean {
  return SOLANA_BASE58_RE.test(addr);
}

/** Get current wallet (string, may be empty) */
export async function getSolanaWallet(clerkId: string): Promise<string> {
  await connect();
  const user = await User.findOne({ clerkId }, { solanaWallet: 1, _id: 0 });
  if (!user) throw new Error("User not found");
  return user.solanaWallet ?? "";
}

/**
 * Set/update the user's Solana wallet.
 * - Validates base58 format and length.
 * - Enforces unique claim via unique sparse index.
 * - On duplicate, throws "That wallet is already connected by another user."
 */
export async function setSolanaWallet(
  clerkId: string,
  addressRaw: string
): Promise<UserDTO> {
  await connect();

  const address = (addressRaw || "").trim();
  if (!isValidSolAddress(address)) {
    throw new Error("Invalid Solana address format.");
  }

  try {
    const updated = await User.findOneAndUpdate(
      { clerkId },
      { $set: { solanaWallet: address } },
      { new: true }
    );
    if (!updated) throw new Error("User not found");
    return toDTO<UserDTO>(updated);
  } catch (err: unknown) {
    const e = err as MongoDupErr;
    if (e?.code === 11000 && e.keyPattern?.solanaWallet) {
      throw new Error("That wallet is already connected by another user.");
    }
    throw err;
  }
}

/**
 * Clear (disconnect) the user's Solana wallet.
 * - Sets the field to empty string so the sparse unique index doesn't collide.
 */
export async function clearSolanaWallet(clerkId: string): Promise<UserDTO> {
  await connect();
  const updated = await User.findOneAndUpdate(
    { clerkId },
    { $set: { solanaWallet: "" } },
    { new: true }
  );
  if (!updated) throw new Error("User not found");
  return toDTO<UserDTO>(updated);
}
