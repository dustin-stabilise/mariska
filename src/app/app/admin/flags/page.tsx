import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { resolveFlag } from "@/lib/actions/admin";
import {
  formatDate,
  humanise,
  nameMap,
  statusPillClass,
} from "@/lib/admin/helpers";

export default async function AdminFlagsPage() {
  const { supabase } = await requireRole("admin");

  const { data } = await supabase
    .from("safeguarding_flags")
    .select("id, professional_id, raised_by, reason, details, status, created_at, resolved_at")
    .order("created_at", { ascending: false });
  const flags = data ?? [];

  const openFlags = flags.filter((f) => f.status === "open" || f.status === "in_review");
  const closedFlags = flags.filter((f) => f.status === "resolved" || f.status === "dismissed");

  const personIds = [
    ...new Set(flags.flatMap((f) => [f.professional_id, f.raised_by].filter(Boolean))),
  ] as string[];
  const { data: nameRows } = personIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", personIds)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Safeguarding"
        intro="Open concerns first. Resolve or dismiss each one, with the full history kept below."
      />

      <h2 className="font-serif text-2xl text-ink mb-4">
        Open queue{" "}
        <span className="text-muted text-lg">({openFlags.length})</span>
      </h2>
      {openFlags.length === 0 ? (
        <EmptyState
          title="No open flags"
          body="There are no active safeguarding concerns right now."
        />
      ) : (
        <div className="space-y-4">
          {openFlags.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/app/admin/professionals/${f.professional_id}`}
                      className="font-medium text-ink text-[15.5px] hover:text-green"
                    >
                      {names.get(f.professional_id) ?? "Unknown"}
                    </Link>
                    <span className={statusPillClass(f.status)}>{humanise(f.status)}</span>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold capitalize bg-sand text-muted">
                      {humanise(f.reason)}
                    </span>
                  </div>
                  {f.details && <p className="text-[14.5px] text-body mt-2">{f.details}</p>}
                  <p className="text-[13px] text-faint mt-1.5">
                    Raised {formatDate(f.created_at)}
                    {f.raised_by && <> by {names.get(f.raised_by) ?? "Unknown"}</>}
                  </p>
                </div>
                <div className="flex gap-2 flex-none">
                  <form action={resolveFlag.bind(null, f.id, "resolved")}>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors"
                    >
                      Resolve
                    </button>
                  </form>
                  <form action={resolveFlag.bind(null, f.id, "dismissed")}>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-serif text-2xl text-ink mt-10 mb-4">
        History{" "}
        <span className="text-muted text-lg">({closedFlags.length})</span>
      </h2>
      {closedFlags.length === 0 ? (
        <p className="text-muted text-[14.5px]">No resolved or dismissed flags yet.</p>
      ) : (
        <div className="space-y-3">
          {closedFlags.map((f) => (
            <Card key={f.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/app/admin/professionals/${f.professional_id}`}
                    className="font-medium text-ink hover:text-green"
                  >
                    {names.get(f.professional_id) ?? "Unknown"}
                  </Link>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold capitalize bg-sand text-muted">
                    {humanise(f.reason)}
                  </span>
                  <span className={statusPillClass(f.status)}>{f.status}</span>
                </div>
                <span className="text-[13px] text-faint">
                  Raised {formatDate(f.created_at)} · Closed {formatDate(f.resolved_at)}
                </span>
              </div>
              {f.details && <p className="text-[14px] text-muted mt-2">{f.details}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
