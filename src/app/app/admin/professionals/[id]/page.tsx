import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatGBP } from "@/lib/pricing";
import { PageHeading, Card, CompliancePill, TierBadge, Button } from "@/components/ui";
import { DocReviewForm } from "@/components/admin/doc-review-form";
import {
  markInterviewPassed,
  raiseFlag,
  setProfessionalStatus,
  setTier,
} from "@/lib/actions/admin";
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

const BASE_REQUIRED: { type: DocType; label: string }[] = [
  { type: "dbs", label: "DBS check" },
  { type: "right_to_work", label: "Right to work" },
  { type: "reference", label: "References (2 required)" },
  { type: "training_certificate", label: "Mandatory training" },
];
const NURSE_REQUIRED: { type: DocType; label: string }[] = [
  { type: "insurance", label: "Indemnity insurance" },
  { type: "nmc_registration", label: "NMC registration" },
];

const inputClass =
  "border border-hairline-strong rounded-full px-3.5 py-1.5 text-[14px] bg-card text-ink";

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

  const [docsRes, placementsRes, interviewsRes, flagsRes] = await Promise.all([
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
  ]);
  const docs = docsRes.data ?? [];
  const placements = placementsRes.data ?? [];
  const interviews = interviewsRes.data ?? [];
  const flags = flagsRes.data ?? [];

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

  const requiredDocs = pro.kind === "nurse" ? [...BASE_REQUIRED, ...NURSE_REQUIRED] : BASE_REQUIRED;

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
        eyebrow={`${pro.kind === "nurse" ? "Nurse" : "Carer"} · ${humanise(pro.status)}`}
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
              <ProfileField label="Phone" value={person.phone || "—"} />
              <ProfileField label="Location" value={pro.location || "—"} />
              <ProfileField label="Region" value={pro.region || "—"} />
              <ProfileField label="Experience" value={`${pro.years_experience} years`} />
              <ProfileField
                label="Availability"
                value={`${humanise(pro.availability_status)} · confirmed ${formatDate(pro.availability_confirmed_at)}`}
              />
              <ProfileField label="Applied" value={formatDate(pro.created_at)} />
              {pro.kind === "nurse" && (
                <ProfileField label="NMC PIN" value={pro.nmc_pin || "Not provided"} />
              )}
              <ProfileField
                label="Care categories"
                value={
                  pro.care_categories.length
                    ? pro.care_categories.map(humanise).join(", ")
                    : "—"
                }
              />
            </dl>
          </Card>

          {/* Compliance breakdown */}
          <Card>
            <h2 className="font-serif text-xl text-ink mb-4">Compliance breakdown</h2>
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
                  {requiredDocs.map((req) => (
                    <ComplianceRow key={req.type} req={req} docs={docs} />
                  ))}
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
              <form
                action={setProfessionalStatus.bind(null, pro.id)}
                className="flex items-center gap-2"
              >
                <label className="text-[13px] font-semibold text-faint uppercase tracking-wide flex-none">
                  Status
                </label>
                <select name="status" defaultValue={pro.status} className={inputClass}>
                  {Constants.public.Enums.professional_status.map((s) => (
                    <option key={s} value={s}>
                      {humanise(s)}
                    </option>
                  ))}
                </select>
                <SmallSubmit>Save</SmallSubmit>
              </form>

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

function ComplianceRow({
  req,
  docs,
}: {
  req: { type: DocType; label: string };
  docs: DocRow[];
}) {
  const ofType = docs.filter((d) => d.doc_type === req.type);
  const latest = ofType[0]; // docs come newest-first

  if (req.type === "reference") {
    const approved = ofType.filter((d) => d.status === "approved").length;
    return (
      <tr className={trow}>
        <td className={`${td} font-medium text-ink`}>{req.label}</td>
        <td className={td} colSpan={2}>
          {approved >= 2 ? (
            <span className={statusPillClass("approved")}>{approved} approved</span>
          ) : (
            <span className={statusPillClass("open")}>
              {approved} of 2 approved
            </span>
          )}
        </td>
      </tr>
    );
  }

  const expiryDays = latest?.expiry_date ? daysUntil(latest.expiry_date) : null;
  return (
    <tr className={trow}>
      <td className={`${td} font-medium text-ink`}>{req.label}</td>
      <td className={td}>
        {latest ? (
          <span className={statusPillClass(latest.status)}>{humanise(latest.status)}</span>
        ) : (
          <span className={statusPillClass("open")}>Missing</span>
        )}
      </td>
      <td className={td}>
        {latest?.expiry_date ? (
          <span
            className={
              expiryDays !== null && expiryDays <= 0
                ? "font-semibold text-red-700"
                : expiryDays !== null && expiryDays <= 60
                  ? "font-semibold text-[#7a6a3d]"
                  : ""
            }
          >
            {formatDate(latest.expiry_date)}
            {expiryDays !== null && expiryDays <= 0 && " (expired)"}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
