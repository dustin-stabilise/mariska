import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { COMMISSION, formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Stat, EmptyState } from "@/components/ui";
import { formatDateTime, labelize } from "@/components/client/shared";

export default async function ClientDashboard() {
  const { supabase, profile } = await requireRole("client");
  const nowIso = new Date().toISOString();

  const [upcomingRes, proposedRes, interviewsRes, completedRes, recentRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gt("starts_at", nowIso),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "proposed"),
      supabase
        .from("interview_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["requested", "accepted", "scheduled"]),
      supabase
        .from("bookings")
        .select("total_amount")
        .eq("status", "completed"),
      supabase
        .from("bookings")
        .select(
          "id, professional_id, status, starts_at, ends_at, total_amount"
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const upcomingBookings = upcomingRes.count ?? 0;
  const pendingProposals = proposedRes.count ?? 0;
  const openInterviews = interviewsRes.count ?? 0;
  const totalSpent = (completedRes.data ?? []).reduce(
    (sum, b) => sum + b.total_amount,
    0
  );
  const recentBookings = recentRes.data ?? [];

  // Public card details for the professionals in recent bookings.
  const { data: cards } = recentBookings.length
    ? await supabase
        .from("professional_cards")
        .select("id, first_name, kind")
        .in("id", [...new Set(recentBookings.map((b) => b.professional_id))])
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <PageHeading
        eyebrow="Client dashboard"
        title={`Welcome back${profile.first_name ? `, ${profile.first_name}` : ""}`}
        intro="Here's where your care stands today."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          label="Upcoming visits"
          value={upcomingBookings}
          hint="confirmed and ahead"
        />
        <Stat
          label="Pending proposals"
          value={pendingProposals}
          hint="awaiting carer confirmation"
        />
        <Stat
          label="Meet & greets"
          value={openInterviews}
          hint="requested or scheduled"
        />
        <Stat
          label="Total spent"
          value={formatGBP(totalSpent)}
          hint="on completed visits"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-serif text-2xl text-ink mb-4">Recent bookings</h2>
          {recentBookings.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              body="Browse full profiles of vetted carers and nurses for free, arrange a free meet & greet, then book care hours through the platform."
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
            <div className="space-y-3">
              {recentBookings.map((b) => {
                const card = cardById.get(b.professional_id);
                return (
                  <Link
                    key={b.id}
                    href="/app/bookings"
                    className="block bg-card border border-hairline rounded-2xl px-6 py-4 hover:border-green transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-serif text-lg text-ink">
                          {card?.first_name ?? "Professional"}
                          {card?.kind && (
                            <span className="text-muted text-[14px] font-sans ml-2 capitalize">
                              {card.kind}
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] text-muted mt-0.5">
                          {formatDateTime(b.starts_at)} ·{" "}
                          {formatGBP(b.total_amount)}
                        </p>
                      </div>
                      <div className="text-[13px] text-faint whitespace-nowrap capitalize">
                        {labelize(b.status)}
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/app/bookings"
                className="inline-block text-[14.5px] font-semibold text-green hover:text-green-dark mt-1"
              >
                View all bookings →
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-serif text-xl text-ink">Find your carer</h3>
            <p className="text-muted text-[14.5px] mt-2">
              Browse full profiles of vetted carers and nurses for free, by
              category, region and availability.
            </p>
            <Link
              href="/app/search"
              className="inline-block mt-4 px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Search professionals
            </Link>
          </Card>
          <Card>
            <h3 className="font-serif text-xl text-ink">My bookings</h3>
            <p className="text-muted text-[14.5px] mt-2">
              Book hours and pay securely through the platform: your
              carer&apos;s rate plus a {COMMISSION.clientPct}% platform fee,
              nothing else.
            </p>
            <Link
              href="/app/bookings"
              className="inline-block mt-4 px-5 py-2.5 rounded-full font-semibold text-[15px] border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors"
            >
              View bookings
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
