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
    .select("id, status, scheduled_at, video_url, duration_minutes, client_notes, created_at")
    .eq("professional_id", user.id)
    .order("created_at", { ascending: false });

  const interviews = requests ?? [];
  const open = interviews.filter((r) => r.status === "requested").length;

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Meet and greets"
        intro={
          open > 0
            ? `${open} request${open === 1 ? "" : "s"} waiting for your response.`
            : "Families who'd like a free video meet and greet appear here."
        }
      />

      <Card className="mb-6 bg-sage-light border-sage">
        <p className="text-[14.5px] text-body">
          Meet and greets are short, free video calls: there&apos;s no charge
          to you or to the family. To protect everyone&apos;s privacy we
          don&apos;t show client names or contact details here. You&apos;ll see
          their notes about the care they need, and once you accept, our team
          arranges a time and sends both of you the video call link.
        </p>
      </Card>

      {interviews.length === 0 ? (
        <EmptyState
          title="No meet and greet requests yet"
          body="Once your profile is active and compliant, families can request a free meet and greet with you. Keeping your availability confirmed helps you appear in search."
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
                <div className="mt-3">
                  <p className="text-[14.5px] text-ink">
                    <span className="font-semibold">Scheduled:</span>{" "}
                    {formatDateTime(req.scheduled_at)}
                    {req.duration_minutes ? (
                      <span className="text-muted"> ({req.duration_minutes} minutes)</span>
                    ) : null}
                  </p>
                  {req.video_url && (
                    <a
                      href={req.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-1.5 rounded-full text-[14px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors"
                    >
                      Join video call
                    </a>
                  )}
                </div>
              )}
              {req.status === "accepted" && !req.scheduled_at && (
                <p className="mt-3 text-[13.5px] text-muted">
                  Accepted. Our team will arrange a time that suits you both
                  and share the video call link here.
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
