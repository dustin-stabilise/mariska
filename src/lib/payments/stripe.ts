import "server-only";
import Stripe from "stripe";

/**
 * Stripe plumbing. The account doesn't exist yet — until STRIPE_SECRET_KEY is
 * set, `stripeEnabled` is false and the app runs in TEST BYPASS mode
 * (see index.ts). When the keys arrive, set the env vars and everything here
 * goes live without code changes.
 */
export const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

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
