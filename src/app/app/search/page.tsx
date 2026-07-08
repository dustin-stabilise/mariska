import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { PageHeading, Card, TierBadge, EmptyState } from "@/components/ui";
import {
  AvailabilityPill,
  Chip,
  labelize,
} from "@/components/client/shared";
import {
  computeMatch,
  distanceMiles,
  DISABLED_CARE_CATEGORIES,
  type MatchResult,
} from "@/lib/matching";
import { RADIUS_MILES_OPTIONS } from "@/lib/profile-fields";

type CareCategory = Database["public"]["Enums"]["care_category"];
type AvailabilityStatus = Database["public"]["Enums"]["availability_status"];
type Kind = Database["public"]["Enums"]["professional_kind"];

const CARE_CATEGORIES = Constants.public.Enums.care_category;
const AVAILABILITY_STATUSES = Constants.public.Enums.availability_status;

function pick<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireRole("client");

  const kind = pick<Kind>(sp.kind, ["carer", "nurse"]);
  const category = pick<CareCategory>(
    sp.category,
    CARE_CATEGORIES.filter((c) => !DISABLED_CARE_CATEGORIES.includes(c))
  );
  const availability = pick<AvailabilityStatus>(
    sp.availability,
    AVAILABILITY_STATUSES
  );
  const region = typeof sp.region === "string" ? sp.region.trim() : "";
  const radiusParam = pick(
    sp.radius,
    RADIUS_MILES_OPTIONS.map(String)
  );

  let query = supabase
    .from("professional_cards")
    .select("*")
    .order("tier", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  if (category) query = query.contains("care_categories", [category]);
  if (availability) query = query.eq("availability_status", availability);
  if (region) {
    const safe = region.replace(/[%,()]/g, "");
    query = query.or(`region.ilike.%${safe}%,location.ilike.%${safe}%`);
  }

  const [{ data: pros }, { data: careProfile }] = await Promise.all([
    query,
    supabase.from("care_profiles").select("*").maybeSingle(),
  ]);

  // The radius select overrides the profile's saved radius for this search only.
  const profileRadius = careProfile?.radius_miles ?? 15;
  const searchRadius = radiusParam ? Number(radiusParam) : profileRadius;
  const hasClientCoords =
    careProfile?.latitude != null && careProfile?.longitude != null;

  // Personalise: score every card against the care profile, drop explicit
  // gender-preference mismatches and carers beyond the search radius, best
  // matches first (stable sort keeps the existing tier order as the tiebreak).
  const matchById = new Map<string, MatchResult>();
  let cards = pros ?? [];
  if (careProfile) {
    cards = cards.filter((p) => {
      const match = computeMatch(
        { ...careProfile, radius_miles: searchRadius },
        {
          latitude: p.latitude,
          longitude: p.longitude,
          can_drive: p.can_drive,
          cooking_skill: p.cooking_skill,
          care_categories: p.care_categories ?? [],
          availability_options: p.availability_options ?? [],
          languages: p.languages,
          interests: p.interests,
          gender: p.gender,
          personality_style: p.personality_style,
          comfortable_with: p.comfortable_with,
        }
      );
      if (match.score === null) return false;
      if (p.id) matchById.set(p.id, match);
      return true;
    });
    cards = [...cards].sort(
      (a, b) =>
        (matchById.get(b.id ?? "")?.score ?? 0) -
        (matchById.get(a.id ?? "")?.score ?? 0)
    );
  }

  const hasFilters = Boolean(
    kind ||
      category ||
      availability ||
      region ||
      (radiusParam && Number(radiusParam) !== profileRadius)
  );

  return (
    <div>
      <PageHeading
        eyebrow="Find care"
        title="Search professionals"
        intro="Every carer and nurse here has been vetted, interviewed and compliance-checked. Full profiles are free to view."
      />

      <Card className="mb-8">
        <form
          method="GET"
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
>
          <div>
            <label
              htmlFor="kind"
              className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
            >
              Type
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue={kind ?? ""}
              className="w-full rounded-xl border border-hairline-strong bg-cream px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
            >
              <option value="">Any</option>
              <option value="carer">Carer</option>
              <option value="nurse">Nurse</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="category"
              className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
            >
              Care category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={category ?? ""}
              className="w-full rounded-xl border border-hairline-strong bg-cream px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
            >
              <option value="">Any</option>
              {CARE_CATEGORIES.map((c) =>
                DISABLED_CARE_CATEGORIES.includes(c) ? (
                  <option key={c} value={c} disabled>
                    {labelize(c)} (not offered yet)
                  </option>
                ) : (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="region"
              className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
            >
              Region or town
            </label>
            <input
              id="region"
              name="region"
              type="text"
              defaultValue={region}
              placeholder="e.g. Surrey"
              className="w-full rounded-xl border border-hairline-strong bg-cream px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green"
            />
          </div>
          <div>
            <label
              htmlFor="availability"
              className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
            >
              Availability
            </label>
            <select
              id="availability"
              name="availability"
              defaultValue={availability ?? ""}
              className="w-full rounded-xl border border-hairline-strong bg-cream px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
            >
              <option value="">Any</option>
              {AVAILABILITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </select>
          </div>
          {hasClientCoords && (
            <div>
              <label
                htmlFor="radius"
                className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
              >
                Distance
              </label>
              <select
                id="radius"
                name="radius"
                defaultValue={String(searchRadius)}
                className="w-full rounded-xl border border-hairline-strong bg-cream px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
              >
                {RADIUS_MILES_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    Within {r} miles
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Search
            </button>
            {hasFilters && (
              <Link
                href="/app/search"
                className="text-[14px] font-semibold text-muted hover:text-green py-2.5"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
        {careProfile && !careProfile.postcode && (
          <p className="mt-3 text-[13px] text-muted">
            <Link
              href="/app/care-profile"
              className="font-semibold text-green hover:text-green-dark"
            >
              Add your postcode
            </Link>{" "}
            for distance-sorted matches.
          </p>
        )}
      </Card>

      {sp.matched === "1" && careProfile && (
        <div className="mb-6 rounded-2xl border border-green/30 bg-green/5 px-5 py-3.5 text-[14.5px] text-body">
          Thanks, your matches are now personalised. The best fits for{" "}
          {careProfile.recipient_first_name || "your loved one"} appear first.
        </div>
      )}
      {!careProfile && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand px-5 py-3.5">
          <span className="text-[14.5px] text-body">
            Tell us about the person who needs care and we&rsquo;ll highlight
            the carers who genuinely fit.
          </span>
          <Link
            href="/app/care-profile"
            className="text-[14px] font-semibold text-green hover:text-green-dark whitespace-nowrap"
          >
            Get matched →
          </Link>
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyState
          title="No professionals match"
          body={
            hasFilters
              ? "Try widening your filters, or clear them to browse everyone currently searchable."
              : "There are no searchable professionals right now. Please check back soon."
          }
          action={
            hasFilters ? (
              <Link
                href="/app/search"
                className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-[14px] text-muted mb-4">
            {cards.length} professional{cards.length === 1 ? "" : "s"} found
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {cards.map((p) => {
              const match = p.id ? matchById.get(p.id) : undefined;
              const miles =
                careProfile?.latitude != null &&
                careProfile?.longitude != null &&
                p.latitude != null &&
                p.longitude != null
                  ? Math.max(
                      1,
                      Math.round(
                        distanceMiles(
                          careProfile.latitude,
                          careProfile.longitude,
                          p.latitude,
                          p.longitude
                        )
                      )
                    )
                  : null;
              return (
                <Card key={p.id} className="flex flex-col">
                  {match?.badge && (
                    <span
                      className={`self-start mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold ${
                        match.badge === "great"
                          ? "bg-green text-cream"
                          : "bg-sand text-[#5C5232]"
                      }`}
                    >
                      {match.badge === "great" ? "Great match" : "Good match"}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {p.photo_path && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            supabase.storage
                              .from("profile-photos")
                              .getPublicUrl(p.photo_path).data.publicUrl
                          }
                          alt={`Photo of ${p.first_name ?? "this professional"}`}
                          className="w-14 h-14 flex-none rounded-full object-cover border border-hairline"
                        />
                      )}
                      <div>
                        <h3 className="font-serif text-xl text-ink">
                          {p.first_name}
                        </h3>
                        <p className="text-[13.5px] text-faint capitalize mt-0.5">
                          {p.kind} · {p.years_experience ?? 0} yrs experience
                        </p>
                      </div>
                    </div>
                    <TierBadge tier={p.tier ?? "none"} />
                  </div>

                  {match && match.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {match.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-2 text-[13.5px] text-body"
                        >
                          <span className="text-green font-bold">✓</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}

                  {p.headline && (
                    <p className="text-[15px] text-body mt-3">{p.headline}</p>
                  )}

                  <p className="text-[14px] text-muted mt-2">
                    {[p.location, p.region].filter(Boolean).join(", ")}
                    {miles !== null && (
                      <span className="text-[13px] text-faint">
                        {" "}
                        · ~{miles} mile{miles === 1 ? "" : "s"} away
                      </span>
                    )}
                  </p>

                  {(p.care_categories?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.care_categories!.slice(0, 4).map((c) => (
                        <Chip key={c}>{labelize(c)}</Chip>
                      ))}
                      {p.care_categories!.length > 4 && (
                        <Chip>+{p.care_categories!.length - 4} more</Chip>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3 mb-5">
                    <AvailabilityPill
                      status={p.availability_status ?? "unavailable"}
                    />
                    {(p.languages?.length ?? 0) > 0 && (
                      <span className="text-[13px] text-muted">
                        Speaks {p.languages!.join(", ")}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-hairline">
                    {p.id && (
                      <Link
                        href={`/app/professionals/${p.id}`}
                        className="block text-center px-5 py-2.5 rounded-full font-semibold text-[15px] border border-green text-green hover:bg-green hover:text-cream transition-colors"
                      >
                        View profile
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
