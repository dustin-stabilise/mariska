import { requireRole } from "@/lib/auth-helpers";
import { respondToInterview } from "@/lib/actions/professional";
import { PageHeading, Card, EmptyState, Button } from "@/components/ui";
import { StatusPill } from "@/components/pro/status-pill";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProInterviewsPage() {
  const { supabase, user } = await requireRole("professional");

  const { data: requests } = await supabase
    .from("interview_requests")
    .select("id, status, scheduled_at, client_notes, created_at")
    .eq("professional_id", user.id)
    .order("created_at", { ascending: false });

  const interviews = requests ?? [];
  const open = interviews.filter((r) => r.status === "requested").length;

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Interview requests"
        intro={
          open > 0
            ? `${open} request${open === 1 ? "" : "s"} waiting for your response.`
            : "Families who'd like to meet you appear here."
        }
      />

      <Card className="mb-6 bg-sage-light border-sage">
        <p className="text-[14.5px] text-body">
          To protect everyone&apos;s privacy, we don&apos;t show client names or
          contact details here — you&apos;ll see their notes about the care they
          need, and our team coordinates introductions and scheduling once you
          accept.
        </p>
      </Card>

      {interviews.length === 0 ? (
        <EmptyState
          title="No interview requests yet"
          body="Once your profile is active and compliant, families can request an interview with you. Keeping your availability confirmed helps you appear in search."
        />
      ) : (
        <div className="space-y-4 max-w-3xl">
          {interviews.map((req) => (
            <Card key={req.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg text-ink">A client</h2>
                  <p className="text-[13px] text-muted">
                    Requested {formatDate(req.created_at)}
                  </p>
                </div>
                <StatusPill status={req.status} />
              </div>

              {req.client_notes && (
                <p className="mt-3 text-[15px] text-body bg-sand/60 rounded-xl px-4 py-3">
                  &ldquo;{req.client_notes}&rdquo;
                </p>
              )}

              {req.scheduled_at && (
                <p className="mt-3 text-[14.5px] text-ink">
                  <span className="font-semibold">Scheduled:</span>{" "}
                  {formatDateTime(req.scheduled_at)}
                </p>
              )}
              {req.status === "accepted" && !req.scheduled_at && (
                <p className="mt-3 text-[13.5px] text-muted">
                  Accepted — our team will be in touch to arrange a time that
                  suits you both.
                </p>
              )}

              {req.status === "requested" && (
                <div className="mt-4 flex gap-3">
                  <form action={respondToInterview}>
                    <input type="hidden" name="id" value={req.id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <Button type="submit">Accept</Button>
                  </form>
                  <form action={respondToInterview}>
                    <input type="hidden" name="id" value={req.id} />
                    <input type="hidden" name="decision" value="declined" />
                    <Button type="submit" variant="secondary">
                      Decline
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
