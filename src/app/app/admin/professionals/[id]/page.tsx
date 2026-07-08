import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGBP } from "@/lib/pricing";
import { PageHeading, Card, CompliancePill, TierBadge, Button } from "@/components/ui";
import { DocReviewForm } from "@/components/admin/doc-review-form";
import {
  issueContract,
  markInterviewPassed,
  raiseFlag,
  recordRtwCheck,
  setProfessionalStatus,
  setTier,
  verifyNmc,
} from "@/lib/actions/admin";
import {
  CERTIFICATE_TYPES,
  CLINICAL_SKILLS,
  CLINICAL_SKILL_LEVELS,
  CONTRACT_VERSION,
  certificateType,
} from "@/lib/compliance-requirements";
import { Constants, type Database } from "@/lib/supabase/database.types";
import {
  daysUntil,
  formatDate,
  formatDateTime,
  fullName,
  humanise,
  nameMap,
  statusPillClass,
  td,
  th,
  trow,
} from "@/lib/admin/helpers";

type DocType = Database["public"]["Enums"]["document_type"];
type DocRow = Database["public"]["Tables"]["compliance_documents"]["Row"];

const inputClass =
  "border border-hairline-strong rounded-full px-3.5 py-1.5 text-[14px] bg-card text-ink";

const RTW_ROUTE_LABELS: Record<string, string> = {
  british_irish_passport: "British or Irish passport",
  share_code: "Gov.uk share code (online check)",
};

export default async function AdminProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { id } = await params;

  const [{ data: pro }, { data: person }] = await Promise.all([
    supabase.from("professional_profiles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, phone, created_at")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!pro || !person) notFound();

  const [docsRes, placementsRes, interviewsRes, flagsRes, termsRes] = await Promise.all([
    supabase
      .from("compliance_documents")
      .select("*")
      .eq("professional_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("placements")
      .select("id, client_id, fee_amount, status, started_at, ended_at")
      .eq("professional_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("interview_requests")
      .select("id, client_id, status, scheduled_at, created_at, client_notes")
      .eq("professional_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("safeguarding_flags")
      .select("id, reason, details, status, created_at, resolved_at")
      .eq("professional_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("terms_acceptances")
      .select("id, document, version, accepted_at")
      .eq("user_id", id)
      .order("accepted_at", { ascending: false }),
  ]);
  const docs = docsRes.data ?? [];
  const placements = placementsRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const flags = flagsRes.data ?? [];
  const termsAcceptances = termsRes.data ?? [];

  // Client names for placements + interviews
  const clientIds = [
    ...new Set([
      ...placements.map((p) => p.client_id),
      ...interviews.map((i) => i.client_id),
    ]),
  ];
  const { data: clientRows } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", clientIds)
    : { data: [] };
  const clientNames = nameMap(clientRows);

  // Signed URLs for document viewing (private bucket → service role)
  const admin = createAdminClient();
  const signedUrls = new Map<string, string>();
  await Promise.all(
    docs.map(async (doc) => {
      const { data } = await admin.storage
        .from("compliance-documents")
        .createSignedUrl(doc.storage_path, 3600);
      if (data?.signedUrl) signedUrls.set(doc.id, data.signedUrl);
    })
  );

  /* ---------------- Vetting v2 derived state ---------------- */
  const isNurse = pro.kind === "nurse";
  const latestOf = (type: DocType) => docs.find((d) => d.doc_type === type);
  const approvedCount = (type: DocType) =>
    docs.filter((d) => d.doc_type === type && d.status === "approved").length;

  // Right to work (route-dependent, mirrors the SQL engine)
  const rtwRoute = pro.rtw_route;
  const rtwExpiryDays = pro.rtw_expires_at ? daysUntil(pro.rtw_expires_at) : null;
  const rtwCheckValid =
    !!pro.rtw_checked_at && (rtwExpiryDays === null || rtwExpiryDays > 0);
  const photoIdApproved = approvedCount("photo_id") > 0;
  const rtwMet =
    rtwRoute === "british_irish_passport"
      ? photoIdApproved
      : rtwRoute === "share_code"
        ? rtwCheckValid
        : false;

  // Training certificates: latest doc per mandatory certificate type
  const trainingDocs = docs.filter((d) => d.doc_type === "training_certificate");
  const mandatoryCerts = CERTIFICATE_TYPES.filter((c) => c.mandatory);

  // Clinical skills (nurses): self-rated map {skill: level}
  const skillLevels =
    pro.clinical_skills && typeof pro.clinical_skills === "object" && !Array.isArray(pro.clinical_skills)
      ? (pro.clinical_skills as Record<string, unknown>)
      : {};
  const ratedSkills = CLINICAL_SKILLS.flatMap((s) => {
    const level = skillLevels[s.value];
    return typeof level === "string" &&
      (CLINICAL_SKILL_LEVELS as readonly string[]).includes(level)
      ? [{ ...s, level }]
      : [];
  });
  const skillGroups = [...new Set(CLINICAL_SKILLS.map((s) => s.group))]
    .map((group) => ({ group, skills: ratedSkills.filter((s) => s.group === group) }))
    .filter((g) => g.skills.length > 0);

  // Working agreement state machine
  const contractAccepted = !!pro.contract_accepted_at;
  const contractIssued = !!pro.contract_version;

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/app/admin/professionals"
          className="text-[14px] font-semibold text-green hover:text-green-dark"
        >
          &larr; All professionals
        </Link>
      </div>

      <PageHeading
        eyebrow={`${isNurse ? "Nurse" : "Carer"} · ${humanise(pro.status)}`}
        title={fullName(person)}
        intro={pro.headline || undefined}
        actions={
          <span className="flex items-center gap-2">
            <CompliancePill status={pro.compliance_status} />
            <span className="text-[14px] text-muted">{pro.compliance_score}/100</span>
            <TierBadge tier={pro.tier} />
          </span>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Profile</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[14.5px]">
              <ProfileField label="Phone" value={person.phone || "–"} />
              <ProfileField label="Location" value={pro.location || "–"} />
              <ProfileField label="Region" value={pro.region || "–"} />
              <ProfileField label="Experience" value={`${pro.years_experience} years`} />
              <ProfileField
                label="Availability"
                value={`${humanise(pro.availability_status)} · confirmed ${formatDate(pro.availability_confirmed_at)}`}
              />
              <ProfileField label="Applied" value={formatDate(pro.created_at)} />
              <ProfileField label="Drives" value={pro.can_drive ? "Yes" : "No"} />
              {isNurse && (
                <ProfileField label="NMC PIN" value={pro.nmc_pin || "Not provided"} />
              )}
              <ProfileField
                label="Care categories"
                value={
                  pro.care_categories.length
                    ? pro.care_categories.map(humanise).join(", ")
                    : "–"
                }
              />
            </dl>
          </Card>

          {/* Vetting requirements (engine v2) */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Vetting requirements</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Requirement</th>
                    <th className={th}>Latest document</th>
                    <th className={th}>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  <GroupRow label="Identity & right to work" />
                  <DocRequirementRow label="Enhanced DBS check" doc={latestOf("dbs")} />
                  <DocRequirementRow label="Photo ID (passport)" doc={latestOf("photo_id")} />
                  <CountRow
                    label="Proof of address (2 required)"
                    approved={approvedCount("proof_of_address")}
                    required={2}
                  />
                  <tr className={trow}>
                    <td className={`${td} font-medium text-ink`}>Right to work</td>
                    <td className={td} colSpan={2}>
                      {rtwRoute === null ? (
                        <span className={statusPillClass("open")}>Route not selected</span>
                      ) : rtwRoute === "british_irish_passport" ? (
                        <span className={statusPillClass(rtwMet ? "approved" : "open")}>
                          {rtwMet
                            ? "Met via approved photo ID"
                            : "Passport route: photo ID not approved yet"}
                        </span>
                      ) : (
                        <span className={statusPillClass(rtwMet ? "approved" : "open")}>
                          {!pro.rtw_checked_at
                            ? "Online check not recorded"
                            : rtwMet
                              ? `Checked ${formatDate(pro.rtw_checked_at)}`
                              : `Check expired ${formatDate(pro.rtw_expires_at)}`}
                        </span>
                      )}
                    </td>
                  </tr>

                  <GroupRow label="References & CV" />
                  <CountRow
                    label="References (2 required)"
                    approved={approvedCount("reference")}
                    required={2}
                  />
                  <DocRequirementRow label="CV" doc={latestOf("cv")} />

                  <GroupRow label="Insurance" />
                  <DocRequirementRow label="Liability & indemnity insurance" doc={latestOf("insurance")} />

                  {isNurse && (
                    <>
                      <GroupRow label="Nurse requirements" />
                      <DocRequirementRow label="NMC registration" doc={latestOf("nmc_registration")} />
                      <DocRequirementRow
                        label="NMC statement of entry"
                        doc={latestOf("statement_of_entry")}
                      />
                      <tr className={trow}>
                        <td className={`${td} font-medium text-ink`}>
                          NMC register verification
                        </td>
                        <td className={td} colSpan={2}>
                          {pro.nmc_verified_at ? (
                            <span className={statusPillClass("approved")}>
                              Verified {formatDate(pro.nmc_verified_at)}
                            </span>
                          ) : (
                            <span className={statusPillClass("open")}>Not verified</span>
                          )}
                        </td>
                      </tr>
                      <tr className={trow}>
                        <td className={`${td} font-medium text-ink`}>
                          Clinical skills (10 required)
                        </td>
                        <td className={td} colSpan={2}>
                          <span
                            className={statusPillClass(
                              ratedSkills.length >= 10 ? "approved" : "open"
                            )}
                          >
                            {ratedSkills.length} of {CLINICAL_SKILLS.length} rated
                          </span>
                        </td>
                      </tr>
                    </>
                  )}

                  <GroupRow label="Interview" />
                  <tr className={trow}>
                    <td className={`${td} font-medium text-ink`}>Vetting interview</td>
                    <td className={td} colSpan={2}>
                      {pro.interview_passed_at ? (
                        <span className={statusPillClass("approved")}>
                          Passed {formatDate(pro.interview_passed_at)}
                        </span>
                      ) : (
                        <span className={statusPillClass("open")}>Not passed</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mandatory training certificates */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Mandatory training</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Certificate</th>
                    <th className={th}>Latest document</th>
                    <th className={th}>Expiry</th>
                    <th className={th}>Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {mandatoryCerts.map((cert) => {
                    const latest = trainingDocs.find(
                      (d) => d.certificate_type === cert.value
                    );
                    const days = latest?.expiry_date ? daysUntil(latest.expiry_date) : null;
                    return (
                      <tr key={cert.value} className={trow}>
                        <td className={`${td} font-medium text-ink`}>{cert.label}</td>
                        <td className={td}>
                          {latest ? (
                            <span className={statusPillClass(latest.status)}>
                              {humanise(latest.status)}
                            </span>
                          ) : (
                            <span className={statusPillClass("open")}>Missing</span>
                          )}
                        </td>
                        <td className={td}>
                          {latest?.expiry_date
                            ? formatDate(latest.expiry_date)
                            : latest && cert.validityMonths === null
                              ? "Does not expire"
                              : "–"}
                        </td>
                        <td className={td}>
                          {days === null ? (
                            "–"
                          ) : (
                            <span className={expiryTone(days)}>
                              {days <= 0 ? "Expired" : days}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Documents</h2>
            {docs.length === 0 ? (
              <p className="text-muted text-[14.5px]">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-4">
                {docs.map((doc) => (
                  <li key={doc.id} className="border border-hairline rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink text-[15px]">
                          {doc.title || humanise(doc.doc_type)}
                          <span className="ml-2 text-[13px] text-faint capitalize">
                            {humanise(doc.doc_type)}
                          </span>
                          {doc.doc_type === "training_certificate" && doc.certificate_type && (
                            <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[12px] font-semibold bg-sand text-muted">
                              {certificateType(doc.certificate_type)?.label ??
                                humanise(doc.certificate_type)}
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-muted mt-1">
                          Uploaded {formatDate(doc.created_at)}
                          {doc.issue_date && <> · Issued {formatDate(doc.issue_date)}</>}
                          {doc.expiry_date && <> · Expires {formatDate(doc.expiry_date)}</>}
                        </div>
                        {doc.review_notes && (
                          <div className="text-[13px] text-muted mt-1">
                            Notes: {doc.review_notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={statusPillClass(doc.status)}>
                          {humanise(doc.status)}
                        </span>
                        {signedUrls.get(doc.id) && (
                          <a
                            href={signedUrls.get(doc.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[14px] font-semibold text-green hover:text-green-dark"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                    {doc.status === "pending_review" && (
                      <div className="mt-3">
                        <DocReviewForm documentId={doc.id} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Placements */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Placements</h2>
            {placements.length === 0 ? (
              <p className="text-muted text-[14.5px]">No placements yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={th}>Client</th>
                      <th className={th}>Fee</th>
                      <th className={th}>Status</th>
                      <th className={th}>Started</th>
                      <th className={th}>Ended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placements.map((p) => (
                      <tr key={p.id} className={trow}>
                        <td className={td}>{clientNames.get(p.client_id) ?? "Unknown"}</td>
                        <td className={td}>{formatGBP(p.fee_amount)}</td>
                        <td className={td}>
                          <span className={statusPillClass(p.status)}>{p.status}</span>
                        </td>
                        <td className={td}>{formatDate(p.started_at)}</td>
                        <td className={td}>{formatDate(p.ended_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Interview requests */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Interview requests</h2>
            {interviews.length === 0 ? (
              <p className="text-muted text-[14.5px]">No interview requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={th}>Client</th>
                      <th className={th}>Status</th>
                      <th className={th}>Requested</th>
                      <th className={th}>Scheduled for</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((i) => (
                      <tr key={i.id} className={trow}>
                        <td className={td}>{clientNames.get(i.client_id) ?? "Unknown"}</td>
                        <td className={td}>
                          <span className={statusPillClass(i.status)}>{i.status}</span>
                        </td>
                        <td className={td}>{formatDate(i.created_at)}</td>
                        <td className={td}>{formatDateTime(i.scheduled_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Flags */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Safeguarding flags</h2>
            {flags.length === 0 ? (
              <p className="text-muted text-[14.5px]">No flags raised.</p>
            ) : (
              <ul className="space-y-3">
                {flags.map((f) => (
                  <li key={f.id} className="border border-hairline rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink capitalize text-[15px]">
                        {humanise(f.reason)}
                      </span>
                      <span className={statusPillClass(f.status)}>{humanise(f.status)}</span>
                    </div>
                    {f.details && (
                      <p className="text-[14px] text-muted mt-1">{f.details}</p>
                    )}
                    <p className="text-[13px] text-faint mt-1">
                      Raised {formatDate(f.created_at)}
                      {f.resolved_at && <> · Closed {formatDate(f.resolved_at)}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Actions</h2>
            <div className="space-y-5">
              <div>
                <form
                  action={setProfessionalStatus.bind(null, pro.id)}
                  className="flex items-center gap-2"
                >
                  <label className="text-[13px] font-semibold text-faint uppercase tracking-wide flex-none">
                    Status
                  </label>
                  <select name="status" defaultValue={pro.status} className={inputClass}>
                    {Constants.public.Enums.professional_status.map((s) => {
                      const blocked =
                        s === "active" && pro.status !== "active" && !contractAccepted;
                      return (
                        <option key={s} value={s} disabled={blocked}>
                          {humanise(s)}
                          {blocked ? " (agreement not accepted)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <SmallSubmit>Save</SmallSubmit>
                </form>
                {!contractAccepted && pro.status !== "active" && (
                  <p className="text-[13px] text-muted mt-2">
                    Activation is locked until the working agreement is accepted.
                  </p>
                )}
              </div>

              <form action={setTier.bind(null, pro.id)} className="flex items-center gap-2">
                <label className="text-[13px] font-semibold text-faint uppercase tracking-wide flex-none">
                  Tier
                </label>
                <select name="tier" defaultValue={pro.tier} className={inputClass}>
                  {Constants.public.Enums.professional_tier.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <SmallSubmit>Save</SmallSubmit>
              </form>

              {!pro.interview_passed_at && (
                <form action={markInterviewPassed.bind(null, pro.id)}>
                  <Button type="submit">Mark interview passed</Button>
                </form>
              )}
            </div>
          </Card>

          {/* Right to work */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Right to work</h2>
            <div className="space-y-3 text-[14px]">
              <SidebarField
                label="Route"
                value={rtwRoute ? (RTW_ROUTE_LABELS[rtwRoute] ?? humanise(rtwRoute)) : "Not selected yet"}
              />
              {rtwRoute === null && (
                <p className="text-muted">
                  The professional has not chosen a right-to-work route in their
                  profile yet.
                </p>
              )}
              {rtwRoute === "british_irish_passport" && (
                <p className="text-muted">
                  Verified through their passport: approving the photo ID document
                  satisfies this requirement.{" "}
                  <span className={statusPillClass(photoIdApproved ? "approved" : "open")}>
                    {photoIdApproved ? "Photo ID approved" : "Photo ID not approved"}
                  </span>
                </p>
              )}
              {rtwRoute === "share_code" && (
                <>
                  <SidebarField
                    label="Share code"
                    value={pro.rtw_share_code || "Not provided"}
                    mono
                  />
                  <div>
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                      Check status
                    </span>
                    <div className="mt-1">
                      {pro.rtw_checked_at ? (
                        <span className={statusPillClass(rtwCheckValid ? "approved" : "open")}>
                          Checked {formatDate(pro.rtw_checked_at)}
                          {pro.rtw_expires_at &&
                            ` · ${rtwCheckValid ? "re-check due" : "expired"} ${formatDate(pro.rtw_expires_at)}`}
                        </span>
                      ) : (
                        <span className={statusPillClass("open")}>Not checked yet</span>
                      )}
                    </div>
                  </div>
                  <form
                    action={recordRtwCheck.bind(null, pro.id)}
                    className="space-y-3 pt-2 border-t border-hairline"
                  >
                    <p className="text-muted">
                      Run the check at{" "}
                      <a
                        href="https://www.gov.uk/view-right-to-work"
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-green hover:text-green-dark"
                      >
                        gov.uk/view-right-to-work
                      </a>{" "}
                      using the share code and date of birth, then record the result
                      here. The check date is recorded as today.
                    </p>
                    <label className="block">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                        Status expiry (only for time-limited permission)
                      </span>
                      <input
                        type="date"
                        name="expiresAt"
                        className={`${inputClass} block w-full mt-1`}
                      />
                    </label>
                    <Button type="submit">Record online check</Button>
                  </form>
                </>
              )}
            </div>
          </Card>

          {/* NMC (nurses) */}
          {isNurse && (
            <Card>
              <h2 className="font-serif text-xl text-ink mb-4">NMC registration</h2>
              <div className="space-y-3 text-[14px]">
                <SidebarField label="PIN" value={pro.nmc_pin || "Not provided"} mono />
                <div>
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                    Register verification
                  </span>
                  <div className="mt-1">
                    {pro.nmc_verified_at ? (
                      <span className={statusPillClass("approved")}>
                        Verified {formatDate(pro.nmc_verified_at)}
                      </span>
                    ) : (
                      <span className={statusPillClass("open")}>Not verified</span>
                    )}
                  </div>
                </div>
                <form
                  action={verifyNmc.bind(null, pro.id)}
                  className="space-y-3 pt-2 border-t border-hairline"
                >
                  <p className="text-muted">
                    Look the PIN up on the{" "}
                    <a
                      href="https://www.nmc.org.uk/registration/search-the-register/"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-green hover:text-green-dark"
                    >
                      NMC register
                    </a>{" "}
                    and confirm the name, registration status and any restrictions.
                  </p>
                  <Button type="submit">
                    {pro.nmc_verified_at ? "Re-verify register entry" : "Mark register verified"}
                  </Button>
                </form>
                <div className="pt-2 border-t border-hairline">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                    Clinical skills
                  </span>
                  <p className="text-body mt-1">
                    {ratedSkills.length} of {CLINICAL_SKILLS.length} rated (10 required)
                  </p>
                  {skillGroups.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[14px] font-semibold text-green hover:text-green-dark">
                        Show rated skills
                      </summary>
                      <div className="mt-3 space-y-3">
                        {skillGroups.map((g) => (
                          <div key={g.group}>
                            <div className="text-[12px] font-semibold uppercase tracking-wide text-faint">
                              {g.group}
                            </div>
                            <ul className="mt-1 space-y-1">
                              {g.skills.map((s) => (
                                <li
                                  key={s.value}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="text-body">{s.label}</span>
                                  <span className={statusPillClass(skillTone(s.level))}>
                                    {s.level}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Working agreement */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Working agreement</h2>
            <div className="space-y-3 text-[14px]">
              {contractAccepted ? (
                <>
                  <span className={statusPillClass("approved")}>
                    Accepted {formatDate(pro.contract_accepted_at)}
                  </span>
                  <SidebarField label="Version" value={pro.contract_version ?? "–"} mono />
                  <SidebarField label="IP address" value={pro.contract_accepted_ip ?? "–"} mono />
                </>
              ) : contractIssued ? (
                <>
                  <span className={statusPillClass("pending_review")}>
                    Awaiting acceptance
                  </span>
                  <SidebarField label="Version issued" value={pro.contract_version ?? "–"} mono />
                  <p className="text-muted">
                    The professional sees and accepts the agreement in their account.
                  </p>
                  {pro.contract_version !== CONTRACT_VERSION && (
                    <form action={issueContract.bind(null, pro.id)}>
                      <Button type="submit" variant="secondary">
                        Re-issue current version ({CONTRACT_VERSION})
                      </Button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <span className={statusPillClass("open")}>Not issued</span>
                  <p className="text-muted">
                    Issue the working agreement (version {CONTRACT_VERSION}) so the
                    professional can accept it in their account. Acceptance is
                    required before activation.
                  </p>
                  <form action={issueContract.bind(null, pro.id)}>
                    <Button type="submit">Issue working agreement</Button>
                  </form>
                </>
              )}
            </div>
          </Card>

          {/* T&Cs acceptance */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">T&amp;Cs acceptance</h2>
            {termsAcceptances.length === 0 ? (
              <p className="text-muted text-[14px]">No acceptance recorded.</p>
            ) : (
              <ul className="space-y-2 text-[14px]">
                {termsAcceptances.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink capitalize">
                        {humanise(t.document)}
                      </div>
                      <div className="text-[13px] text-muted">
                        Version {t.version} · {formatDate(t.accepted_at)}
                      </div>
                    </div>
                    <span className={statusPillClass("approved")}>Accepted</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Raise safeguarding flag</h2>
            <form action={raiseFlag.bind(null, pro.id)} className="space-y-3">
              <select name="reason" className={`${inputClass} w-full`} required>
                {Constants.public.Enums.flag_reason.map((r) => (
                  <option key={r} value={r}>
                    {humanise(r)}
                  </option>
                ))}
              </select>
              <textarea
                name="details"
                rows={3}
                placeholder="Details"
                className="w-full border border-hairline-strong rounded-xl px-3.5 py-2 text-[14px] bg-card text-ink placeholder:text-faint"
              />
              <Button type="submit" variant="danger">
                Raise flag
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SmallSubmit({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold border border-hairline-strong text-ink hover:border-green hover:text-green transition-colors"
    >
      {children}
    </button>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </dt>
      <dd className="text-body mt-0.5">{value}</dd>
    </div>
  );
}

function SidebarField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-[12px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      <div className={`text-body mt-0.5 ${mono ? "font-mono text-[13.5px]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

/** Section divider row inside the requirements table. */
function GroupRow({ label }: { label: string }) {
  return (
    <tr className={trow}>
      <td
        colSpan={3}
        className="pt-4 pb-1 pr-4 text-[12px] font-semibold uppercase tracking-wide text-faint"
      >
        {label}
      </td>
    </tr>
  );
}

/** Requirement satisfied by a single approved document. */
function DocRequirementRow({ label, doc }: { label: string; doc: DocRow | undefined }) {
  const expiryDays = doc?.expiry_date ? daysUntil(doc.expiry_date) : null;
  return (
    <tr className={trow}>
      <td className={`${td} font-medium text-ink`}>{label}</td>
      <td className={td}>
        {doc ? (
          <span className={statusPillClass(doc.status)}>{humanise(doc.status)}</span>
        ) : (
          <span className={statusPillClass("open")}>Missing</span>
        )}
      </td>
      <td className={td}>
        {doc?.expiry_date ? (
          <span className={expiryDays !== null ? expiryTone(expiryDays) : ""}>
            {formatDate(doc.expiry_date)}
            {expiryDays !== null && expiryDays <= 0 && " (expired)"}
          </span>
        ) : (
          "–"
        )}
      </td>
    </tr>
  );
}

/** Requirement satisfied by N approved documents of one type. */
function CountRow({
  label,
  approved,
  required,
}: {
  label: string;
  approved: number;
  required: number;
}) {
  return (
    <tr className={trow}>
      <td className={`${td} font-medium text-ink`}>{label}</td>
      <td className={td} colSpan={2}>
        {approved >= required ? (
          <span className={statusPillClass("approved")}>{approved} approved</span>
        ) : (
          <span className={statusPillClass("open")}>
            {approved} of {required} approved
          </span>
        )}
      </td>
    </tr>
  );
}

function expiryTone(days: number): string {
  if (days <= 0) return "font-semibold text-red-700";
  if (days <= 60) return "font-semibold text-[#7a6a3d]";
  return "";
}

/** Map a clinical-skill level onto an existing pill tint. */
function skillTone(level: string): string {
  return level === "expert" ? "approved" : level === "competent" ? "pending_review" : "pending";
}
