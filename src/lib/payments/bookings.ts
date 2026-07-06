import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMMISSION, bookingAmounts } from "@/lib/pricing";
import { brand } from "@/lib/brand";
import { assertBypassAllowed, getStripe, stripeEnabled } from "./stripe";
import { recordPayment } from "./fulfil";

/**
 * Booking money flows (DR-0001 commission model).
 *
 * Lifecycle: client proposes -> carer accepts (DB RPC) -> client pays ->
 * visit happens -> client/admin completes -> carer payout.
 *
 * TEST BYPASS (no STRIPE_SECRET_KEY): payment recorded paid instantly,
 * payout recorded paid instantly. LIVE: Stripe Checkout destination charge
 * (application fee = client fee + carer fee) to the carer's Connect account;
 * the destination charge moves the carer's net automatically, so the payout
 * row simply mirrors the transfer.
 */

function appUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}

export async function createBookingProposal(opts: {
  clientId: string;
  professionalId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  notes?: string;
}) {
  const db = createAdminClient();

  const { data: pro, error: proErr } = await db
    .from("professional_profiles")
    .select("id, status, compliance_status, hourly_rate_min")
    .eq("id", opts.professionalId)
    .single();
  if (proErr || !pro) throw new Error("professional_not_found");
  if (pro.status !== "active" || pro.compliance_status === "red") {
    throw new Error("professional_not_bookable");
  }
  if (!pro.hourly_rate_min) throw new Error("professional_has_no_rate");

  const ms = new Date(opts.endsAt).getTime() - new Date(opts.startsAt).getTime();
  const hours = Math.round((ms / 3_600_000) * 100) / 100;
  if (!(hours > 0 && hours <= 24 * 14)) throw new Error("invalid_duration");

  const rate = pro.hourly_rate_min;
  const amounts = bookingAmounts(hours, rate);

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      client_id: opts.clientId,
      professional_id: opts.professionalId,
      starts_at: opts.startsAt,
      ends_at: opts.endsAt,
      hours,
      hourly_rate: rate,
      client_fee_pct: COMMISSION.clientPct,
      carer_fee_pct: COMMISSION.carerPct,
      care_amount: amounts.careAmount,
      client_fee_amount: amounts.clientFeeAmount,
      total_amount: amounts.totalAmount,
      carer_fee_amount: amounts.carerFeeAmount,
      carer_net_amount: amounts.carerNetAmount,
      client_notes: opts.notes ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createBookingProposal: ${error.message}`);
  return booking;
}

/** Client pays a confirmed booking. Returns a redirect URL. */
export async function startBookingCheckout(userId: string, bookingId: string): Promise<string> {
  const db = createAdminClient();

  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("client_id", userId)
    .single();
  if (error || !booking) throw new Error("booking_not_found");
  if (booking.status !== "confirmed") throw new Error("booking_not_payable");
  if (booking.payment_id) {
    const { data: existing } = await db
      .from("payments")
      .select("status")
      .eq("id", booking.payment_id)
      .single();
    if (existing?.status === "paid") throw new Error("booking_already_paid");
  }

  if (!stripeEnabled) {
    assertBypassAllowed();
    const payment = await recordPayment({
      userId,
      kind: "booking",
      amount: booking.total_amount,
      provider: "test_bypass",
      status: "paid",
      metadata: { test: true, booking_id: bookingId },
    });
    await db.from("bookings").update({ payment_id: payment.id }).eq("id", bookingId);
    await notifyBookingPaid(booking.professional_id, Number(booking.hours), booking.carer_net_amount);
    return "/app/bookings?status=test-paid";
  }

  const { data: pro } = await db
    .from("professional_profiles")
    .select("stripe_account_id, payouts_enabled")
    .eq("id", booking.professional_id)
    .single();
  if (!pro?.stripe_account_id || !pro.payouts_enabled) {
    throw new Error("carer_payouts_not_ready");
  }

  const payment = await recordPayment({
    userId,
    kind: "booking",
    amount: booking.total_amount,
    provider: "stripe",
    metadata: { booking_id: bookingId },
  });

  // Destination charge: platform keeps client fee + carer fee, the carer's
  // net lands in their Connect account when the charge settles.
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: booking.total_amount,
          product_data: {
            name: `${brand.name} care booking · ${booking.hours}h`,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: booking.client_fee_amount + booking.carer_fee_amount,
      transfer_data: { destination: pro.stripe_account_id },
    },
    metadata: { payment_id: payment.id, kind: "booking", booking_id: bookingId, user_id: userId },
    success_url: appUrl("/app/bookings?status=paid"),
    cancel_url: appUrl("/app/bookings?status=cancelled"),
  });

  await db
    .from("payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", payment.id);
  await db.from("bookings").update({ payment_id: payment.id }).eq("id", bookingId);

  return session.url!;
}

async function notifyBookingPaid(professionalId: string, hours: number, carerNet: number) {
  const { sendToUser } = await import("@/lib/email");
  const { bookingPaidProEmail } = await import("@/lib/email/templates");
  const email = bookingPaidProEmail(hours, carerNet);
  await sendToUser(professionalId, email.subject, email.html);
}

/** Called from the webhook (live) after checkout completes. */
export async function attachPaidBookingPayment(bookingId: string, paymentId: string) {
  const db = createAdminClient();
  const { data: booking } = await db
    .from("bookings")
    .update({ payment_id: paymentId })
    .eq("id", bookingId)
    .select()
    .single();
  if (booking) {
    await notifyBookingPaid(booking.professional_id, Number(booking.hours), booking.carer_net_amount);
  }
}

/** Mark the visit complete and record the carer payout. */
export async function completeBooking(bookingId: string, actorId: string, isAdmin: boolean) {
  const db = createAdminClient();

  const { data: booking, error } = await db
    .from("bookings")
    .select("*, payments:payment_id (status)")
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error("booking_not_found");
  if (!isAdmin && booking.client_id !== actorId) throw new Error("not_allowed");
  if (booking.status !== "confirmed") throw new Error("booking_not_completable");

  const paymentStatus = (booking.payments as { status: string } | null)?.status;
  if (paymentStatus !== "paid") throw new Error("booking_not_paid");

  const { error: updErr } = await db
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "confirmed");
  if (updErr) throw new Error(updErr.message);

  // Bypass: money never moved, mark payout paid for the demo ledger.
  // Live: the destination charge already routed the net to the carer's
  // Connect account; this row is the platform-side record of it.
  const provider = stripeEnabled ? "stripe" : "test_bypass";
  const { error: payoutErr } = await db.from("payouts").insert({
    professional_id: booking.professional_id,
    booking_id: bookingId,
    amount: booking.carer_net_amount,
    provider,
    status: "paid",
    paid_at: new Date().toISOString(),
  });
  // unique(booking_id) makes retries idempotent
  if (payoutErr && !payoutErr.message.includes("duplicate key")) {
    throw new Error(payoutErr.message);
  }
}

/** Stripe Connect onboarding for carers. Returns a redirect URL. */
export async function startConnectOnboarding(professionalId: string): Promise<string> {
  const db = createAdminClient();

  if (!stripeEnabled) {
    assertBypassAllowed();
    await db
      .from("professional_profiles")
      .update({ stripe_account_id: `acct_test_bypass_${professionalId.slice(0, 8)}`, payouts_enabled: true })
      .eq("id", professionalId);
    return "/app/pro?status=test-payouts-enabled";
  }

  const { data: pro } = await db
    .from("professional_profiles")
    .select("stripe_account_id")
    .eq("id", professionalId)
    .single();

  let accountId = pro?.stripe_account_id;
  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: "GB",
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { professional_id: professionalId },
    });
    accountId = account.id;
    await db
      .from("professional_profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", professionalId);
  }

  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/app/pro?status=connect-retry"),
    return_url: appUrl("/app/pro?status=connect-return"),
    type: "account_onboarding",
  });
  return link.url;
}

/** Webhook: keep payouts_enabled in sync with the Connect account state. */
export async function syncConnectAccount(account: {
  id: string;
  payouts_enabled?: boolean;
  metadata?: Record<string, string>;
}) {
  const db = createAdminClient();
  await db
    .from("professional_profiles")
    .update({ payouts_enabled: Boolean(account.payouts_enabled) })
    .eq("stripe_account_id", account.id);
}
