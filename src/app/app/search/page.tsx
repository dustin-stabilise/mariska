import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { PageHeading, Card, TierBadge, EmptyState } from "@/components/ui";
import {
  AvailabilityPill,
  Chip,
  labelize,
} from "@/components/client/shared";
import { UnlockButton } from "@/components/client/unlock-button";

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
  const { supabase, user } = await requireRole("client");

  const kind = pick<Kind>(sp.kind, ["carer", "nurse"]);
  const category = pick<CareCategory>(sp.category, CARE_CATEGORIES);
  const availability = pick<AvailabilityStatus>(
    sp.availability,
    AVAILABILITY_STATUSES
  );
  const region = typeof sp.region === "string" ? sp.region.trim() : "";

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

  const nowIso = new Date().toISOString();
  const [{ data: pros }, { data: unlocks }] = await Promise.all([
    query,
    supabase
      .from("profile_unlocks")
      .select("professional_id")
      .eq("client_id", user.id)
      .gt("expires_at", nowIso),
  ]);
  const unlockedIds = new Set((unlocks ?? []).map((u) => u.professional_id));

  const hasFilters = Boolean(kind || category || availability || region);

  return (
    <div>
      <PageHeading
        eyebrow="Find care"
        title="Search professionals"
        intro="Every carer and nurse here has been vetted, interviewed and compliance-checked. Unlock a profile to see everything."
      />

      <Card className="mb-8">
        <form method="GET" className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              {CARE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {labelize(c)}
                </option>
              ))}
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
      </Card>

      {!pros || pros.length === 0 ? (
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
            {pros.length} professional{pros.length === 1 ? "" : "s"} found
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pros.map((p) => {
              const isUnlocked = p.id ? unlockedIds.has(p.id) : false;
              return (
                <Card key={p.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif text-xl text-ink">
                        {p.first_name}
                      </h3>
                      <p className="text-[13.5px] text-faint capitalize mt-0.5">
                        {p.kind} · {p.years_experience ?? 0} yrs experience
                      </p>
                    </div>
                    <TierBadge tier={p.tier ?? "none"} />
                  </div>

                  {p.headline && (
                    <p className="text-[15px] text-body mt-3">{p.headline}</p>
                  )}

                  <p className="text-[14px] text-muted mt-2">
                    {[p.location, p.region].filter(Boolean).join(", ")}
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
                    {isUnlocked && p.id ? (
                      <Link
                        href={`/app/professionals/${p.id}`}
                        className="block text-center px-5 py-2.5 rounded-full font-semibold text-[15px] border border-green text-green hover:bg-green hover:text-cream transition-colors"
                      >
                        View profile
                      </Link>
                    ) : p.id ? (
                      <UnlockButton professionalId={p.id} />
                    ) : null}
                    {isUnlocked && (
                      <p className="text-[12.5px] text-faint text-center mt-2">
                        Already unlocked
                      </p>
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
