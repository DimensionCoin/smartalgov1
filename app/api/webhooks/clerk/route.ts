// app/api/webhooks/clerk/route.ts
export const runtime = "nodejs";

import { Webhook } from "svix";
import { headers } from "next/headers";
import {
  clerkClient as clerkClientOrFactory,
  type WebhookEvent,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createUser, type CreateUserInput } from "@/actions/user.actions";
import User from "@/modals/user.modal";

/** Minimal Clerk client shape we need */
type ClerkUsersAPI = {
  updateUser: (
    userId: string,
    data: { publicMetadata?: Record<string, unknown> }
  ) => Promise<unknown>;
};
type ClerkClientLike = { users: ClerkUsersAPI };

async function getClerkClient(): Promise<ClerkClientLike> {
  const maybe = clerkClientOrFactory as unknown;
  if (typeof maybe === "function") {
    return await (maybe as () => Promise<ClerkClientLike>)();
  }
  return maybe as ClerkClientLike;
}

/** Narrow type for Clerk emails */
type ClerkEmailAddress = { id: string; email_address: string };
interface ClerkEventData {
  id: string;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Safely pull the primary email from Clerk event payload */
function getPrimaryEmailFromEvent(data: ClerkEventData): string | null {
  const list = data.email_addresses ?? [];
  const primaryId = data.primary_email_address_id;
  const primary =
    (primaryId && list.find((e) => e.id === primaryId)?.email_address) ||
    list[0]?.email_address ||
    null;
  return primary;
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET to .env.local");
  }

  try {
    const h = await headers();
    const svixId = h.get("svix-id");
    const svixTimestamp = h.get("svix-timestamp");
    const svixSignature = h.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Error: Missing Svix headers", { status: 400 });
    }

    const body = await req.text();
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;
    try {
      evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const eventType = evt.type;
    const data = evt.data as ClerkEventData;
    const clerkId = data?.id;

    if (eventType === "user.created" || eventType === "user.updated") {
      if (!clerkId) {
        return NextResponse.json(
          { error: "Missing Clerk user id" },
          { status: 400 }
        );
      }

      const email = getPrimaryEmailFromEvent(data);
      if (!email) {
        return NextResponse.json(
          { error: "No primary email" },
          { status: 400 }
        );
      }

      const maybeUsername = data.username?.trim() || null;

      const basePayload: CreateUserInput = {
        clerkId,
        email,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        subscriptionTier: "free",
        customerId: "",
      };

      let mongoUser;
      try {
        mongoUser = await createUser({
          ...basePayload,
          username: maybeUsername,
        });
      } catch (err: unknown) {
        const e = err as {
          code?: number;
          keyPattern?: Record<string, unknown>;
        };
        const dup =
          e?.code === 11000 &&
          (e?.keyPattern?.usernameLower || e?.keyPattern?.username);
        if (!dup) throw err;
        mongoUser = await createUser(basePayload);
      }

      try {
        const client = await getClerkClient();
        await client.users.updateUser(clerkId, {
          publicMetadata: { userId: mongoUser._id },
        });
      } catch (e) {
        console.warn("Failed to update Clerk publicMetadata.userId", e);
      }

      return NextResponse.json({
        message: eventType === "user.created" ? "User created" : "User updated",
        user: mongoUser,
      });
    }

    if (eventType === "user.deleted") {
      if (!clerkId) return new Response("", { status: 200 });
      try {
        await User.updateOne({ clerkId }, { $set: { deletedAt: new Date() } });
      } catch (e) {
        console.warn("Failed to soft-delete user", e);
      }
      return new Response("", { status: 200 });
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
