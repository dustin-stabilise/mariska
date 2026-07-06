import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { cancelInterview } from "@/lib/actions/client-interviews";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import {
  Banner,
  InterviewStatusPill,
  formatDate,
  formatDateTime,
} from "@/components/client/shared";

const BANNERS: Record<string, { tone: "success" | "warn"; text: string }> = {
  requested: {
    tone: "success",
    text: "Request sent. The team will coordinate a time that works for you both.",
  },
};

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const banner =
    typeof sp.status === "string" ? BANNERS[sp.status] : undefined;

  const { supabase } = await requireRole("client");

  const { data: interviews } = await supabase
    .from("interview_requests")
    .select(
      "id, professional_id, status, scheduled_at, client_notes, created_at, video_url, duration_minutes"
    )
    .order("created_at", { ascending: false });

  const rows = interviews ?? [];

  // Names come from the public card view; a professional who is no longer
  // searchable simply shows as locked.
  const { data: cards } = rows.length
    ? await supabase
        .from("professional_cards")
        .select("id, first_name, kind, headline")
        .in(
          "id",
          [...new Set(rows.map((r) => r.professional_id))]
        )
    : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));

  return (
    <div>
      <PageHeading
        eyebrow="Meet & greets"
        title="Your meet & greets"
        intro="Every meet & greet is free: a relaxed conversation, by video or in person, before you book any care."
      />

      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}

      {rows.length === 0 ? (
        <EmptyState
          title="No meet & greets yet"
          body="Find a profile you like, then request a free meet & greet from their profile page. We'll coordinate a time."
          action={
            <Link
              href="/app/search"
              className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Find care
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((iv) => {
            const card = cardById.get(iv.professional_id);
            return (
              <Card key={iv.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {card ? (
                        <Link
                          href={`/app/professionals/${iv.professional_id}`}
                          className="font-serif text-xl text-ink hover:text-green"
                        >
                          {card.first_name}
                        </Link>
                      ) : (
                        <span className="font-serif text-xl text-muted">
                          Profile locked
                        </span>
                      )}
                      {card?.kind && (
                        <span className="text-[13.5px] text-faint capitalize">
                          {card.kind}
                        </span>
                      )}
                      <InterviewStatusPill status={iv.status} />
                    </div>
                    <p className="text-[13.5px] text-faint mt-1.5">
                      Requested {formatDate(iv.created_at)}
                      {iv.scheduled_at &&
                        ` · Scheduled for ${formatDateTime(iv.scheduled_at)}`}
                      {iv.duration_minutes
                        ? ` · ${iv.duration_minutes} minutes`
                        : ""}
                    </p>
                    {iv.video_url && (
                      <a
                        href={iv.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[14.5px] font-semibold text-green hover:text-green-dark"
                      >
                        Join video call →
                      </a>
                    )}
                    {iv.client_notes && (
                      <p className="text-[14.5px] text-body mt-3 bg-sand/60 rounded-xl px-4 py-2.5">
                        &ldquo;{iv.client_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {iv.status === "requested" && (
                    <form action={cancelInterview}>
                      <input type="hidden" name="interviewId" value={iv.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full font-semibold text-[14px] border border-hairline-strong text-muted hover:border-red-300 hover:text-red-700 transition-colors"
                      >
                        Cancel request
                      </button>
                    </form>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
