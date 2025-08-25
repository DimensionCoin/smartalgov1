import mongoose, { Schema } from "mongoose";

// ---- Subdocuments ----
const CreditHistorySchema = new Schema(
  {
    coin: { type: String, required: true },
    strategy: { type: String, required: true },
    creditsUsed: { type: Number, required: true, min: 1 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

export type CreditHistoryEntry = mongoose.InferSchemaType<
  typeof CreditHistorySchema
>;

const NotificationPrefsSchema = new Schema(
  {
    channels: {
      web: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    onFollow: { type: Boolean, default: true },
    onComment: { type: Boolean, default: true },
    onStrategyPublish: { type: Boolean, default: true },
    onSignal: { type: Boolean, default: true },
    onCopyTrade: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSettingsSchema = new Schema(
  {
    timezone: { type: String, default: "America/Toronto" },
    baseCurrency: { type: String, default: "USD" },
    locale: { type: String, default: "en-CA" },
    theme: { type: String, default: "system" },
  },
  { _id: false }
);

// Base58 (no 0,O,I,l) and expected Solana pubkey length ~43–44 chars.
// Allow empty string to represent “not connected yet”.
const SOLANA_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;

const UserSchema = new Schema(
  {
    // Identity
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },

    // Handle & profile
    username: { type: String, unique: true, sparse: true, index: true },
    usernameLower: { type: String, unique: true, sparse: true, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    bio: { type: String, default: "" },

    // Subscription
    subscriptionTier: {
      type: String,
      enum: ["free", "basic"],
      default: "free",
    },
    customerId: { type: String, default: "" },
    subscriptionStatus: { type: String, default: "inactive" },
    subscriptionRenewalAt: { type: Date, default: null },

    // Backtesting credits
    credits: { type: Number, required: true, default: 10 },
    creditHistory: { type: [CreditHistorySchema], default: [] },

    // Preferences
    topCoins: { type: [String], default: [] },
    settings: { type: UserSettingsSchema, default: {} },
    notificationPrefs: { type: NotificationPrefsSchema, default: {} },

    // Roles / moderation
    roles: { type: [String], default: ["user"] },
    status: { type: String, default: "active" },

    // Social counters
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    strategiesCount: { type: Number, default: 0 },

    // 🔥 New: Solana wallet (single primary)
    solanaWallet: {
      type: String,
      default: "",
      validate: {
        validator: (v: string) => v === "" || SOLANA_BASE58_RE.test(v),
        message: "Invalid Solana address format.",
      },
    },

    // Soft delete
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ---- Indexes ----
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
UserSchema.index(
  { clerkId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ usernameLower: 1 }, { unique: true, sparse: true });
UserSchema.index({ "creditHistory.timestamp": -1 });

// Unique claim on wallet; sparse allows many users with no wallet set.
UserSchema.index({ solanaWallet: 1 }, { unique: true, sparse: true });

// ---- Types & model ----
export type IUser = mongoose.InferSchemaType<typeof UserSchema>;

let User: mongoose.Model<IUser>;
try {
  User = mongoose.model<IUser>("User");
} catch {
  User = mongoose.model<IUser>("User", UserSchema);
}

export default User;
