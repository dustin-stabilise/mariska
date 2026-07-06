import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card, Stat, EmptyState } from "@/components/ui";
import { markBookingComplete } from "@/lib/actions/bookings";
import { adminCancelBooking } from "@/lib/actions/admin";
import { formatGBP } from "@/lib/pricing";
import { Constants } from "@/lib/supabase/database.types";
import {
  formatDate,
  humanise,
  nameMap,
  statusPillClass,
  td,
  th,
  trow,
} from "@/lib/admin/helpers";

const STATUSES = Constants.public.Enums.booking_status;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "6 Jul 2026, 09:00 – 13:00" (en-dash for the time range). */
function formatWhen(startsAt: string, endsAt: string): string {
  return `${formatDate(startsAt)}, ${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { status } = await searchParams;
  const activeFilter = (STATUSES as readonly string[]).includes(status ?? "")
    ? (status as (typeof STATUSES)[number])
    : undefined;

  const { data } = await supabase
    .from("bookings")
    .select(
      "id, client_id, professional_id, status, starts_at, ends_at, hours, hourly_rate, care_amount, client_fee_amount, carer_fee_amount, carer_net_amount, total_amount, cancelled_reason, created_at, payments:payment_id (status), payouts (status, paid_at)"
    )
    .order("created_at", { ascending: false });
  const allBookings = data ?? [];
  const bookings = activeFilter
    ? allBookings.filter((b) => b.status === activeFilter)
    : allBookings;

  // Revenue summary (over all bookings, regardless of the active filter)
  const platformTake = allBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.client_fee_amount + b.carer_fee_amount, 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const bookingsThisMonth = allBookings.filter(
    (b) => new Date(b.created_at).getTime() >= monthStart
  ).length;
  const awaitingPayment = allBookings.filter(
    (b) => b.status === "confirmed" && b.payments?.status !== "paid"
  ).length;

  const personIds = [
    ...new Set(bookings.flatMap((b) => [b.client_id, b.professional_id])),
  ];
  const { data: nameRows } = personIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", personIds)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Bookings"
        intro="Every booking on the platform, with the money split and payment state. Commission is the client fee plus the carer fee on each booking."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Stat
          label="Platform take"
          value={formatGBP(platformTake)}
          hint="Commission on completed bookings"
        />
        <Stat
          label="Bookings this month"
          value={bookingsThisMonth}
          hint={`${allBookings.length} all time`}
        />
        <Stat
          label="Awaiting payment"
          value={awaitingPayment}
          hint="Confirmed but not yet paid"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterPill href="/app/admin/bookings" label="All" active={!activeFilter} />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={`/app/admin/bookings?status=${s}`}
            label={s}
            active={activeFilter === s}
          />
        ))}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          body={
            activeFilter
              ? `No bookings with status “${activeFilter}”.`
              : "No bookings have been made yet."
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Professional</th>
                <th className={th}>When</th>
                <th className={th}>Hours</th>
                <th className={th}>Money</th>
                <th className={th}>Status</th>
                <th className={th}>Payment</th>
                <th className={th}>Payout</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const paid = b.payments?.status === "paid";
                const payout = b.payouts?.[0];
                const cancellable = b.status === "proposed" || b.status === "confirmed";
                return (
                  <tr key={b.id} className={trow}>
                    <td className={td}>
                      <span className="font-medium text-ink">
                        {names.get(b.client_id) ?? "Unknown"}
                      </span>
                    </td>
                    <td className={td}>
                      <Link
                        href={`/app/admin/professionals/${b.professional_id}`}
                        className="font-medium text-ink hover:text-green"
                      >
                        {names.get(b.professional_id) ?? "Unknown"}
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatWhen(b.starts_at, b.ends_at)}
                    </td>
                    <td className={td}>{b.hours}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      <span className="font-medium text-ink">
                        {formatGBP(b.total_amount)}
                      </span>
                      <span className="block text-[12.5px] text-faint">
                        fees {formatGBP(b.client_fee_amount + b.carer_fee_amount)} · carer{" "}
                        {formatGBP(b.carer_net_amount)}
                      </span>
                    </td>
                    <td className={td}>
                      <span className={statusPillClass(b.status)}>{humanise(b.status)}</span>
                      {b.status === "cancelled" && b.cancelled_reason && (
                        <span
                          className="block text-[12.5px] text-faint max-w-40 truncate"
                          title={b.cancelled_reason}
                        >
                          {b.cancelled_reason}
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <span className={statusPillClass(b.payments?.status ?? "unpaid")}>
                        {humanise(b.payments?.status ?? "unpaid")}
                      </span>
                    </td>
                    <td className={td}>
                      {payout ? (
                        <>
                          <span className={statusPillClass(payout.status)}>
                            {humanise(payout.status)}
                          </span>
                          {payout.paid_at && (
                            <span className="block text-[12.5px] text-faint whitespace-nowrap">
                              {formatDate(payout.paid_at)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-faint text-[13px]">–</span>
                      )}
                    </td>
                    <td className={td}>
                      {!cancellable && !(b.status === "confirmed" && paid) && (
                        <span className="text-faint text-[13px]">–</span>
                      )}
                      <div className="space-y-2">
                        {b.status === "confirmed" && paid && (
                          <form action={markBookingComplete}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button
                              type="submit"
                              className="px-3.5 py-1 rounded-full text-[13px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors whitespace-nowrap"
                            >
                              Mark complete
                            </button>
                          </form>
                        )}
                        {cancellable && (
                          <form
                            action={adminCancelBooking.bind(null, b.id)}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              name="reason"
                              placeholder="Reason"
                              className="border border-hairline-strong rounded-full px-3 py-1 text-[13px] bg-card text-ink w-36"
                            />
                            <button
                              type="submit"
                              className="px-3.5 py-1 rounded-full text-[13px] font-semibold border border-hairline-strong text-body hover:border-red-700 hover:text-red-700 transition-colors whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-[13.5px] font-semibold capitalize border transition-colors ${
        active
          ? "bg-green text-cream border-green"
          : "bg-transparent text-body border-hairline-strong hover:border-green hover:text-green"
      }`}
    >
      {label}
    </Link>
  );
}
