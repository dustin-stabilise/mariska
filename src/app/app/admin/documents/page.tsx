import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeading, Card, EmptyState } from "@/components/ui";
import { DocReviewForm } from "@/components/admin/doc-review-form";
import { certificateType } from "@/lib/compliance-requirements";
import { formatDate, humanise, nameMap } from "@/lib/admin/helpers";

export default async function AdminDocumentsPage() {
  const { supabase } = await requireRole("admin");

  const { data: docs } = await supabase
    .from("compliance_documents")
    .select(
      "id, professional_id, doc_type, certificate_type, title, issue_date, expiry_date, created_at, storage_path"
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });
  const queue = docs ?? [];

  const proIds = [...new Set(queue.map((d) => d.professional_id))];
  const { data: nameRows } = proIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", proIds)
    : { data: [] };
  const names = nameMap(nameRows);

  // Signed view links (private bucket → service role)
  const admin = createAdminClient();
  const signedUrls = new Map<string, string>();
  await Promise.all(
    queue.map(async (doc) => {
      const { data } = await admin.storage
        .from("compliance-documents")
        .createSignedUrl(doc.storage_path, 3600);
      if (data?.signedUrl) signedUrls.set(doc.id, data.signedUrl);
    })
  );

  return (
    <div>
      <PageHeading
        eyebrow="Agency admin"
        title="Document review"
        intro={`${queue.length} document${queue.length === 1 ? "" : "s"} waiting for a decision, oldest first.`}
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Queue clear"
          body="There are no documents awaiting review right now."
        />
      ) : (
        <div className="space-y-4">
          {queue.map((doc) => (
            <Card key={doc.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-ink text-[15.5px]">
                    {doc.title || humanise(doc.doc_type)}
                    <span className="ml-2 inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold capitalize bg-sand text-muted">
                      {humanise(doc.doc_type)}
                    </span>
                    {doc.doc_type === "training_certificate" && doc.certificate_type && (
                      <span className="ml-2 inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold bg-sand text-muted">
                        {certificateType(doc.certificate_type)?.label ??
                          humanise(doc.certificate_type)}
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] text-muted mt-1">
                    <Link
                      href={`/app/admin/professionals/${doc.professional_id}`}
                      className="font-semibold text-green hover:text-green-dark"
                    >
                      {names.get(doc.professional_id) ?? "Unknown"}
                    </Link>
                    {" · "}Uploaded {formatDate(doc.created_at)}
                    {doc.issue_date && <> · Issued {formatDate(doc.issue_date)}</>}
                    {doc.expiry_date && <> · Expires {formatDate(doc.expiry_date)}</>}
                  </div>
                </div>
                {signedUrls.get(doc.id) && (
                  <a
                    href={signedUrls.get(doc.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] font-semibold text-green hover:text-green-dark"
                  >
                    View document
                  </a>
                )}
              </div>
              <div className="mt-4 max-w-xl">
                <DocReviewForm documentId={doc.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
