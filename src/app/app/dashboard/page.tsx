import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PRICING, formatGBP } from "@/lib/pricing";
import { PageHeading, Card, Stat, EmptyState } from "@/components/ui";
import { daysUntil, formatDate, labelize } from "@/components/client/shared";

export default async function ClientDashboard() {
  const { supabase, profile } = await requireRole("client");
  const nowIso = new Date().toISOString();

  const [balanceRes, unlocksRes, interviewsRes, retainerRes] =
    await Promise.all([
      supabase.rpc("my_credit_balance"),
      supabase
        .from("profile_unlocks")
        .select("professional_id, unlocked_at, expires_at")
        .gt("expires_at", nowIso)
        .order("unlocked_at", { ascending: false }),
      supabase
        .from("interview_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["requested", "accepted", "scheduled"]),
      supabase
        .from("retainer_subscriptions")
        .select("status, current_period_end")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const balance = balanceRes.data ?? 0;
  const unlocks = unlocksRes.data ?? [];
  const openInterviews = interviewsRes.count ?? 0;
  const retainer = retainerRes.data;

  const recentUnlocks = unlocks.slice(0, 5);

  // Public card details for the recently unlocked professionals.
  const { data: cards } = recentUnlocks.length
    ? await supabase
        .from("professional_cards")
        .select("id, first_name, headline, kind")
        .in(
          "id",
          recentUnlocks.map((u) => u.professional_id)
        )
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  const retainerLabel =
    retainer && retainer.status !== "cancelled"
      ? labelize(retainer.status)
      : "None";

  return (
    <div>
      <PageHeading
        eyebrow="Client dashboard"
        title={`Welcome back${profile.first_name ? `, ${profile.first_name}` : ""}`}
        intro="Here's where your care search stands today."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat
          label="Credits"
          value={balance}
          hint={balance === 1 ? "profile unlock left" : "profile unlocks left"}
        />
        <Stat
          label="Active unlocks"
          value={unlocks.length}
          hint={`each lasts ${PRICING.unlockDurationDays} days`}
        />
        <Stat
          label="Open interviews"
          value={openInterviews}
          hint="requested or scheduled"
        />
        <Stat
          label="Retainer"
          value={retainerLabel}
          hint={
            retainer?.status === "active" && retainer.current_period_end
              ? `renews ${formatDate(retainer.current_period_end)}`
              : `${formatGBP(PRICING.retainer.amount)}/month plan`
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="font-serif text-2xl text-ink mb-4">Recent unlocks</h2>
          {recentUnlocks.length === 0 ? (
            <EmptyState
              title="No unlocked profiles yet"
              body="Search our vetted carers and nurses, then spend a credit to see a professional's full profile, rates and compliance record."
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
              {recentUnlocks.map((u) => {
                const card = cardById.get(u.professional_id);
                return (
                  <Link
                    key={u.professional_id}
                    href={`/app/professionals/${u.professional_id}`}
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
                        {card?.headline && (
                          <p className="text-[14px] text-muted mt-0.5">
                            {card.headline}
                          </p>
                        )}
                      </div>
                      <div className="text-[13px] text-faint whitespace-nowrap">
                        {daysUntil(u.expires_at)} days left
                      </div>
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/app/unlocked"
                className="inline-block text-[14.5px] font-semibold text-green hover:text-green-dark mt-1"
              >
                View all unlocked profiles →
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-serif text-xl text-ink">Find your carer</h3>
            <p className="text-muted text-[14.5px] mt-2">
              Browse vetted carers and nurses by category, region and
              availability.
            </p>
            <Link
              href="/app/search"
              className="inline-block mt-4 px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Search professionals
            </Link>
          </Card>
          <Card>
            <h3 className="font-serif text-xl text-ink">Top up credits</h3>
            <p className="text-muted text-[14.5px] mt-2">
              {PRICING.creditPack.credits} profile unlocks for{" "}
              {formatGBP(PRICING.creditPack.amount)}. See full profiles, rates
              and compliance records.
            </p>
            <Link
              href="/app/credits"
              className="inline-block mt-4 px-5 py-2.5 rounded-full font-semibold text-[15px] border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors"
            >
              Buy credits
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
