import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { completeInterview, scheduleInterview } from "@/lib/actions/admin";
import { Constants } from "@/lib/supabase/database.types";
import {
  formatDate,
  formatDateTime,
  humanise,
  nameMap,
  statusPillClass,
  td,
  th,
  trow,
} from "@/lib/admin/helpers";

const STATUSES = Constants.public.Enums.interview_status;

export default async function AdminInterviewsPage({
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
    .from("interview_requests")
    .select(
      "id, client_id, professional_id, status, scheduled_at, video_url, created_at, client_notes"
    )
    .order("created_at", { ascending: false });
  if (activeFilter) query = query.eq("status", activeFilter);
  const { data } = await query;
  const interviews = data ?? [];

  const personIds = [
    ...new Set(interviews.flatMap((i) => [i.client_id, i.professional_id])),
  ];
  const { data: nameRows } = personIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", personIds)
    : { data: [] };
  const names = nameMap(nameRows);

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Interviews"
        intro="Every client interview request. Schedule accepted ones, mark scheduled ones complete, then record the placement."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <FilterPill href="/app/admin/interviews" label="All" active={!activeFilter} />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={`/app/admin/interviews?status=${s}`}
            label={s}
            active={activeFilter === s}
          />
        ))}
      </div>

      {interviews.length === 0 ? (
        <EmptyState
          title="No interview requests"
          body={
            activeFilter
              ? `No interview requests with status “${activeFilter}”.`
              : "No interview requests have been made yet."
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Professional</th>
                <th className={th}>Status</th>
                <th className={th}>Requested</th>
                <th className={th}>Scheduled for</th>
                <th className={th}>Next step</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((i) => (
                <tr key={i.id} className={trow}>
                  <td className={td}>
                    <span className="font-medium text-ink">
                      {names.get(i.client_id) ?? "Unknown"}
                    </span>
                    {i.client_notes && (
                      <span
                        className="block text-[13px] text-faint max-w-56 truncate"
                        title={i.client_notes}
                      >
                        “{i.client_notes}”
                      </span>
                    )}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/app/admin/professionals/${i.professional_id}`}
                      className="font-medium text-ink hover:text-green"
                    >
                      {names.get(i.professional_id) ?? "Unknown"}
                    </Link>
                  </td>
                  <td className={td}>
                    <span className={statusPillClass(i.status)}>{humanise(i.status)}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(i.created_at)}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatDateTime(i.scheduled_at)}
                    {i.video_url && (
                      <a
                        href={i.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[13px] font-semibold text-green hover:text-green-dark"
                      >
                        Video call link
                      </a>
                    )}
                  </td>
                  <td className={td}>
                    {i.status === "accepted" && (
                      <form
                        action={scheduleInterview.bind(null, i.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="datetime-local"
                          name="scheduledAt"
                          required
                          className="border border-hairline-strong rounded-full px-3 py-1 text-[13px] bg-card text-ink"
                        />
                        <input
                          type="url"
                          name="videoUrl"
                          placeholder="Video call link (optional)"
                          className="border border-hairline-strong rounded-full px-3 py-1 text-[13px] bg-card text-ink w-52"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1 rounded-full text-[13px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors whitespace-nowrap"
                        >
                          Schedule
                        </button>
                      </form>
                    )}
                    {i.status === "scheduled" && (
                      <form action={completeInterview.bind(null, i.id)}>
                        <button
                          type="submit"
                          className="px-3.5 py-1 rounded-full text-[13px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors whitespace-nowrap"
                        >
                          Mark completed
                        </button>
                      </form>
                    )}
                    {i.status === "completed" && (
                      <Link
                        href={`/app/admin/placements/new?client=${i.client_id}&pro=${i.professional_id}&interview=${i.id}`}
                        className="text-[13.5px] font-semibold text-green hover:text-green-dark whitespace-nowrap"
                      >
                        Record placement &rarr;
                      </Link>
                    )}
                    {["requested", "declined", "cancelled"].includes(i.status) && (
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
