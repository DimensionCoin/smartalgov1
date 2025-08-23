import mongoose, { Schema } from "mongoose";

// Subdocument schema
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

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },

    subscriptionTier: {
      type: String,
      enum: ["free", "basic"],
      default: "free",
    },
    customerId: { type: String, default: "" },

    credits: { type: Number, required: true, default: 10 },

    topCoins: { type: [String], default: [] },
    creditHistory: { type: [CreditHistorySchema], default: [] },
  },
  { timestamps: true }
);

// ✅ Keep only these index declarations
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ clerkId: 1 }, { unique: true });
UserSchema.index({ "creditHistory.timestamp": -1 });

export type IUser = mongoose.InferSchemaType<typeof UserSchema>;

let User: mongoose.Model<IUser>;
try {
  User = mongoose.model<IUser>("User");
} catch {
  User = mongoose.model<IUser>("User", UserSchema);
}

export default User;
