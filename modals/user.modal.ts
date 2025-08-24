import mongoose, { Schema } from "mongoose";

// ---- Subdocuments ----
// Backtest-only credit history (coin + strategy string, as you already use)
const CreditHistorySchema = new Schema(
  {
    coin: { type: String, required: true }, // e.g., "SOL", "BTC"
    strategy: { type: String, required: true }, // keep string to avoid refactors in actions
    creditsUsed: { type: Number, required: true, min: 1 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

export type CreditHistoryEntry = mongoose.InferSchemaType<
  typeof CreditHistorySchema
>;

// Notification prefs (kept tiny; expand later if you add email/push)
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

// User settings (timezone/currency/theme). Safe to ignore until you use them.
const UserSettingsSchema = new Schema(
  {
    timezone: { type: String, default: "America/Toronto" },
    baseCurrency: { type: String, default: "USD" },
    locale: { type: String, default: "en-CA" },
    theme: { type: String, default: "system" }, // "light" | "dark" | "system"
  },
  { _id: false }
);

// ---- Main schema ----
const UserSchema = new Schema(
  {
    // Identity (Clerk source of truth)
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },

    // Optional handle + profile bits (no avatar here; fetch from Clerk)
    username: { type: String, unique: true, sparse: true, index: true }, // display handle (case preserved)
    usernameLower: { type: String, unique: true, sparse: true, index: true }, // for case-insensitive uniqueness
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    bio: { type: String, default: "" },

    // Roles & moderation (ready for admin/mod tooling later)
    roles: { type: [String], default: ["user"] }, // "user" | "moderator" | "admin"
    status: { type: String, default: "active" }, // "active" | "suspended" | "banned"

    // Subscription (exactly what you asked: free | basic)
    subscriptionTier: {
      type: String,
      enum: ["free", "basic"],
      default: "free",
    },
    customerId: { type: String, default: "" }, // your billing system id (Stripe, etc.)
    subscriptionStatus: { type: String, default: "inactive" }, // "active" | "trialing" | "past_due" | "canceled" | "inactive"
    subscriptionRenewalAt: { type: Date, default: null },

    // Backtesting credits ONLY (unchanged keys so actions keep working)
    credits: { type: Number, required: true, default: 10 },
    creditHistory: { type: [CreditHistorySchema], default: [] },

    // Preferences / personalization
    topCoins: { type: [String], default: [] }, // your action already caps to 3
    settings: { type: UserSettingsSchema, default: {} },
    notificationPrefs: { type: NotificationPrefsSchema, default: {} },

    // Social counters (cached, filled later by jobs)
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    strategiesCount: { type: Number, default: 0 },

    // Soft delete (handy later; does not affect your current actions)
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ---- Indexes ----
// Keep your originals; add case-insensitive uniqueness via usernameLower.
// `sparse: true` lets users exist without a username.
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

// ---- Types & model (simple; no complex generics/statics) ----
export type IUser = mongoose.InferSchemaType<typeof UserSchema>;

let User: mongoose.Model<IUser>;
try {
  User = mongoose.model<IUser>("User");
} catch {
  User = mongoose.model<IUser>("User", UserSchema);
}

export default User;
