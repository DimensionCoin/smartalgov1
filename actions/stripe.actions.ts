"use server";

import { stripe } from "@/lib/stripe";
import User from "@/modals/user.modal";
import { connect } from "@/db";

type Props = {
  userId: string;
  email: string;
  priceId: string;
};

export const subscribe = async ({ userId, email, priceId }: Props) => {
  if (!userId || !email || !priceId) {
    console.error("❌ Missing required params:", { userId, email, priceId });
    throw new Error("Missing required params");
  }

  try {
    console.log("🔹 Connecting to database...");
    await connect();

    console.log("🔹 Looking up Stripe customer for email:", email);
    // Retrieve or create a Stripe customer
    const existingCustomer = await stripe.customers.list({ email, limit: 1 });
    let customerId =
      existingCustomer.data.length > 0 ? existingCustomer.data[0]?.id : null;

    if (!customerId) {
      console.log("🔹 Creating new Stripe customer for email:", email);
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
    } else {
      console.log("🔹 Found existing Stripe customer:", customerId);
    }

    // Store `customerId` in MongoDB **before creating the session**
    console.log("🔹 Updating user record with customerId:", customerId);
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { customerId },
      { new: true, upsert: true } // Added upsert option
    );

    if (!updatedUser) {
      console.error("❌ Failed to update user record");
    } else {
      console.log("✅ User record updated successfully");
    }

    // Validate the price ID exists in Stripe
    try {
      console.log("🔹 Validating price ID:", priceId);
      await stripe.prices.retrieve(priceId);
      console.log("✅ Price ID is valid");
    } catch (priceError) {
      console.error("❌ Invalid price ID:", priceError);
      throw new Error(`Invalid price ID: ${priceId}`);
    }

    // Create a Stripe Checkout Session
    console.log("🔹 Creating Stripe checkout session...");
    const successUrl = `${
      process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
    }/payments/success`;
    const cancelUrl = `${
      process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
    }/payments/cancel`;

    console.log("🔹 Success URL:", successUrl);
    console.log("🔹 Cancel URL:", cancelUrl);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, customerId },
      mode: "subscription",
      billing_address_collection: "required",
      customer_update: { name: "auto", address: "auto" },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("✅ Checkout session created successfully:", session.id);
    return session.url;
  } catch (error: any) {
    console.error("❌ Stripe Subscription Error:", error);
    // More detailed error message
    throw new Error(
      `Failed to create subscription: ${error.message || "Unknown error"}`
    );
  }
};
