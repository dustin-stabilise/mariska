import "server-only";
import Stripe from "stripe";

/**
 * Stripe plumbing. The account doesn't exist yet - until STRIPE_SECRET_KEY is
 * set, `stripeEnabled` is false and the app runs in TEST BYPASS mode
 * (see index.ts). When the keys arrive, set the env vars and everything here
 * goes live without code changes.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Guard: the test bypass must never activate in production. A missing Stripe
 * key on a production deployment is a misconfiguration, not a request for
 * free credits - fail the checkout instead. Set PAYMENTS_ALLOW_TEST_BYPASS=1
 * to run a production-environment demo deliberately.
 */
export function assertBypassAllowed() {
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.PAYMENTS_ALLOW_TEST_BYPASS !== "1"
  ) {
    throw new Error(
      "Payments are not configured (STRIPE_SECRET_KEY missing in production)"
    );
  }
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeEnabled) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
