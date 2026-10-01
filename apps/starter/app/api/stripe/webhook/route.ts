import { NextResponse } from "next/server";
import { processStripeSubscriptionEvent } from "@/lib/admin-billing";
import { verifyStripeWebhook } from "@/lib/stripe-billing";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const rawBody = await req.text();

  let event;
  try {
    event = verifyStripeWebhook(
      rawBody,
      req.headers.get("stripe-signature"),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    await processStripeSubscriptionEvent(event);
  }

  return NextResponse.json({ received: true });
}
