import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import {
  cancelBooking,
  markBookingComplete,
  payBooking,
} from "@/lib/actions/bookings";
import { COMMISSION, formatGBP } from "@/lib/pricing";
import type { Database } from "@/lib/supabase/database.types";
import { PageHeading, Card, Button, EmptyState } from "@/components/ui";
import { Banner, formatDateTime } from "@/components/client/shared";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const BANNERS: Record<string, { tone: "success" | "warn"; text: string }> = {
  proposed: {
    tone: "success",
    text: "Booking sent. We'll let you know as soon as your carer confirms, then you can pay securely here.",
  },
  "test-paid": {
    tone: "success",
    text: "Booking paid. Payment was completed via the test bypass.",
  },
  paid: {
    tone: "success",
    text: "Payment received. Your visit is booked and your carer has been notified.",
  },
  cancelled: {
    tone: "warn",
    text: "Checkout was cancelled. Your booking is still confirmed and waiting for payment, and you haven't been charged.",
  },
};

const STATUS_STYLES: Record<BookingStatus, string> = {
  proposed: "bg-tan/30 text-[#7a6a3d]",
  confirmed: "bg-green/10 text-green",
  completed: "bg-sage/30 text-green-dark",
  cancelled: "bg-sand text-muted",
  disputed: "bg-red-100 text-red-700",
};

function BookingStatusPill({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(2)} hr${rounded === 1 ? "" : "s"}`;
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const banner = typeof sp.status === "string" ? BANNERS[sp.status] : undefined;

  const { supabase } = await requireRole("client");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, professional_id, status, starts_at, ends_at, hours, hourly_rate, client_fee_pct, care_amount, client_fee_amount, total_amount, client_notes, cancelled_reason, confirmed_at, completed_at, created_at, payments:payment_id (status, provider)"
    )
    .order("created_at", { ascending: false });

  const rows = bookings ?? [];

  const { data: cards } = rows.length
    ? await supabase
        .from("professional_cards")
        .select("id, first_name, kind")
        .in("id", [...new Set(rows.map((r) => r.professional_id))])
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  const now = new Date();

  return (
    <div>
      <PageHeading
        eyebrow="Bookings"
        title="Your care bookings"
        intro={`Book hours with your carer and pay securely through the platform: their rate plus a ${COMMISSION.clientPct}% platform fee, nothing else.`}
      />

      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}

      {rows.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="Find a carer you like, arrange a free meet & greet, then book care hours straight from their profile."
          action={
            <Link
              href="/app/search"
              className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Find care
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((b) => {
            const card = cardById.get(b.professional_id);
            const isPaid = b.payments?.status === "paid";
            const visitEnded = new Date(b.ends_at) < now;

            return (
              <Card key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {card ? (
                        <Link
                          href={`/app/professionals/${b.professional_id}`}
                          className="font-serif text-xl text-ink hover:text-green"
                        >
                          {card.first_name}
                        </Link>
                      ) : (
                        <span className="font-serif text-xl text-muted">
                          Professional
                        </span>
                      )}
                      {card?.kind && (
                        <span className="text-[13.5px] text-faint capitalize">
                          {card.kind}
                        </span>
                      )}
                      <BookingStatusPill status={b.status} />
                    </div>

                    <p className="text-[14.5px] text-body mt-1.5">
                      {formatDateTime(b.starts_at)} to{" "}
                      {formatDateTime(b.ends_at)}
                    </p>

                    <p className="text-[13.5px] text-muted mt-1.5">
                      <span className="font-semibold text-ink">
                        {formatGBP(b.total_amount)}
                      </span>{" "}
                      total: {formatHours(b.hours)} ×{" "}
                      {formatGBP(b.hourly_rate)}/hr ={" "}
                      {formatGBP(b.care_amount)}, plus the {b.client_fee_pct}%
                      fee ({formatGBP(b.client_fee_amount)})
                    </p>

                    {b.status === "proposed" && (
                      <p className="text-[13.5px] text-faint mt-1.5">
                        Awaiting carer confirmation. You&apos;ll pay once they
                        accept.
                      </p>
                    )}
                    {b.status === "confirmed" && !isPaid && (
                      <p className="text-[13.5px] text-faint mt-1.5">
                        Confirmed by your carer. Pay to secure the visit.
                      </p>
                    )}
                    {b.status === "confirmed" && isPaid && (
                      <p className="text-[13.5px] text-faint mt-1.5">
                        Paid, visit scheduled.
                        {visitEnded &&
                          " Once the visit has happened, mark it complete so your carer is paid."}
                      </p>
                    )}
                    {b.status === "completed" && (
                      <p className="text-[13.5px] text-faint mt-1.5">
                        Completed. {formatGBP(b.total_amount)} paid, and your
                        carer has been paid for this visit.
                      </p>
                    )}
                    {b.status === "cancelled" && b.cancelled_reason && (
                      <p className="text-[13.5px] text-faint mt-1.5">
                        Reason: {b.cancelled_reason}
                      </p>
                    )}

                    {b.client_notes && (
                      <p className="text-[14.5px] text-body mt-3 bg-sand/60 rounded-xl px-4 py-2.5">
                        &ldquo;{b.client_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch gap-2">
                    {b.status === "confirmed" && !isPaid && (
                      <form action={payBooking} className="flex flex-col gap-2 max-w-[260px]">
                        <input type="hidden" name="bookingId" value={b.id} />
                        {new Date(b.starts_at).getTime() - Date.now() <
                          14 * 86_400_000 && (
                          <label className="flex items-start gap-2 text-[12.5px] leading-[1.45] text-muted">
                            <input
                              type="checkbox"
                              name="earlyStart"
                              required
                              className="mt-0.5 h-3.5 w-3.5 accent-[#3F5E54]"
                            />
                            <span>
                              I ask for this visit to go ahead within the
                              14-day cancellation period, and understand that
                              once it has fully taken place I lose the right
                              to cancel this booking.
                            </span>
                          </label>
                        )}
                        <Button type="submit" className="w-full">
                          Pay {formatGBP(b.total_amount)}
                        </Button>
                      </form>
                    )}
                    {b.status === "confirmed" && isPaid && visitEnded && (
                      <form action={markBookingComplete}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <Button type="submit" className="w-full">
                          Mark visit complete
                        </Button>
                      </form>
                    )}
                    {(b.status === "proposed" ||
                      (b.status === "confirmed" && !isPaid)) && (
                      <form action={cancelBooking}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button
                          type="submit"
                          className="w-full px-4 py-2 rounded-full font-semibold text-[14px] border border-hairline-strong text-muted hover:border-red-300 hover:text-red-700 transition-colors"
                        >
                          Cancel booking
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
