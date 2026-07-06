import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { confirmAvailability } from "@/lib/actions/marketplace";
import { formatGBP } from "@/lib/pricing";
import {
  requiredDocsFor,
  DOC_TYPE_LABELS,
  type DocumentType,
} from "@/lib/professional-constants";
import { PageHeading, Card, Stat, CompliancePill, TierBadge, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Time-sensitive derivations, kept out of render for purity. Fresh per
 * request - the page is force-dynamic. */
function deriveTimeSensitive(
  availabilityConfirmedAt: string,
  documents: { id: string; doc_type: DocumentType; title: string; expiry_date: string | null }[]
) {
  const now = Date.now();
  const expiring = documents
    .filter(
      (d) =>
        d.expiry_date && new Date(d.expiry_date).getTime() <= now + 60 * DAY_MS
    )
    .map((d) => ({
      ...d,
      daysLeft: Math.ceil((new Date(d.expiry_date!).getTime() - now) / DAY_MS),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const availabilityStale =
    now - new Date(availabilityConfirmedAt).getTime() > 7 * DAY_MS;
  return { expiring, availabilityStale };
}

export default async function ProDashboard() {
  const { supabase, user, profile } = await requireRole("professional");

  const [{ data: pro }, { data: docs }, interviews, placements, { data: paidReferrals }] =
    await Promise.all([
      supabase
        .from("professional_profiles")
        .select("*")
        .eq("id", user.id)
        .single(),
      supabase
        .from("compliance_documents")
        .select("id, doc_type, title, status, expiry_date")
        .eq("professional_id", user.id),
      supabase
        .from("interview_requests")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("status", "requested"),
      supabase
        .from("placements")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id),
      supabase
        .from("referrals")
        .select("reward_amount")
        .eq("referrer_id", user.id)
        .eq("status", "paid"),
    ]);

  if (!pro) {
    return (
      <Card>
        <p className="text-muted">
          We couldn&apos;t find your professional profile. Please contact the team.
        </p>
      </Card>
    );
  }

  const documents = docs ?? [];
  const openInterviews = interviews.count ?? 0;
  const placementCount = placements.count ?? 0;
  const referralEarnings = (paidReferrals ?? []).reduce(
    (sum, r) => sum + (r.reward_amount ?? 0),
    0
  );

  // ----- compliance checklist -------------------------------------------
  const checklist = requiredDocsFor(pro.kind).map((req) => {
    const ofType = documents.filter((d) => d.doc_type === req.docType);
    const approved = ofType.filter((d) => d.status === "approved").length;
    const pending = ofType.filter((d) => d.status === "pending_review").length;
    const rejected = ofType.filter((d) => d.status === "rejected").length;
    const state =
      approved >= req.count
        ? "complete"
        : pending > 0
          ? "in_review"
          : rejected > 0
            ? "rejected"
            : "missing";
    return { ...req, approved, state };
  });
  const interviewDone = Boolean(pro.interview_passed_at);
  const outstanding =
    checklist.filter((c) => c.state !== "complete").length +
    (interviewDone ? 0 : 1);

  // ----- expiring documents & availability staleness ----------------------
  const { expiring, availabilityStale } = deriveTimeSensitive(
    pro.availability_confirmed_at,
    documents
  );

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title={`Hello, ${profile.first_name || "there"}`}
        intro="Your compliance, availability and requests at a glance."
        actions={
          <span className="flex items-center gap-2">
            <TierBadge tier={pro.tier} />
            <CompliancePill status={pro.compliance_status} />
          </span>
        }
      />

      {/* Application status banner */}
      {(pro.status === "applied" || pro.status === "in_review") && (
        <Card className="mb-6 bg-sage-light border-sage">
          <h2 className="font-serif text-lg text-ink">
            We&apos;re reviewing your application
          </h2>
          <p className="text-[15px] text-body mt-1">
            Upload your documents to speed things up. The sooner your checks
            are complete, the sooner your profile goes live to families.
          </p>
          <Link
            href="/app/pro/documents"
            className="inline-block mt-3 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Upload documents →
          </Link>
        </Card>
      )}
      {pro.status === "suspended" && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <h2 className="font-serif text-lg text-red-800">
            Your profile is suspended
          </h2>
          <p className="text-[15px] text-red-700/90 mt-1">
            You won&apos;t appear in search and can&apos;t receive new interview
            requests while suspended. Please contact the team to resolve this.
          </p>
        </Card>
      )}
      {pro.status === "rejected" && (
        <Card className="mb-6">
          <h2 className="font-serif text-lg text-ink">
            Your application wasn&apos;t successful
          </h2>
          <p className="text-[15px] text-muted mt-1">
            Unfortunately we couldn&apos;t take your application forward this
            time. Contact the team if you&apos;d like feedback.
          </p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Profile status"
          value={<span className="capitalize">{pro.status.replace(/_/g, " ")}</span>}
          hint={`Compliance score ${pro.compliance_score}/${pro.kind === "nurse" ? 100 : 90}`}
        />
        <Stat
          label="Interview requests"
          value={openInterviews}
          hint="Awaiting your response"
        />
        <Stat label="Placements" value={placementCount} hint="All time" />
        <Stat
          label="Referral earnings"
          value={formatGBP(referralEarnings)}
          hint="Paid out to date"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Compliance checklist */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl text-ink">Compliance checklist</h2>
            <span className="text-[13px] text-muted">
              {outstanding === 0
                ? "All complete"
                : `${outstanding} item${outstanding === 1 ? "" : "s"} outstanding`}
            </span>
          </div>
          <ul className="mt-4 divide-y divide-hairline">
            {checklist.map((item) => (
              <li key={item.docType} className="py-3 flex items-start gap-3">
                <span
                  className={`mt-1 w-2.5 h-2.5 rounded-full flex-none ${
                    item.state === "complete"
                      ? "bg-green"
                      : item.state === "in_review"
                        ? "bg-tan"
                        : "bg-red-400"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium text-ink">
                      {item.label}
                      {item.count > 1 && (
                        <span className="text-muted font-normal">
                          {" "}
                          ({item.approved} of {item.count} approved)
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] text-muted capitalize">
                      {item.state === "complete"
                        ? "Approved"
                        : item.state === "in_review"
                          ? "In review"
                          : item.state === "rejected"
                            ? "Rejected: re-upload needed"
                            : "Not uploaded"}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted mt-0.5">{item.blurb}</p>
                </div>
              </li>
            ))}
            <li className="py-3 flex items-start gap-3">
              <span
                className={`mt-1 w-2.5 h-2.5 rounded-full flex-none ${interviewDone ? "bg-green" : "bg-tan"}`}
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-medium text-ink">
                    Vetting interview
                  </span>
                  <span className="text-[13px] text-muted">
                    {interviewDone
                      ? `Passed ${formatDate(pro.interview_passed_at)}`
                      : "Arranged by our team"}
                  </span>
                </div>
                <p className="text-[13px] text-muted mt-0.5">
                  A short video call with our team. We&apos;ll be in touch to
                  schedule it once your documents are in.
                </p>
              </div>
            </li>
          </ul>
          <Link
            href="/app/pro/documents"
            className="inline-block mt-4 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Go to your documents →
          </Link>
        </Card>

        <div className="space-y-6">
          {/* Confirm availability */}
          <Card className={availabilityStale ? "border-tan" : ""}>
            <h2 className="font-serif text-xl text-ink">Availability</h2>
            <p className="text-[14px] text-muted mt-2">
              Last confirmed{" "}
              <span className="font-medium text-body">
                {formatDate(pro.availability_confirmed_at)}
              </span>
              . Confirming weekly keeps your profile in family searches.
            </p>
            {availabilityStale && (
              <p className="text-[13px] text-[#7a6a3d] bg-tan/20 rounded-lg px-3 py-2 mt-3">
                It&apos;s been more than a week. Confirm now to stay visible.
              </p>
            )}
            <form action={confirmAvailability} className="mt-4">
              <Button type="submit">Confirm availability</Button>
            </form>
            <p className="text-[13px] text-faint mt-3">
              Status:{" "}
              <span className="capitalize text-muted">
                {pro.availability_status}
              </span>. Change it on{" "}
              <Link
                href="/app/pro/profile"
                className="text-green font-medium hover:text-green-dark"
              >
                your profile
              </Link>
              .
            </p>
          </Card>

          {/* Expiring documents */}
          <Card>
            <h2 className="font-serif text-xl text-ink">Expiring soon</h2>
            {expiring.length === 0 ? (
              <p className="text-[14px] text-muted mt-2">
                Nothing expiring in the next 60 days.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {expiring.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <div>
                      <div className="text-[14.5px] font-medium text-ink">
                        {doc.title || DOC_TYPE_LABELS[doc.doc_type]}
                      </div>
                      <div className="text-[13px] text-muted">
                        {DOC_TYPE_LABELS[doc.doc_type]} · expires{" "}
                        {formatDate(doc.expiry_date)}
                      </div>
                    </div>
                    <span
                      className={`text-[13px] font-semibold whitespace-nowrap ${doc.daysLeft <= 0 ? "text-red-700" : doc.daysLeft <= 14 ? "text-[#7a6a3d]" : "text-muted"}`}
                    >
                      {doc.daysLeft <= 0
                        ? "Expired"
                        : `${doc.daysLeft} day${doc.daysLeft === 1 ? "" : "s"}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/app/pro/documents"
              className="inline-block mt-4 text-[15px] font-semibold text-green hover:text-green-dark"
            >
              Upload a renewal →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
