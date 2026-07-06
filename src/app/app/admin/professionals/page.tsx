import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card, CompliancePill, TierBadge, EmptyState } from "@/components/ui";
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

const STATUSES = Constants.public.Enums.professional_status;

export default async function AdminProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { status } = await searchParams;
  const activeFilter = (STATUSES as readonly string[]).includes(status ?? "")
    ? (status as (typeof STATUSES)[number])
    : undefined;

  let query = supabase
    .from("professional_profiles")
    .select(
      "id, kind, location, status, compliance_status, compliance_score, tier, created_at"
    )
    .order("created_at", { ascending: false });
  if (activeFilter) query = query.eq("status", activeFilter);
  const { data: pros } = await query;

  const ids = (pros ?? []).map((p) => p.id);
  const { data: nameRows } = ids.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", ids)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Professionals"
        intro="Everyone on the register, from fresh applications to active carers and nurses."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterPill href="/app/admin/professionals" label="All" active={!activeFilter} />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={`/app/admin/professionals?status=${s}`}
            label={humanise(s)}
            active={activeFilter === s}
          />
        ))}
      </div>

      {(pros ?? []).length === 0 ? (
        <EmptyState
          title="No professionals found"
          body={
            activeFilter
              ? `Nobody currently has the status “${humanise(activeFilter)}”.`
              : "No professionals have applied yet."
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Kind</th>
                <th className={th}>Location</th>
                <th className={th}>Status</th>
                <th className={th}>Compliance</th>
                <th className={th}>Tier</th>
                <th className={th}>Applied</th>
              </tr>
            </thead>
            <tbody>
              {(pros ?? []).map((pro) => (
                <tr key={pro.id} className={trow}>
                  <td className={td}>
                    <Link
                      href={`/app/admin/professionals/${pro.id}`}
                      className="font-medium text-ink hover:text-green"
                    >
                      {names.get(pro.id) ?? "Unknown"}
                    </Link>
                  </td>
                  <td className={`${td} capitalize`}>{pro.kind}</td>
                  <td className={td}>{pro.location || "–"}</td>
                  <td className={td}>
                    <span className={statusPillClass(pro.status)}>
                      {humanise(pro.status)}
                    </span>
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <CompliancePill status={pro.compliance_status} />
                      <span className="text-[13px] text-muted">
                        {pro.compliance_score}/100
                      </span>
                    </span>
                  </td>
                  <td className={td}>
                    <TierBadge tier={pro.tier} />
                    {pro.tier === "none" && <span className="text-faint">–</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(pro.created_at)}</td>
                </tr>
              ))}
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
