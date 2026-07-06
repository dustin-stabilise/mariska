import "server-only";
import { PRICING } from "@/lib/pricing";
import { brand } from "@/lib/brand";
import { assertBypassAllowed, getStripe, stripeEnabled } from "./stripe";
import {
  activateRetainer,
  createInterviewRequest,
  grantCreditPack,
  markPaymentPaid,
  recordPayment,
} from "./fulfil";

/**
 * Checkout entry points. Each returns a URL to send the user to.
 *
 * TEST BYPASS MODE (no STRIPE_SECRET_KEY): the payment is recorded as a paid
 * `test_bypass` transaction and fulfilled immediately - every flow works
 * end-to-end without a Stripe account.
 *
 * LIVE MODE: a Stripe Checkout session is created (inline price_data, so no
 * dashboard product setup is required) and fulfilment happens in the webhook.
 */

export { stripeEnabled };

function appUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}

export async function startCreditPackCheckout(userId: string): Promise<string> {
  if (!stripeEnabled) {
    assertBypassAllowed();
    const payment = await recordPayment({
      userId,
      kind: "credit_pack",
      amount: PRICING.creditPack.amount,
      provider: "test_bypass",
      status: "paid",
      metadata: { test: true },
    });
    await grantCreditPack(userId, payment.id);
    return "/app/credits?status=test-purchase";
  }

  const payment = await recordPayment({
    userId,
    kind: "credit_pack",
    amount: PRICING.creditPack.amount,
    provider: "stripe",
  });

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: PRICING.currency,
          unit_amount: PRICING.creditPack.amount,
          product_data: {
            name: `${brand.name} · ${PRICING.creditPack.label}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { payment_id: payment.id, kind: "credit_pack", user_id: userId },
    success_url: appUrl("/app/credits?status=success"),
    cancel_url: appUrl("/app/credits?status=cancelled"),
  });

  const db = (await import("@/lib/supabase/admin")).createAdminClient();
  await db
    .from("payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", payment.id);

  return session.url!;
}

export async function startInterviewCheckout(
  userId: string,
  professionalId: string,
  notes?: string
): Promise<string> {
  if (!stripeEnabled) {
    assertBypassAllowed();
    const payment = await recordPayment({
      userId,
      kind: "interview_fee",
      amount: PRICING.interview.amount,
      provider: "test_bypass",
      status: "paid",
      metadata: { test: true, professional_id: professionalId },
    });
    await createInterviewRequest({
      clientId: userId,
      professionalId,
      paymentId: payment.id,
      notes,
    });
    return "/app/interviews?status=test-requested";
  }

  const payment = await recordPayment({
    userId,
    kind: "interview_fee",
    amount: PRICING.interview.amount,
    provider: "stripe",
    metadata: { professional_id: professionalId, notes: notes ?? "" },
  });

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: PRICING.currency,
          unit_amount: PRICING.interview.amount,
          product_data: {
            name: `${brand.name} · ${PRICING.interview.label}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      payment_id: payment.id,
      kind: "interview_fee",
      user_id: userId,
      professional_id: professionalId,
      notes: notes ?? "",
    },
    success_url: appUrl("/app/interviews?status=success"),
    cancel_url: appUrl("/app/interviews?status=cancelled"),
  });

  const db = (await import("@/lib/supabase/admin")).createAdminClient();
  await db
    .from("payments")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", payment.id);

  return session.url!;
}

export async function startRetainerCheckout(userId: string): Promise<string> {
  if (!stripeEnabled) {
    assertBypassAllowed();
    await recordPayment({
      userId,
      kind: "retainer",
      amount: PRICING.retainer.amount,
      provider: "test_bypass",
      status: "paid",
      metadata: { test: true },
    });
    await activateRetainer({ clientId: userId, provider: "test_bypass" });
    return "/app/retainer?status=test-subscribed";
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: PRICING.currency,
          unit_amount: PRICING.retainer.amount,
          recurring: { interval: PRICING.retainer.interval },
          product_data: {
            name: `${brand.name} · ${PRICING.retainer.label}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { kind: "retainer", user_id: userId },
    subscription_data: { metadata: { user_id: userId } },
    success_url: appUrl("/app/retainer?status=success"),
    cancel_url: appUrl("/app/retainer?status=cancelled"),
  });

  return session.url!;
}

/**
 * Webhook fulfilment - called from /api/webhooks/stripe with a verified event.
 */
export async function handleStripeEvent(event: {
  type: string;
  data: { object: unknown };
}) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        id: string;
        payment_intent?: string | null;
        subscription?: string | null;
        metadata?: Record<string, string>;
      };
      const meta = session.metadata ?? {};

      if (meta.kind === "credit_pack" && meta.payment_id) {
        const paid = await markPaymentPaid(meta.payment_id, session.payment_intent ?? undefined);
        if (paid) await grantCreditPack(meta.user_id, meta.payment_id);
      } else if (meta.kind === "interview_fee" && meta.payment_id) {
        const paid = await markPaymentPaid(meta.payment_id, session.payment_intent ?? undefined);
        if (paid) {
          await createInterviewRequest({
            clientId: meta.user_id,
            professionalId: meta.professional_id,
            paymentId: meta.payment_id,
            notes: meta.notes || undefined,
          });
        }
      } else if (meta.kind === "retainer" && meta.user_id) {
        await recordPayment({
          userId: meta.user_id,
          kind: "retainer",
          amount: PRICING.retainer.amount,
          provider: "stripe",
          status: "paid",
          stripeCheckoutSessionId: session.id,
        });
        await activateRetainer({
          clientId: meta.user_id,
          provider: "stripe",
          stripeSubscriptionId: session.subscription ?? undefined,
        });
      }
      break;
    }

    case "invoice.paid": {
      // Retainer renewal -> monthly credit grant (skip the first invoice,
      // activation already granted it).
      const invoice = event.data.object as {
        billing_reason?: string;
        subscription?: string | null;
        parent?: { subscription_details?: { metadata?: Record<string, string> } };
        subscription_details?: { metadata?: Record<string, string> };
      };
      if (invoice.billing_reason === "subscription_cycle") {
        const meta =
          invoice.parent?.subscription_details?.metadata ??
          invoice.subscription_details?.metadata ??
          {};
        if (meta.user_id) {
          const { grantRetainerCredits } = await import("./fulfil");
          await grantRetainerCredits(meta.user_id);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
      };
      const { cancelRetainer } = await import("./fulfil");
      await cancelRetainer(sub.metadata?.user_id ?? "", sub.id);
      break;
    }
  }
}
