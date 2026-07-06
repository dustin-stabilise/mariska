import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { formatGBP } from "@/lib/pricing";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { endPlacement } from "@/lib/actions/admin";
import {
  formatDate,
  nameMap,
  statusPillClass,
  td,
  th,
  trow,
} from "@/lib/admin/helpers";

export default async function AdminPlacementsPage() {
  const { supabase } = await requireRole("admin");

  const { data } = await supabase
    .from("placements")
    .select("id, client_id, professional_id, fee_amount, status, started_at, ended_at")
    .order("created_at", { ascending: false });
  const placements = data ?? [];

  const personIds = [
    ...new Set(placements.flatMap((p) => [p.client_id, p.professional_id])),
  ];
  const { data: nameRows } = personIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", personIds)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Placements"
        intro="Introductions the agency has made, with their fees and current state."
        actions={
          <Link
            href="/app/admin/placements/new"
            className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
          >
            Record placement
          </Link>
        }
      />

      {placements.length === 0 ? (
        <EmptyState
          title="No placements yet"
          body="When an interview leads to a hire, record the placement here to log the introduction fee."
          action={
            <Link
              href="/app/admin/placements/new"
              className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Record placement
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Professional</th>
                <th className={th}>Fee</th>
                <th className={th}>Status</th>
                <th className={th}>Started</th>
                <th className={th}>Ended</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => (
                <tr key={p.id} className={trow}>
                  <td className={`${td} font-medium text-ink`}>
                    {names.get(p.client_id) ?? "Unknown"}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/app/admin/professionals/${p.professional_id}`}
                      className="font-medium text-ink hover:text-green"
                    >
                      {names.get(p.professional_id) ?? "Unknown"}
                    </Link>
                  </td>
                  <td className={td}>{formatGBP(p.fee_amount)}</td>
                  <td className={td}>
                    <span className={statusPillClass(p.status)}>{p.status}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(p.started_at)}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(p.ended_at)}</td>
                  <td className={td}>
                    {["pending", "active"].includes(p.status) ? (
                      <span className="flex gap-2">
                        <form action={endPlacement.bind(null, p.id, false)}>
                          <button
                            type="submit"
                            className="px-3.5 py-1 rounded-full text-[13px] font-semibold border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors whitespace-nowrap"
                          >
                            End
                          </button>
                        </form>
                        <form action={endPlacement.bind(null, p.id, true)}>
                          <button
                            type="submit"
                            className="px-3.5 py-1 rounded-full text-[13px] font-semibold border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors whitespace-nowrap"
                          >
                            End (replaced)
                          </button>
                        </form>
                      </span>
                    ) : (
                      <span className="text-faint text-[13px]">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
