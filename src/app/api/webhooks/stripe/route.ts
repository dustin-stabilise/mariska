import { NextResponse } from "next/server";
import { getStripe, stripeEnabled } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments";

/**
 * Stripe webhook endpoint. Configure in the Stripe dashboard once the account
 * exists: events `checkout.session.completed`, `invoice.paid`,
 * `customer.subscription.deleted` -> https://<domain>/api/webhooks/stripe
 */
export async function POST(request: Request) {
  if (!stripeEnabled || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe not configured - running in test bypass mode" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Non-2xx makes Stripe retry - desirable for transient DB failures.
    console.error("stripe webhook error", err);
    return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
