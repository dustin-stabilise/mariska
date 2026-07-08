import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { listUserEmails } from "@/lib/actions/admin";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { formatDate, fullName, td, th, trow } from "@/lib/admin/helpers";
import { CARE_NEEDS, SCHEDULE_OPTIONS, chipLabel } from "@/lib/matching";

export const metadata = { title: "Clients" };

/** Short label without the parenthetical explanations used in the forms. */
function shortLabel(list: readonly { value: string; label: string }[], value: string) {
  return chipLabel(list, value).split(" (")[0];
}

export default async function AdminClientsPage() {
  const { supabase } = await requireRole("admin");

  const [{ data: clientRows }, { data: careProfiles }, emails] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false }),
    supabase.from("care_profiles").select("client_id, care_for, care_needs, schedule"),
    listUserEmails(),
  ]);

  const careByClient = new Map((careProfiles ?? []).map((c) => [c.client_id, c]));
  const clients = clientRows ?? [];

  return (
    <div>
      <PageHeading
        eyebrow="Clients"
        title="Families looking for care"
        intro="Everyone with a client account, what they need, and when they need it. Open a client for their full care profile and staff notes."
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Client accounts appear here as families sign up."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[780px]">
            <thead className="border-b border-hairline">
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Contact</th>
                <th className={th}>Care needed</th>
                <th className={th}>When</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {clients.map((c) => {
                const care = careByClient.get(c.id);
                return (
                  <tr key={c.id} className={trow}>
                    <td className={td}>
                      <Link
                        href={`/app/admin/clients/${c.id}`}
                        className="font-semibold text-ink hover:text-green"
                      >
                        {fullName(c)}
                      </Link>
                    </td>
                    <td className={td}>
                      <div>{emails.get(c.id) ?? "–"}</div>
                      <div className="text-muted">{c.phone ?? "–"}</div>
                    </td>
                    <td className={td}>
                      {care && care.care_needs.length > 0
                        ? care.care_needs
                            .slice(0, 3)
                            .map((n) => shortLabel(CARE_NEEDS, n))
                            .join(", ") +
                          (care.care_needs.length > 3
                            ? ` +${care.care_needs.length - 3}`
                            : "")
                        : "No care profile yet"}
                    </td>
                    <td className={td}>
                      {care && care.schedule.length > 0
                        ? care.schedule
                            .map((s) => shortLabel(SCHEDULE_OPTIONS, s))
                            .join(", ")
                        : "–"}
                    </td>
                    <td className={td}>{formatDate(c.created_at)}</td>
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
