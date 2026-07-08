import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { addStaffNote, deleteStaffNote, listUserEmails } from "@/lib/actions/admin";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { CareSummary } from "@/components/pro/care-summary";
import { formatDate, formatDateTime, fullName, humanise, nameMap } from "@/lib/admin/helpers";

export const metadata = { title: "Client" };

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("admin");

  const { data: client } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, created_at, role")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();
  if (!client) notFound();

  const [
    { data: careProfile },
    { data: interviews },
    { data: bookings },
    { data: terms },
    { data: notes },
    { data: proNames },
    emails,
  ] = await Promise.all([
    supabase.from("care_profiles").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("interview_requests")
      .select("id, professional_id, status, scheduled_at, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, professional_id, status, starts_at, hours, total_amount")
      .eq("client_id", id)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("terms_acceptances")
      .select("document, version, accepted_at")
      .eq("user_id", id)
      .order("accepted_at", { ascending: false }),
    supabase
      .from("staff_notes")
      .select("id, note, created_at, author_id")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, first_name, last_name"),
    listUserEmails(),
  ]);

  const names = nameMap(proNames);

  return (
    <div>
      <PageHeading
        eyebrow="Client"
        title={fullName(client)}
        intro={`Joined ${formatDate(client.created_at)}`}
        actions={
          <Link
            href="/app/admin/clients"
            className="text-[14px] font-semibold text-green hover:text-green-dark"
          >
            ← All clients
          </Link>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {careProfile ? (
            <Card>
              <h3 className="font-serif text-xl text-ink mb-3">Care profile</h3>
              <CareSummary profile={careProfile} />
            </Card>
          ) : (
            <EmptyState
              title="No care profile yet"
              body="They haven't told us about the person needing care. Search results stay unpersonalised until they do."
            />
          )}

          <Card>
            <h3 className="font-serif text-xl text-ink mb-3">Meet &amp; greets</h3>
            {interviews && interviews.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {interviews.map((iv) => (
                  <li key={iv.id} className="py-2.5 flex flex-wrap justify-between gap-2 text-[14.5px]">
                    <span className="text-ink font-medium">
                      {names.get(iv.professional_id) ?? "Professional"}
                    </span>
                    <span className="text-muted">
                      {humanise(iv.status)}
                      {iv.scheduled_at ? ` · ${formatDateTime(iv.scheduled_at)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14.5px] text-muted">None yet.</p>
            )}
          </Card>

          <Card>
            <h3 className="font-serif text-xl text-ink mb-3">Recent bookings</h3>
            {bookings && bookings.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {bookings.map((b) => (
                  <li key={b.id} className="py-2.5 flex flex-wrap justify-between gap-2 text-[14.5px]">
                    <span className="text-ink font-medium">
                      {names.get(b.professional_id) ?? "Professional"} ·{" "}
                      {Number(b.hours)}h
                    </span>
                    <span className="text-muted">
                      {formatDateTime(b.starts_at)} · {humanise(b.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14.5px] text-muted">None yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-xl text-ink mb-3">Contact</h3>
            <dl className="text-[14.5px] space-y-2">
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-wide text-faint">Email</dt>
                <dd className="text-body">{emails.get(id) ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-wide text-faint">Phone</dt>
                <dd className="text-body">{client.phone ?? "Not provided"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="font-serif text-xl text-ink mb-3">Terms accepted</h3>
            {terms && terms.length > 0 ? (
              <ul className="text-[13.5px] text-body space-y-1.5">
                {terms.map((t, i) => (
                  <li key={i}>
                    {humanise(t.document)} v{t.version} ·{" "}
                    {formatDate(t.accepted_at)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-muted">
                No recorded acceptance (account predates the terms flow).
              </p>
            )}
          </Card>

          <Card>
            <h3 className="font-serif text-xl text-ink mb-3">Staff notes</h3>
            <p className="text-[13px] text-muted mb-3">
              Internal only. The client never sees these.
            </p>
            <form action={addStaffNote.bind(null, id)} className="mb-4">
              <textarea
                name="note"
                rows={3}
                required
                maxLength={2000}
                placeholder="e.g. Called 8 Jul, prefers afternoon visits"
                className="w-full rounded-xl border border-hairline-strong bg-white px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:outline-none focus:border-green"
              />
              <button
                type="submit"
                className="mt-2 rounded-full bg-green px-4 py-2 text-[13.5px] font-semibold text-cream hover:bg-green-dark"
              >
                Add note
              </button>
            </form>
            {notes && notes.length > 0 ? (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl bg-sand/60 px-3 py-2.5">
                    <p className="text-[14px] text-ink whitespace-pre-line">{n.note}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-faint">
                      <span>
                        {names.get(n.author_id) ?? "Staff"} · {formatDateTime(n.created_at)}
                      </span>
                      <form action={deleteStaffNote.bind(null, n.id)}>
                        <button type="submit" className="hover:text-red-700">
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-muted">No notes yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
