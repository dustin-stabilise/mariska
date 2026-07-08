import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { acceptBooking, cancelBooking } from "@/lib/actions/bookings";
import { COMMISSION, formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Stat, Button, EmptyState } from "@/components/ui";
import { CareSummary } from "@/components/pro/care-summary";

export const dynamic = "force-dynamic";

type PayoutRow = {
  booking_id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  paid_at: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Mon 6 Jul 2026, 09:00 – 13:00" (en-dash for the time range). */
function formatWhen(startsAt: string, endsAt: string): string {
  return `${formatDate(startsAt)}, ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function formatHours(hours: number): string {
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hour${hours === 1 ? "" : "s"}`;
}

const PILL = "inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap";

function BookingPill({ status }: { status: string }) {
  const tint: Record<string, string> = {
    proposed: "bg-tan/30 text-[#7a6a3d]",
    confirmed: "bg-green/10 text-green",
    completed: "bg-green/10 text-green",
    cancelled: "bg-sand text-muted",
    disputed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`${PILL} capitalize ${tint[status] ?? "bg-sand text-muted"}`}>{status}</span>
  );
}

export default async function ProBookingsPage() {
  const { supabase, user } = await requireRole("professional");

  const [{ data: pro }, { data: bookingRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("hourly_rate_min")
      .eq("id", user.id)
      .single(),
    supabase
      .from("bookings")
      .select(
        "id, client_id, status, starts_at, ends_at, hours, hourly_rate, care_amount, carer_net_amount, client_notes, cancelled_reason, created_at, payments:payment_id (status)"
      )
      .eq("professional_id", user.id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("payouts")
      .select("booking_id, amount, status, paid_at")
      .eq("professional_id", user.id),
  ]);

  const bookings = bookingRows ?? [];
  const payouts: PayoutRow[] = payoutRows ?? [];
  const payoutByBooking = new Map(payouts.map((p) => [p.booking_id, p]));

  // Care profiles of the clients behind these bookings. RLS only returns the
  // ones this professional is allowed to see; anyone else simply has no row.
  const clientIds = [...new Set(bookings.map((b) => b.client_id))];
  const { data: careProfiles } =
    clientIds.length > 0
      ? await supabase.from("care_profiles").select("*").in("client_id", clientIds)
      : { data: null };
  const careByClient = new Map((careProfiles ?? []).map((p) => [p.client_id, p]));

  const proposals = bookings
    .filter((b) => b.status === "proposed")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const history = bookings.filter((b) =>
    ["completed", "cancelled", "disputed"].includes(b.status)
  );

  const totalEarned = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayout = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Bookings & earnings"
        intro={`Clients book and pay through the platform. You keep ${100 - COMMISSION.carerPct}% of your rate, paid out after each completed booking.`}
      />

      {pro && pro.hourly_rate_min === null && (
        <Card className="mb-6 bg-sage-light border-sage">
          <h2 className="font-serif text-lg text-ink">Set your hourly rate</h2>
          <p className="text-[15px] text-body mt-1">
            Set your hourly rate so clients can book you. You choose the rate,
            and you keep {100 - COMMISSION.carerPct}% of it on every booking.
          </p>
          <Link
            href="/app/pro/profile"
            className="inline-block mt-3 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Set your rate on your profile &rarr;
          </Link>
        </Card>
      )}

      {/* Earnings stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Total earned" value={formatGBP(totalEarned)} hint="Payouts paid to date" />
        <Stat
          label="Pending payout"
          value={formatGBP(pendingPayout)}
          hint="From completed bookings"
        />
        <Stat label="Upcoming bookings" value={upcoming.length} hint="Confirmed" />
        <Stat label="Proposals" value={proposals.length} hint="Awaiting your response" />
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          body="When a client proposes a booking, it appears here for you to accept or decline. Keeping your availability confirmed helps you appear in search."
        />
      ) : (
        <div className="space-y-8 max-w-3xl">
          {/* Proposals */}
          <section>
            <h2 className="font-serif text-xl text-ink mb-3">New proposals</h2>
            {proposals.length === 0 ? (
              <p className="text-[14.5px] text-muted">No proposals waiting on you.</p>
            ) : (
              <div className="space-y-4">
                {proposals.map((b) => (
                  <Card key={b.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15.5px] font-semibold text-ink">
                          {formatWhen(b.starts_at, b.ends_at)}
                        </h3>
                        <p className="text-[13px] text-muted mt-0.5">
                          {formatHours(b.hours)} at {formatGBP(b.hourly_rate)}/hour
                        </p>
                      </div>
                      <BookingPill status={b.status} />
                    </div>

                    <p className="mt-3 text-[15px] text-ink">
                      You&apos;ll receive{" "}
                      <span className="font-semibold">{formatGBP(b.carer_net_amount)}</span>
                      <span className="text-muted text-[13.5px]">
                        {" "}
                        ({formatGBP(b.care_amount)} at your rate, minus the{" "}
                        {COMMISSION.carerPct}% platform fee)
                      </span>
                    </p>

                    {b.client_notes && (
                      <p className="mt-3 text-[14.5px] text-body bg-sand/60 rounded-xl px-4 py-3">
                        &ldquo;{b.client_notes}&rdquo;
                      </p>
                    )}

                    {careByClient.has(b.client_id) && (
                      <CareSummary profile={careByClient.get(b.client_id)!} />
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <form action={acceptBooking}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <Button type="submit">Accept</Button>
                      </form>
                      <form action={cancelBooking} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Reason (optional)"
                          className="border border-hairline-strong rounded-full px-4 py-2 text-[14px] bg-card text-ink w-52"
                        />
                        <Button type="submit" variant="secondary">
                          Decline
                        </Button>
                      </form>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming confirmed */}
          <section>
            <h2 className="font-serif text-xl text-ink mb-3">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-[14.5px] text-muted">No confirmed bookings coming up.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map((b) => {
                  const paid = b.payments?.status === "paid";
                  return (
                    <Card key={b.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[15.5px] font-semibold text-ink">
                            {formatWhen(b.starts_at, b.ends_at)}
                          </h3>
                          <p className="text-[13px] text-muted mt-0.5">
                            {formatHours(b.hours)} at {formatGBP(b.hourly_rate)}/hour, you&apos;ll
                            receive {formatGBP(b.carer_net_amount)}
                          </p>
                        </div>
                        <span
                          className={`${PILL} ${paid ? "bg-green/10 text-green" : "bg-tan/30 text-[#7a6a3d]"}`}
                        >
                          {paid ? "Paid, confirmed" : "Payment pending from client"}
                        </span>
                      </div>

                      {b.client_notes && (
                        <p className="mt-3 text-[14.5px] text-body bg-sand/60 rounded-xl px-4 py-3">
                          &ldquo;{b.client_notes}&rdquo;
                        </p>
                      )}

                      {careByClient.has(b.client_id) && (
                        <CareSummary profile={careByClient.get(b.client_id)!} />
                      )}

                      <form
                        action={cancelBooking}
                        className="mt-4 flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Reason (optional)"
                          className="border border-hairline-strong rounded-full px-4 py-2 text-[14px] bg-card text-ink w-52"
                        />
                        <Button type="submit" variant="secondary">
                          Cancel booking
                        </Button>
                      </form>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* History */}
          <section>
            <h2 className="font-serif text-xl text-ink mb-3">History</h2>
            {history.length === 0 ? (
              <p className="text-[14.5px] text-muted">
                Completed and cancelled bookings will appear here.
              </p>
            ) : (
              <Card className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 pr-4 whitespace-nowrap">
                        When
                      </th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 pr-4 whitespace-nowrap">
                        Hours
                      </th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 pr-4 whitespace-nowrap">
                        Your earnings
                      </th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 pr-4 whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 whitespace-nowrap">
                        Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((b) => {
                      const payout = payoutByBooking.get(b.id);
                      return (
                        <tr key={b.id} className="border-t border-hairline">
                          <td className="py-3 pr-4 align-top text-[14.5px] text-body whitespace-nowrap">
                            {formatWhen(b.starts_at, b.ends_at)}
                          </td>
                          <td className="py-3 pr-4 align-top text-[14.5px] text-body">
                            {formatHours(b.hours)}
                          </td>
                          <td className="py-3 pr-4 align-top text-[14.5px] text-body">
                            {b.status === "completed" ? formatGBP(b.carer_net_amount) : "–"}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <BookingPill status={b.status} />
                            {b.status === "cancelled" && b.cancelled_reason && (
                              <span
                                className="block text-[12.5px] text-faint max-w-44 truncate"
                                title={b.cancelled_reason}
                              >
                                {b.cancelled_reason}
                              </span>
                            )}
                          </td>
                          <td className="py-3 align-top text-[14.5px] text-body whitespace-nowrap">
                            {b.status !== "completed" ? (
                              <span className="text-faint">–</span>
                            ) : !payout ? (
                              <span className="text-muted">Being prepared</span>
                            ) : payout.status === "paid" ? (
                              <span className="text-green font-medium">
                                Paid{payout.paid_at ? ` ${formatDate(payout.paid_at)}` : ""}
                              </span>
                            ) : payout.status === "failed" ? (
                              <span className="text-red-700 font-medium">Failed</span>
                            ) : (
                              <span className="text-[#7a6a3d]">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
