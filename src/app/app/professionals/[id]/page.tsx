import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PRICING, formatGBP } from "@/lib/pricing";
import {
  PageHeading,
  Card,
  CompliancePill,
  TierBadge,
  EmptyState,
} from "@/components/ui";
import {
  AvailabilityPill,
  Chip,
  InterviewStatusPill,
  formatDate,
  formatDateTime,
  labelize,
} from "@/components/client/shared";
import { UnlockButton } from "@/components/client/unlock-button";
import { InterviewRequestForm } from "@/components/client/interview-form";

export default async function ProfessionalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireRole("client");

  // Full row is only readable while the client holds an active unlock.
  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!pro) {
    // Locked (or expired / unknown id): show the public card if there is one.
    const { data: card } = await supabase
      .from("professional_cards")
      .select("id, first_name, headline, kind, location, region, tier")
      .eq("id", id)
      .maybeSingle();

    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title={
            card?.first_name
              ? `${card.first_name}'s profile is locked`
              : "This profile is locked"
          }
          body={
            card
              ? `${card.headline ? `"${card.headline}". ` : ""}Unlock the full profile to see their bio, rates, compliance record and to request an interview. Unlocks last ${PRICING.unlockDurationDays} days.`
              : "We couldn't find this profile, or your unlock has expired. Unlocking spends 1 credit and lasts 30 days."
          }
          action={
            <div className="flex flex-col items-center gap-3 w-64">
              <UnlockButton professionalId={id} />
              <Link
                href="/app/search"
                className="text-[14px] font-semibold text-muted hover:text-green"
              >
                Back to search
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const [{ data: profileRow }, { data: card }, { data: unlock }, { data: interviews }] =
    await Promise.all([
      supabase.from("profiles").select("first_name").eq("id", id).maybeSingle(),
      supabase
        .from("professional_cards")
        .select("first_name")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("profile_unlocks")
        .select("expires_at")
        .eq("client_id", user.id)
        .eq("professional_id", id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("interview_requests")
        .select("id, status, scheduled_at, created_at")
        .eq("professional_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const firstName =
    profileRow?.first_name || card?.first_name || "This professional";

  // Latest interview that's still "live" - cancelled/declined ones don't
  // block a fresh request.
  const latestInterview = (interviews ?? [])[0];
  const activeInterview =
    latestInterview &&
    !["cancelled", "declined"].includes(latestInterview.status)
      ? latestInterview
      : undefined;

  const hasRates = pro.hourly_rate_min != null || pro.hourly_rate_max != null;
  const rateText = hasRates
    ? pro.hourly_rate_min != null &&
      pro.hourly_rate_max != null &&
      pro.hourly_rate_min !== pro.hourly_rate_max
      ? `${formatGBP(pro.hourly_rate_min)}–${formatGBP(pro.hourly_rate_max)}/hr`
      : `${formatGBP(pro.hourly_rate_min ?? pro.hourly_rate_max!)}/hr`
    : "Rates on discussion";

  // Static verification badges derived from overall compliance status.
  const verifications =
    pro.compliance_status === "green"
      ? [
          "DBS checked",
          "Right to work verified",
          "References checked",
          "ID verified",
          ...(pro.kind === "nurse" && pro.nmc_pin ? ["NMC registered"] : []),
          ...(pro.interview_passed_at ? ["Interviewed by our team"] : []),
        ]
      : pro.compliance_status === "amber"
        ? [
            "ID verified",
            "Vetting in progress",
            ...(pro.interview_passed_at ? ["Interviewed by our team"] : []),
          ]
        : ["Vetting in progress"];

  return (
    <div>
      <PageHeading
        eyebrow={pro.kind === "nurse" ? "Registered nurse" : "Professional carer"}
        title={firstName}
        intro={pro.headline || undefined}
        actions={<TierBadge tier={pro.tier} />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <AvailabilityPill status={pro.availability_status} />
              <CompliancePill status={pro.compliance_status} />
              <span className="text-[14px] text-muted">
                {pro.years_experience} years experience ·{" "}
                {[pro.location, pro.region].filter(Boolean).join(", ")}
              </span>
            </div>

            <h2 className="font-serif text-xl text-ink mb-2">About {firstName}</h2>
            <p className="text-[15px] text-body whitespace-pre-line">
              {pro.bio || "No bio provided yet."}
            </p>

            {pro.interests.length > 0 && (
              <>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mt-6 mb-2">
                  Interests
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {pro.interests.map((i) => (
                    <Chip key={i}>{i}</Chip>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Care offered</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
                  Care categories
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {pro.care_categories.length > 0 ? (
                    pro.care_categories.map((c) => (
                      <Chip key={c}>{labelize(c)}</Chip>
                    ))
                  ) : (
                    <span className="text-[14px] text-muted">Not specified</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
                  Availability options
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {pro.availability_options.length > 0 ? (
                    pro.availability_options.map((o) => (
                      <Chip key={o}>{labelize(o)}</Chip>
                    ))
                  ) : (
                    <span className="text-[14px] text-muted">Not specified</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
                  Languages
                </h3>
                <p className="text-[15px] text-body">
                  {pro.languages.length > 0
                    ? pro.languages.join(", ")
                    : "English"}
                </p>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
                  Hourly rate
                </h3>
                <p className="text-[15px] text-body">{rateText}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Verification</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {verifications.map((v) => (
                <li
                  key={v}
                  className="flex items-center gap-2 text-[15px] text-body"
                >
                  <span className="text-green font-bold">✓</span> {v}
                </li>
              ))}
            </ul>
            {pro.kind === "nurse" && pro.nmc_pin && (
              <p className="text-[13.5px] text-muted mt-4">
                NMC PIN: <span className="font-semibold">{pro.nmc_pin}</span>
              </p>
            )}
            {pro.interview_passed_at && (
              <p className="text-[13.5px] text-muted mt-1">
                Passed our vetting interview on{" "}
                {formatDate(pro.interview_passed_at)}.
              </p>
            )}
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-serif text-xl text-ink mb-1">
              Meet {firstName}
            </h2>
            <p className="text-[14px] text-muted mb-5">
              A paid interview request lets you talk before committing to a
              placement.
            </p>
            {activeInterview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <InterviewStatusPill status={activeInterview.status} />
                  {activeInterview.scheduled_at && (
                    <span className="text-[14px] text-body">
                      {formatDateTime(activeInterview.scheduled_at)}
                    </span>
                  )}
                </div>
                <p className="text-[13.5px] text-muted">
                  Requested {formatDate(activeInterview.created_at)}.
                </p>
                <Link
                  href="/app/interviews"
                  className="inline-block text-[14.5px] font-semibold text-green hover:text-green-dark"
                >
                  Manage interviews →
                </Link>
              </div>
            ) : (
              <InterviewRequestForm professionalId={id} firstName={firstName} />
            )}
          </Card>

          <Card>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
              Your unlock
            </h3>
            {unlock ? (
              <p className="text-[14.5px] text-body">
                Full profile access until{" "}
                <span className="font-semibold">
                  {formatDate(unlock.expires_at)}
                </span>
                .
              </p>
            ) : (
              <p className="text-[14.5px] text-muted">
                Unlock details unavailable.
              </p>
            )}
            <p className="text-[13.5px] text-muted mt-2">
              Introduction fee if you go ahead:{" "}
              {formatGBP(
                pro.kind === "nurse"
                  ? PRICING.placement.nurse.amount
                  : PRICING.placement.carer.amount
              )}{" "}
              one-off.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
