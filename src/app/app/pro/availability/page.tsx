import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { deleteTimeOff } from "@/lib/actions/professional";
import { PageHeading, Card } from "@/components/ui";
import { ConfirmAvailability } from "@/components/pro/confirm-availability";
import { AvailabilityForm } from "./availability-form";
import { TimeOffForm } from "./time-off-form";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "21 Jul – 28 Jul 2026", or just the one date for a single day. */
function formatRange(startsOn: string, endsOn: string): string {
  if (startsOn === endsOn) return formatDate(startsOn);
  const start = new Date(startsOn).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(startsOn.slice(0, 4) !== endsOn.slice(0, 4) ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
  return `${start} – ${formatDate(endsOn)}`;
}

export default async function AvailabilityPage() {
  const { supabase, user } = await requireRole("professional");
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: pro }, { data: timeOffRows }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select(
        "availability_status, limited_days, limited_note, availability_confirmed_at"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("unavailable_dates")
      .select("id, starts_on, ends_on, note")
      .eq("professional_id", user.id)
      .gte("ends_on", today)
      .order("starts_on", { ascending: true }),
  ]);

  if (!pro) {
    return (
      <Card>
        <p className="text-muted">
          We couldn&apos;t find your professional profile. Please contact the team.
        </p>
      </Card>
    );
  }

  const timeOff = timeOffRows ?? [];

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Availability & time off"
        intro="Keep this up to date so families only propose times that work for you."
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <Card>
            <h2 className="font-serif text-xl text-ink">Your availability</h2>
            <p className="text-[14px] text-muted mt-1">
              Families see this on your profile and in search.
            </p>
            <div className="mt-5">
              <AvailabilityForm
                status={pro.availability_status}
                limitedDays={pro.limited_days}
                limitedNote={pro.limited_note}
              />
            </div>
            <p className="text-[13px] text-faint mt-5">
              Working patterns (live-in, nights, weekends and so on) live on{" "}
              <Link
                href="/app/pro/profile"
                className="text-green font-medium hover:text-green-dark"
              >
                your profile
              </Link>
              .
            </p>
          </Card>

          {/* Time off */}
          <Card>
            <h2 className="font-serif text-xl text-ink">Time off</h2>
            <p className="text-[14px] text-muted mt-1">
              Time off blocks new bookings for those dates and shows as busy to
              families.
            </p>

            {timeOff.length === 0 ? (
              <p className="text-[14.5px] text-muted mt-4">
                No time off booked. Add a date range below and we&apos;ll keep
                those days free.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-hairline">
                {timeOff.map((row) => (
                  <li
                    key={row.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-[14.5px] font-medium text-ink">
                        {formatRange(row.starts_on, row.ends_on)}
                      </div>
                      {row.note && (
                        <div className="text-[13px] text-muted">{row.note}</div>
                      )}
                    </div>
                    <form action={deleteTimeOff}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="text-[13.5px] font-semibold text-red-700 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 pt-5 border-t border-hairline">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-3">
                Add time off
              </h3>
              <TimeOffForm />
            </div>
          </Card>
        </div>

        {/* Confirm */}
        <Card>
          <h2 className="font-serif text-xl text-ink">Confirm availability</h2>
          <p className="text-[14px] text-muted mt-2 mb-4">
            A quick confirmation tells families your availability is current.
          </p>
          <ConfirmAvailability
            lastConfirmedLabel={formatDate(pro.availability_confirmed_at)}
          />
          <p className="text-[13px] text-[#7a6a3d] bg-tan/20 rounded-lg px-3 py-2 mt-4">
            If you don&apos;t confirm for 30 days, your profile is hidden from
            family searches until you do.
          </p>
        </Card>
      </div>
    </div>
  );
}
