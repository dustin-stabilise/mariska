import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICING } from "@/lib/pricing";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Fulfilment - the single place where a paid event turns into product state.
 * Called from the test-bypass path immediately, or from the Stripe webhook
 * when live. All writes use the service role (these tables are service-only).
 */

type Provider = "stripe" | "test_bypass" | "manual";

export async function recordPayment(opts: {
  userId: string;
  kind: "credit_pack" | "interview_fee" | "placement_fee" | "retainer";
  amount: number;
  provider: Provider;
  status?: "pending" | "paid";
  stripeCheckoutSessionId?: string;
  metadata?: Json;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("payments")
    .insert({
      user_id: opts.userId,
      kind: opts.kind,
      amount: opts.amount,
      provider: opts.provider,
      status: opts.status ?? "pending",
      stripe_checkout_session_id: opts.stripeCheckoutSessionId ?? null,
      metadata: opts.metadata ?? {},
      paid_at: opts.status === "paid" ? new Date().toISOString() : null,
    })
    .select()
    .single();
  if (error) throw new Error(`recordPayment: ${error.message}`);
  return data;
}

export async function markPaymentPaid(paymentId: string, paymentIntentId?: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId ?? null,
    })
    .eq("id", paymentId)
    .eq("status", "pending") // idempotent: only fulfil once
    .select()
    .maybeSingle();
  if (error) throw new Error(`markPaymentPaid: ${error.message}`);
  return data; // null when already fulfilled
}

/** Credit pack: +5 credits. */
export async function grantCreditPack(clientId: string, paymentId: string) {
  const db = createAdminClient();
  const { error } = await db.from("credit_ledger").insert({
    client_id: clientId,
    delta: PRICING.creditPack.credits,
    reason: "purchase",
    payment_id: paymentId,
  });
  if (error) throw new Error(`grantCreditPack: ${error.message}`);
}

/** Paid interview request: create the request row. */
export async function createInterviewRequest(opts: {
  clientId: string;
  professionalId: string;
  paymentId: string;
  notes?: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("interview_requests")
    .insert({
      client_id: opts.clientId,
      professional_id: opts.professionalId,
      payment_id: opts.paymentId,
      client_notes: opts.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createInterviewRequest: ${error.message}`);
  return data;
}

/** Activate the £50/mo retainer + grant this period's included credits. */
export async function activateRetainer(opts: {
  clientId: string;
  provider: Provider;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("retainer_subscriptions")
    .select("id")
    .eq("client_id", opts.clientId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db
    .from("retainer_subscriptions")
    .insert({
      client_id: opts.clientId,
      provider: opts.provider,
      stripe_subscription_id: opts.stripeSubscriptionId ?? null,
      current_period_end: opts.currentPeriodEnd ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`activateRetainer: ${error.message}`);

  await grantRetainerCredits(opts.clientId);
  return data;
}

/** Monthly retainer credits (called on activation and each renewal). */
export async function grantRetainerCredits(clientId: string) {
  const db = createAdminClient();
  const { error } = await db.from("credit_ledger").insert({
    client_id: clientId,
    delta: PRICING.retainer.includedCredits,
    reason: "retainer_grant",
  });
  if (error) throw new Error(`grantRetainerCredits: ${error.message}`);
}

export async function cancelRetainer(clientId: string, stripeSubscriptionId?: string) {
  const db = createAdminClient();
  let query = db
    .from("retainer_subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("status", "active");
  query = stripeSubscriptionId
    ? query.eq("stripe_subscription_id", stripeSubscriptionId)
    : query.eq("client_id", clientId);
  const { error } = await query;
  if (error) throw new Error(`cancelRetainer: ${error.message}`);
}
