import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { connectPayouts } from "@/lib/actions/bookings";
import { COMMISSION, formatGBP } from "@/lib/pricing";
import {
  DOC_TYPE_LABELS,
  type DocumentType,
} from "@/lib/professional-constants";
import { CLINICAL_SKILLS } from "@/lib/compliance-requirements";
import {
  buildVettingChecklist,
  summariseTraining,
  ratedSkillCount,
  MIN_RATED_SKILLS,
} from "@/lib/vetting-checklist";
import { ChecklistRow } from "@/components/pro/checklist";
import { ConfirmAvailability } from "@/components/pro/confirm-availability";
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

/** Mask a Stripe account id for display: keep the prefix and last four. */
function maskAccountId(accountId: string): string {
  if (accountId.length <= 10) return accountId;
  return `${accountId.slice(0, 5)}…${accountId.slice(-4)}`;
}

export default async function ProDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, user, profile } = await requireRole("professional");
  const { status: statusParam } = await searchParams;

  const [
    { data: pro },
    { data: docs },
    interviews,
    placements,
    { data: paidReferrals },
    { data: payoutRows },
  ] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("*")
        .eq("id", user.id)
        .single(),
      supabase
        .from("compliance_documents")
        .select("id, doc_type, certificate_type, title, status, expiry_date, review_notes")
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
      supabase
        .from("payouts")
        .select("amount, status")
        .eq("professional_id", user.id),
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
  const payouts = payoutRows ?? [];
  const bookingEarnings = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  // ----- compliance checklist (v2, mirrors the SQL engine) ----------------
  const checklistGroups = buildVettingChecklist(pro, documents);
  // Compact dashboard view: the per-certificate items collapse to one line.
  const checklistItems = checklistGroups.flatMap((group) =>
    group.key === "training" ? [summariseTraining(group)] : group.items
  );
  const outstanding = checklistGroups
    .flatMap((group) => group.items)
    .filter((item) => item.state !== "approved" && item.state !== "expiring")
    .length;
  const ratedSkills = ratedSkillCount(pro.clinical_skills);

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

      {/* Payout onboarding banners */}
      {statusParam === "test-payouts-enabled" && (
        <Card className="mb-6 bg-sage-light border-sage">
          <p className="text-[15px] text-body">
            <span className="font-semibold text-ink">Payouts enabled.</span>{" "}
            Test mode is on, so your payout account was set up instantly. You
            can now be booked and paid through the platform.
          </p>
        </Card>
      )}
      {statusParam === "connect-return" && (
        <Card className="mb-6 bg-sage-light border-sage">
          <p className="text-[15px] text-body">
            <span className="font-semibold text-ink">
              Thanks, you&apos;re back from Stripe.
            </span>{" "}
            We&apos;re confirming your payout account now. This usually takes a
            moment; check back shortly if it doesn&apos;t show as enabled yet.
          </p>
        </Card>
      )}
      {statusParam === "connect-retry" && (
        <Card className="mb-6 border-tan bg-tan/10">
          <p className="text-[15px] text-body">
            <span className="font-semibold text-ink">
              Payout setup wasn&apos;t finished.
            </span>{" "}
            Stripe needs a few more details before we can pay you. Pick up
            where you left off from the &ldquo;Getting paid&rdquo; card below.
          </p>
        </Card>
      )}

      {/* Working agreement awaiting acceptance */}
      {pro.contract_version && !pro.contract_accepted_at && (
        <Card className="mb-6 border-green bg-green/5">
          <h2 className="font-serif text-lg text-ink">
            Your working agreement is ready
          </h2>
          <p className="text-[15px] text-body mt-1">
            Our team has issued version {pro.contract_version} of your working
            agreement. Please read and accept it to complete your onboarding.
          </p>
          <Link
            href="/app/pro/contract"
            className="inline-block mt-3 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Review and accept →
          </Link>
        </Card>
      )}

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat
          label="Profile status"
          value={<span className="capitalize">{pro.status.replace(/_/g, " ")}</span>}
          hint={`Compliance score ${pro.compliance_score}/${pro.kind === "nurse" ? 110 : 100}`}
        />
        <Stat
          label="Interview requests"
          value={openInterviews}
          hint="Awaiting your response"
        />
        <Stat label="Placements" value={placementCount} hint="All time" />
        <Stat
          label="Booking earnings"
          value={formatGBP(bookingEarnings)}
          hint={
            pendingPayouts > 0
              ? `${formatGBP(pendingPayouts)} pending payout`
              : "Paid out to date"
          }
        />
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
            {checklistItems.map((item) => (
              <ChecklistRow key={item.key} item={item} />
            ))}
          </ul>
          <Link
            href="/app/pro/documents"
            className="inline-block mt-4 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Go to your documents →
          </Link>
        </Card>

        <div className="space-y-6">
          {/* Getting paid (Stripe Connect payouts) */}
          <Card className={pro.payouts_enabled ? "" : "border-tan"}>
            <h2 className="font-serif text-xl text-ink">Getting paid</h2>
            {pro.payouts_enabled ? (
              <>
                <p className="mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold bg-green/10 text-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Payouts enabled
                  </span>
                </p>
                <p className="text-[14px] text-muted mt-3">
                  You&apos;re set up to be paid through the platform. After each
                  completed booking we transfer {100 - COMMISSION.carerPct}% of
                  your rate to your account.
                </p>
                {pro.stripe_account_id && (
                  <p className="text-[13px] text-faint mt-2">
                    Payout account:{" "}
                    <span className="font-mono text-muted">
                      {maskAccountId(pro.stripe_account_id)}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[14px] text-muted mt-2">
                  Clients book and pay through the platform. You keep{" "}
                  {100 - COMMISSION.carerPct}% of your rate, and we pay it into
                  your bank account via Stripe after each completed booking.
                  Set up your payout account to start taking bookings.
                </p>
                <form action={connectPayouts} className="mt-4">
                  <Button type="submit">Set up payouts</Button>
                </form>
                <p className="text-[13px] text-faint mt-3">
                  Takes a few minutes with Stripe. In test mode it&apos;s
                  enabled instantly.
                </p>
              </>
            )}
          </Card>

          {/* Confirm availability */}
          <Card className={availabilityStale ? "border-tan" : ""}>
            <h2 className="font-serif text-xl text-ink">Availability</h2>
            <div className="mt-2">
              <ConfirmAvailability
                lastConfirmedLabel={formatDate(pro.availability_confirmed_at)}
              />
            </div>
            {availabilityStale && (
              <p className="text-[13px] text-[#7a6a3d] bg-tan/20 rounded-lg px-3 py-2 mt-3">
                It&apos;s been more than a week. Confirm now to stay visible.
              </p>
            )}
            <Link
              href="/app/pro/availability"
              className="inline-block mt-4 text-[15px] font-semibold text-green hover:text-green-dark"
            >
              Manage availability &amp; time off →
            </Link>
          </Card>

          {/* Clinical skills (nurses) */}
          {pro.kind === "nurse" && (
            <Card className={ratedSkills >= MIN_RATED_SKILLS ? "" : "border-tan"}>
              <h2 className="font-serif text-xl text-ink">Clinical skills</h2>
              <p className="text-[14px] text-muted mt-2">
                You&apos;ve rated{" "}
                <span className="font-medium text-body">
                  {ratedSkills} of {CLINICAL_SKILLS.length}
                </span>{" "}
                skills. At least {MIN_RATED_SKILLS} are needed for a compliant
                profile.
              </p>
              <Link
                href="/app/pro/skills"
                className="inline-block mt-4 text-[15px] font-semibold text-green hover:text-green-dark"
              >
                Update your skills →
              </Link>
            </Card>
          )}

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
