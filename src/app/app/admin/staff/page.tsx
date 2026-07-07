import { requireRole } from "@/lib/auth-helpers";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { InviteStaffForm } from "./invite-form";

export const metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  const { supabase, user } = await requireRole("admin");

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeading
        eyebrow="Team"
        title="Staff accounts"
        intro="Staff see the full agency dashboard. Accounts are created here deliberately; there is no self-serve staff sign-up."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <h3 className="font-serif text-xl text-ink mb-4">Invite a staff member</h3>
          <InviteStaffForm />
        </Card>

        <Card>
          <h3 className="font-serif text-xl text-ink mb-4">Current staff</h3>
          {staff && staff.length > 0 ? (
            <ul className="flex flex-col divide-y divide-hairline">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-ink text-[15px]">
                      {s.first_name} {s.last_name}
                      {s.id === user.id && (
                        <span className="ml-2 text-[12px] font-bold uppercase tracking-wide text-green">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-muted">
                      Staff since{" "}
                      {new Date(s.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No staff yet"
              body="Invite your first team member with the form."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
