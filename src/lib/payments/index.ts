import "server-only";
import { markPaymentPaid } from "./fulfil";
import { stripeEnabled } from "./stripe";

/**
 * Payments entry point (DR-0001 commission model). Booking checkout and
 * Connect onboarding live in ./bookings; fulfilment primitives in ./fulfil.
 *
 * TEST BYPASS MODE (no STRIPE_SECRET_KEY): payments are recorded as paid
 * `test_bypass` transactions and fulfilled immediately, so every flow works
 * end-to-end without a Stripe account. Gated out of production by
 * assertBypassAllowed (see ./stripe).
 */

export { stripeEnabled };

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
        metadata?: Record<string, string>;
      };
      const meta = session.metadata ?? {};

      if (meta.kind === "booking" && meta.payment_id) {
        const paid = await markPaymentPaid(meta.payment_id, session.payment_intent ?? undefined);
        if (paid && meta.booking_id) {
          const { attachPaidBookingPayment } = await import("./bookings");
          await attachPaidBookingPayment(meta.booking_id, meta.payment_id);
        }
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as {
        id: string;
        payouts_enabled?: boolean;
        metadata?: Record<string, string>;
      };
      const { syncConnectAccount } = await import("./bookings");
      await syncConnectAccount(account);
      break;
    }
  }
}
