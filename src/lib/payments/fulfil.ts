import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Fulfilment - the single place where a paid event turns into product state.
 * Called from the test-bypass path immediately, or from the Stripe webhook
 * when live. All writes use the service role (these tables are service-only).
 */

type Provider = "stripe" | "test_bypass" | "manual";

export async function recordPayment(opts: {
  userId: string;
  kind: "credit_pack" | "interview_fee" | "placement_fee" | "retainer" | "booking";
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

/** Create an interview request. Free meet-and-greet under DR-0001; paymentId
 * only present for legacy paid requests. */
export async function createInterviewRequest(opts: {
  clientId: string;
  professionalId: string;
  paymentId?: string;
  notes?: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("interview_requests")
    .insert({
      client_id: opts.clientId,
      professional_id: opts.professionalId,
      payment_id: opts.paymentId ?? null,
      client_notes: opts.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createInterviewRequest: ${error.message}`);
  return data;
}
