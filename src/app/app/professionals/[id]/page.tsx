import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { COMMISSION, bookingAmounts, formatGBP } from "@/lib/pricing";
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
import { BookingForm } from "@/components/client/booking-form";
import { InterviewRequestForm } from "@/components/client/interview-form";
import { INTEREST_CHIPS, chipLabel, computeMatch } from "@/lib/matching";

export default async function ProfessionalProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("client");

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="Profile not found"
          body="We couldn't find this profile. The professional may no longer be available on the platform."
          action={
            <Link
              href="/app/search"
              className="px-5 py-2.5 rounded-full font-semibold text-[15px] bg-green text-cream hover:bg-green-dark transition-colors"
            >
              Back to search
            </Link>
          }
        />
      </div>
    );
  }

  const [
    { data: profileRow },
    { data: card },
    { data: interviews },
    { data: careProfile },
    { data: photoRows },
  ] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", id).maybeSingle(),
    supabase
      .from("professional_cards")
      .select("first_name")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("interview_requests")
      .select("id, status, scheduled_at, created_at")
      .eq("professional_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("care_profiles").select("*").maybeSingle(),
    // RLS only exposes approved photos to clients; the explicit filter keeps
    // the UI consistent with that rule.
    supabase
      .from("profile_photos")
      .select("id, storage_path, position")
      .eq("professional_id", id)
      .eq("status", "approved")
      .order("position", { ascending: true })
      .limit(3),
  ]);
  const photos = photoRows ?? [];

  const match = careProfile
    ? computeMatch(careProfile, {
        care_categories: pro.care_categories,
        availability_options: pro.availability_options,
        languages: pro.languages,
        interests: pro.interests,
        gender: pro.gender,
        personality_style: pro.personality_style,
        comfortable_with: pro.comfortable_with,
      })
    : null;

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
    : "Rate on request";

  // Worked example for the fee explainer: a 3-hour visit at their rate.
  const bookingRate = pro.hourly_rate_min;
  const example = bookingRate != null ? bookingAmounts(3, bookingRate) : null;

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
            {photos.length > 0 && (
              <div className="flex gap-3 mb-5">
                {photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={
                      supabase.storage
                        .from("profile-photos")
                        .getPublicUrl(photo.storage_path).data.publicUrl
                    }
                    alt={`Photo of ${firstName}`}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border border-hairline"
                  />
                ))}
              </div>
            )}
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
                    <Chip key={i}>{chipLabel(INTEREST_CHIPS, i)}</Chip>
                  ))}
                </div>
              </>
            )}
          </Card>

          {match && match.reasons.length > 0 && (
            <Card className="border-green/30 bg-green/5">
              <h2 className="font-serif text-xl text-ink mb-3">
                What you share
              </h2>
              <ul className="space-y-2">
                {match.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-2.5 text-[15px] text-body"
                  >
                    <span className="text-green font-bold leading-[1.5]">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-muted mt-4">
                Based on the care profile you told us about. It's never shown
                to anyone else.
              </p>
            </Card>
          )}

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
              Book care hours
            </h2>
            {bookingRate != null && example ? (
              <>
                <p className="text-[14px] text-muted mb-4">
                  {firstName}&apos;s rate is{" "}
                  <span className="font-semibold text-ink">
                    {formatGBP(bookingRate)}/hr
                  </span>
                  . You pay the rate plus a {COMMISSION.clientPct}% platform
                  fee, and that&apos;s everything.
                </p>
                <div className="bg-sand/60 rounded-xl px-4 py-3 mb-5 text-[13.5px] text-body">
                  <p className="font-semibold text-ink mb-1">
                    Example: a 3-hour visit
                  </p>
                  <p>
                    {formatGBP(example.careAmount)} care +{" "}
                    {formatGBP(example.clientFeeAmount)} fee ={" "}
                    <span className="font-semibold text-ink">
                      {formatGBP(example.totalAmount)}
                    </span>{" "}
                    total.
                  </p>
                  <p className="mt-1 text-muted">
                    Your carer keeps 85% of their rate (
                    {formatGBP(example.carerNetAmount)} for this visit).
                  </p>
                </div>
                <BookingForm professionalId={id} />
              </>
            ) : (
              <>
                <p className="text-[14px] text-muted mb-4">
                  Rate on request: {firstName} hasn&apos;t published an hourly
                  rate yet, so arrange a free meet &amp; greet first to agree
                  one.
                </p>
                <BookingForm professionalId={id} disabled />
              </>
            )}
          </Card>

          <Card>
            <h2 className="font-serif text-xl text-ink mb-1">
              Meet {firstName}
            </h2>
            <p className="text-[14px] text-muted mb-5">
              A free meet &amp; greet, by video or in person, lets you talk
              before booking any care.
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
                  Manage meet &amp; greets →
                </Link>
              </div>
            ) : (
              <InterviewRequestForm professionalId={id} firstName={firstName} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
