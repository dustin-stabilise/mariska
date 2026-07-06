import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PRICING } from "@/lib/pricing";
import { PageHeading, Card, TierBadge, EmptyState } from "@/components/ui";
import {
  AvailabilityPill,
  Chip,
  daysUntil,
  formatDate,
  labelize,
} from "@/components/client/shared";

export default async function UnlockedPage() {
  const { supabase, user } = await requireRole("client");

  const { data: unlocks } = await supabase
    .from("profile_unlocks")
    .select("professional_id, unlocked_at, expires_at")
    .eq("client_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true });

  const active = unlocks ?? [];

  const { data: cards } = active.length
    ? await supabase
        .from("professional_cards")
        .select(
          "id, first_name, headline, kind, location, region, tier, availability_status, care_categories"
        )
        .in(
          "id",
          active.map((u) => u.professional_id)
        )
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <PageHeading
        eyebrow="Your shortlist"
        title="Unlocked profiles"
        intro={`Profiles stay unlocked for ${PRICING.unlockDurationDays} days from the moment you spend a credit.`}
      />

      {active.length === 0 ? (
        <EmptyState
          title="Nothing unlocked yet"
          body="When you unlock a professional's full profile it appears here for 30 days, so you can compare your shortlist side by side."
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
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {active.map((u) => {
            const card = cardById.get(u.professional_id);
            const days = daysUntil(u.expires_at);
            return (
              <Card key={u.professional_id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-ink">
                      {card?.first_name ?? "Professional"}
                    </h3>
                    {card?.kind && (
                      <p className="text-[13.5px] text-faint capitalize mt-0.5">
                        {card.kind}
                        {card.location || card.region
                          ? ` · ${[card.location, card.region].filter(Boolean).join(", ")}`
                          : ""}
                      </p>
                    )}
                  </div>
                  {card?.tier && <TierBadge tier={card.tier} />}
                </div>

                {card?.headline && (
                  <p className="text-[15px] text-body mt-3">{card.headline}</p>
                )}

                {(card?.care_categories?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {card!.care_categories!.slice(0, 3).map((c) => (
                      <Chip key={c}>{labelize(c)}</Chip>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 mb-5">
                  {card?.availability_status && (
                    <AvailabilityPill status={card.availability_status} />
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-hairline">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13.5px]">
                      <span
                        className={`font-semibold ${days <= 5 ? "text-red-700" : "text-green"}`}
                      >
                        {days} day{days === 1 ? "" : "s"} left
                      </span>
                      <span className="text-faint">
                        {" "}
                        · until {formatDate(u.expires_at)}
                      </span>
                    </div>
                    <Link
                      href={`/app/professionals/${u.professional_id}`}
                      className="px-4 py-2 rounded-full font-semibold text-[14px] border border-green text-green hover:bg-green hover:text-cream transition-colors whitespace-nowrap"
                    >
                      View profile
                    </Link>
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
