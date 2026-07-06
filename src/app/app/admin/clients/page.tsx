import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { grantCredits } from "@/lib/actions/admin";
import { formatDate, fullName, td, th, trow } from "@/lib/admin/helpers";

export default async function AdminClientsPage() {
  const { supabase } = await requireRole("admin");

  const [{ data: clientRows }, { data: ledger }, { data: unlocks }, { data: retainers }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false }),
      supabase.from("credit_ledger").select("client_id, delta"),
      supabase.from("profile_unlocks").select("client_id"),
      supabase
        .from("retainer_subscriptions")
        .select("client_id, status, current_period_end")
        .eq("status", "active"),
    ]);
  const clients = clientRows ?? [];

  const balances = new Map<string, number>();
  for (const row of ledger ?? []) {
    balances.set(row.client_id, (balances.get(row.client_id) ?? 0) + row.delta);
  }
  const unlockCounts = new Map<string, number>();
  for (const row of unlocks ?? []) {
    unlockCounts.set(row.client_id, (unlockCounts.get(row.client_id) ?? 0) + 1);
  }
  const retainerByClient = new Map(
    (retainers ?? []).map((r) => [r.client_id, r] as const)
  );

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Clients"
        intro="Families looking for care: their credit balances, unlocks and retainer status."
      />

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" body="Client accounts will appear here as families sign up." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Joined</th>
                <th className={th}>Credits</th>
                <th className={th}>Unlocks</th>
                <th className={th}>Retainer</th>
                <th className={th}>Grant credits</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const retainer = retainerByClient.get(c.id);
                return (
                  <tr key={c.id} className={trow}>
                    <td className={`${td} font-medium text-ink`}>{fullName(c)}</td>
                    <td className={td}>{c.phone || "–"}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(c.created_at)}</td>
                    <td className={`${td} font-semibold text-ink`}>
                      {balances.get(c.id) ?? 0}
                    </td>
                    <td className={td}>{unlockCounts.get(c.id) ?? 0}</td>
                    <td className={td}>
                      {retainer ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold bg-green/10 text-green whitespace-nowrap">
                          Active
                          {retainer.current_period_end &&
                            ` until ${formatDate(retainer.current_period_end)}`}
                        </span>
                      ) : (
                        <span className="text-faint text-[13px]">None</span>
                      )}
                    </td>
                    <td className={td}>
                      <form
                        action={grantCredits.bind(null, c.id)}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="number"
                          name="amount"
                          required
                          step={1}
                          placeholder="Qty"
                          className="w-16 border border-hairline-strong rounded-full px-3 py-1 text-[13px] bg-card text-ink placeholder:text-faint"
                        />
                        <input
                          type="text"
                          name="note"
                          placeholder="Note (optional)"
                          className="w-36 border border-hairline-strong rounded-full px-3 py-1 text-[13px] bg-card text-ink placeholder:text-faint"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1 rounded-full text-[13px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors whitespace-nowrap"
                        >
                          Grant
                        </button>
                      </form>
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
