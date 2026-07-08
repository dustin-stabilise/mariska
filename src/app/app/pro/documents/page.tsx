import { Fragment } from "react";
import { requireRole } from "@/lib/auth-helpers";
import { deleteDocument } from "@/lib/actions/professional";
import { DOC_TYPE_LABELS } from "@/lib/professional-constants";
import { CERTIFICATE_TYPES, certificateType } from "@/lib/compliance-requirements";
import {
  buildVettingChecklist,
  evaluateDocuments,
  CHECKLIST_STATE_LABELS,
  CHECKLIST_STATE_TONE,
} from "@/lib/vetting-checklist";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/pro/status-pill";
import { ChecklistRow } from "@/components/pro/checklist";
import { UploadForm } from "./upload-form";
import { RtwCard } from "./rtw-card";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_STATE_TEXT: Record<string, string> = {
  good: "text-green",
  warn: "text-[#7a6a3d]",
  bad: "text-red-700",
};

type DocRow = {
  id: string;
  doc_type: string;
  certificate_type: string | null;
  title: string;
  status: string;
  issue_date: string | null;
  expiry_date: string | null;
  review_notes: string | null;
};

/** Time-sensitive derivation, kept out of render for purity. Fresh per
 * request - the page is force-dynamic. */
function hasApprovedPassport(documents: DocRow[]): boolean {
  const now = Date.now();
  return documents.some(
    (d) =>
      d.doc_type === "photo_id" &&
      d.status === "approved" &&
      (!d.expiry_date || new Date(d.expiry_date).getTime() > now)
  );
}

function DeleteButton({ doc }: { doc: DocRow }) {
  if (doc.status !== "pending_review") return null;
  return (
    <form action={deleteDocument}>
      <input type="hidden" name="id" value={doc.id} />
      <button
        type="submit"
        className="text-[13.5px] font-semibold text-red-700 hover:text-red-800"
      >
        Delete
      </button>
    </form>
  );
}

export default async function ProDocumentsPage() {
  const { supabase, user } = await requireRole("professional");

  const [{ data: pro }, { data: docs }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("compliance_documents")
      .select("*")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const documents = (docs ?? []) as DocRow[];
  const trainingDocs = documents.filter(
    (d) => d.doc_type === "training_certificate"
  );
  const otherDocs = documents.filter(
    (d) => d.doc_type !== "training_certificate"
  );

  // Group training certificates by their subtype, vocabulary order first,
  // anything unlabelled last.
  const certOrder = CERTIFICATE_TYPES.map((c) => c.value);
  const certValues = [
    ...certOrder.filter((v) => trainingDocs.some((d) => d.certificate_type === v)),
    ...(trainingDocs.some((d) => !d.certificate_type || !certOrder.includes(d.certificate_type))
      ? ["__other__"]
      : []),
  ];

  const groups = pro ? buildVettingChecklist(pro, documents) : [];
  const passportApproved = hasApprovedPassport(documents);

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Documents"
        intro="Your compliance vault. Everything you upload is reviewed by our team, and approvals update your compliance score automatically."
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* v2 requirements checklist */}
          {pro && (
            <Card>
              <h2 className="font-serif text-xl text-ink">
                What we need from {pro.kind === "nurse" ? "nurses" : "carers"}
              </h2>
              <p className="text-[14px] text-muted mt-1">
                Everything below must be approved before your profile can go
                fully active.
              </p>
              {groups.map((group) => (
                <div key={group.key} className="mt-5">
                  <h3 className="text-[12.5px] font-semibold uppercase tracking-wide text-faint border-b border-hairline pb-1.5">
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-hairline">
                    {group.items.map((item) => (
                      <ChecklistRow key={item.key} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </Card>
          )}

          {/* Right to work route */}
          {pro && (
            <RtwCard
              route={pro.rtw_route}
              shareCode={pro.rtw_share_code}
              checkedAt={pro.rtw_checked_at}
              expiresAt={pro.rtw_expires_at}
              passportApproved={passportApproved}
            />
          )}

          {/* Training certificates, grouped by type */}
          {trainingDocs.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-6 pt-6">
                <h2 className="font-serif text-xl text-ink">
                  Training certificates
                </h2>
                <p className="text-[14px] text-muted mt-1">
                  Grouped by course. Each mandatory course needs a current,
                  approved certificate.
                </p>
              </div>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-[14.5px]">
                  <thead>
                    <tr className="border-b border-hairline text-[12.5px] font-semibold uppercase tracking-wide text-faint">
                      <th className="px-5 py-3">Certificate</th>
                      <th className="px-5 py-3">Completed</th>
                      <th className="px-5 py-3">Valid until</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {certValues.map((value) => {
                      const cert = certificateType(value);
                      const ofType =
                        value === "__other__"
                          ? trainingDocs.filter(
                              (d) =>
                                !d.certificate_type ||
                                !certOrder.includes(d.certificate_type)
                            )
                          : trainingDocs.filter(
                              (d) => d.certificate_type === value
                            );
                      const typeState = evaluateDocuments(ofType);
                      const tone = CHECKLIST_STATE_TONE[typeState.state];
                      return (
                        <Fragment key={value}>
                          <tr className="border-t border-hairline bg-sand/30">
                            <td colSpan={5} className="px-5 py-2.5">
                              <span className="font-semibold text-ink text-[14px]">
                                {cert?.label ?? "Type not specified"}
                              </span>
                              <span
                                className={`ml-2.5 text-[13px] font-semibold ${TYPE_STATE_TEXT[tone]}`}
                              >
                                {CHECKLIST_STATE_LABELS[typeState.state]}
                                {typeState.detail ? ` · ${typeState.detail}` : ""}
                              </span>
                            </td>
                          </tr>
                          {ofType.map((doc) => (
                            <tr key={doc.id} className="align-top border-t border-hairline">
                              <td className="px-5 py-3">
                                <div className="font-medium text-ink">{doc.title}</div>
                                {doc.status === "rejected" && doc.review_notes && (
                                  <p className="text-[13px] text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mt-1.5 max-w-sm">
                                    {doc.review_notes}
                                  </p>
                                )}
                              </td>
                              <td className="px-5 py-3 text-body whitespace-nowrap">
                                {formatDate(doc.issue_date)}
                              </td>
                              <td className="px-5 py-3 text-body whitespace-nowrap">
                                {doc.expiry_date
                                  ? formatDate(doc.expiry_date)
                                  : "Does not expire"}
                              </td>
                              <td className="px-5 py-3">
                                <StatusPill status={doc.status} />
                              </td>
                              <td className="px-5 py-3 text-right">
                                <DeleteButton doc={doc} />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Other documents */}
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              body="Upload your DBS, passport and references to get your profile through review faster."
            />
          ) : (
            otherDocs.length > 0 && (
              <Card className="p-0 overflow-hidden">
                <div className="px-6 pt-6">
                  <h2 className="font-serif text-xl text-ink">Your documents</h2>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-[14.5px]">
                    <thead>
                      <tr className="border-b border-hairline text-[12.5px] font-semibold uppercase tracking-wide text-faint">
                        <th className="px-5 py-3">Document</th>
                        <th className="px-5 py-3">Issued</th>
                        <th className="px-5 py-3">Expires</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {otherDocs.map((doc) => (
                        <tr key={doc.id} className="align-top">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-ink">
                              {doc.title ||
                                DOC_TYPE_LABELS[
                                  doc.doc_type as keyof typeof DOC_TYPE_LABELS
                                ]}
                            </div>
                            <div className="text-[13px] text-muted">
                              {
                                DOC_TYPE_LABELS[
                                  doc.doc_type as keyof typeof DOC_TYPE_LABELS
                                ]
                              }
                            </div>
                            {doc.status === "rejected" && doc.review_notes && (
                              <p className="text-[13px] text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mt-1.5 max-w-sm">
                                {doc.review_notes}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-body whitespace-nowrap">
                            {formatDate(doc.issue_date)}
                          </td>
                          <td className="px-5 py-3.5 text-body whitespace-nowrap">
                            {doc.doc_type === "nmc_registration" && doc.expiry_date
                              ? `${formatDate(doc.expiry_date)} (revalidation)`
                              : formatDate(doc.expiry_date)}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusPill status={doc.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <DeleteButton doc={doc} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          )}
        </div>

        {/* Upload */}
        <UploadForm userId={user.id} />
      </div>
    </div>
  );
}
