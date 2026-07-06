import { requireRole } from "@/lib/auth-helpers";
import { deleteDocument } from "@/lib/actions/professional";
import {
  DOC_TYPE_LABELS,
  requiredDocsFor,
} from "@/lib/professional-constants";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { StatusPill } from "@/components/pro/status-pill";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProDocumentsPage() {
  const { supabase, user } = await requireRole("professional");

  const [{ data: pro }, { data: docs }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("kind")
      .eq("id", user.id)
      .single(),
    supabase
      .from("compliance_documents")
      .select("*")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const kind = pro?.kind ?? "carer";
  const documents = docs ?? [];
  const required = requiredDocsFor(kind);

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Documents"
        intro="Your compliance vault. Everything you upload is reviewed by our team — approvals update your compliance score automatically."
      />

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Document table */}
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              body="Upload your DBS, right to work and references to get your profile through review faster."
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
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
                    {documents.map((doc) => (
                      <tr key={doc.id} className="align-top">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-ink">
                            {doc.title || DOC_TYPE_LABELS[doc.doc_type]}
                          </div>
                          <div className="text-[13px] text-muted">
                            {DOC_TYPE_LABELS[doc.doc_type]}
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
                          {formatDate(doc.expiry_date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={doc.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {doc.status === "pending_review" && (
                            <form action={deleteDocument}>
                              <input type="hidden" name="id" value={doc.id} />
                              <button
                                type="submit"
                                className="text-[13.5px] font-semibold text-red-700 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Required docs explainer */}
          <Card>
            <h2 className="font-serif text-xl text-ink">
              What we need from {kind === "nurse" ? "nurses" : "carers"}
            </h2>
            <p className="text-[14px] text-muted mt-1">
              These must be approved before your profile can go fully active.
            </p>
            <ul className="mt-4 space-y-3">
              {required.map((req) => (
                <li key={req.docType} className="flex gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green flex-none" />
                  <div>
                    <span className="text-[15px] font-medium text-ink">
                      {req.label}
                    </span>
                    <p className="text-[13.5px] text-muted">{req.blurb}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-faint mt-4">
              A vetting interview with our team is also required — we&apos;ll
              arrange that with you directly once your documents are approved.
            </p>
          </Card>
        </div>

        {/* Upload */}
        <UploadForm userId={user.id} />
      </div>
    </div>
  );
}
