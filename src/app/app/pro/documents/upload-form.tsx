"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addDocumentRecord } from "@/lib/actions/professional";
import {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  type DocumentType,
} from "@/lib/professional-constants";
import {
  CERTIFICATE_TYPES,
  certificateExpiry,
} from "@/lib/compliance-requirements";
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

const labelClass =
  "block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("dbs");
  const [certType, setCertType] = useState("");
  const [completionDate, setCompletionDate] = useState("");

  const isTraining = docType === "training_certificate";
  const today = new Date().toISOString().slice(0, 10);
  // Preview only - the server recomputes the real expiry from the vocabulary.
  const previewExpiry =
    isTraining && certType && completionDate
      ? certificateExpiry(certType, completionDate)
      : null;
  const showPreview = isTraining && certType && completionDate;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string).trim();
    const issueDate = (formData.get("issue_date") as string) || undefined;
    const expiryDate = (formData.get("expiry_date") as string) || undefined;
    const file = formData.get("file") as File | null;

    if (!title) {
      setError("Please give the document a title.");
      return;
    }
    if (isTraining && !certType) {
      setError("Please choose which training certificate this is.");
      return;
    }
    if (isTraining && !completionDate) {
      setError("Please enter the date you completed the training.");
      return;
    }
    if (!file || file.size === 0) {
      setError("Please choose a file to upload.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Files must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${docType}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("compliance-documents")
        .upload(storagePath, file);
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const result = await addDocumentRecord({
        docType,
        title,
        storagePath,
        issueDate: isTraining ? undefined : issueDate,
        expiryDate: isTraining ? undefined : expiryDate,
        certificateType: isTraining ? certType : undefined,
        completionDate: isTraining ? completionDate : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(result.success ?? "Document uploaded.");
      formRef.current?.reset();
      setDocType("dbs");
      setCertType("");
      setCompletionDate("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Upload a document</h2>
      <p className="text-[14px] text-muted mt-1">
        PDFs or photos, up to 10 MB. New uploads go straight to our review team.
      </p>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className={labelClass}>Document type</span>
          <select
            name="doc_type"
            className={inputClass}
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            required
          >
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        {isTraining && (
          <>
            <label className="block">
              <span className={labelClass}>Which certificate?</span>
              <select
                name="certificate_type"
                className={inputClass}
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
                required
              >
                <option value="" disabled>
                  Choose a certificate…
                </option>
                <optgroup label="Mandatory">
                  {CERTIFICATE_TYPES.filter((c) => c.mandatory).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Optional">
                  {CERTIFICATE_TYPES.filter((c) => !c.mandatory).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Completion date</span>
              <input
                name="completion_date"
                type="date"
                max={today}
                className={inputClass}
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                required
              />
            </label>

            {showPreview && (
              <p className="rounded-xl bg-sand/60 text-body px-4 py-3 text-[13.5px]">
                {previewExpiry
                  ? `Valid until ${formatDate(previewExpiry)}, worked out from your completion date.`
                  : "This certificate does not expire."}
              </p>
            )}
          </>
        )}

        <label className="block">
          <span className={labelClass}>Title</span>
          <input
            name="title"
            className={inputClass}
            placeholder={
              isTraining
                ? "e.g. Moving & handling certificate"
                : "e.g. Enhanced DBS certificate"
            }
            required
          />
        </label>

        {!isTraining && (
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelClass}>Issue date</span>
              <input name="issue_date" type="date" className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>
                {docType === "nmc_registration" ? "Revalidation date" : "Expiry date"}
              </span>
              <input name="expiry_date" type="date" className={inputClass} />
            </label>
          </div>
        )}

        <label className="block">
          <span className={labelClass}>File</span>
          <input
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
            className="block w-full text-[14px] text-body file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-sand file:text-ink file:font-semibold file:text-[13.5px] file:cursor-pointer"
            required
          />
        </label>

        {error && (
          <p className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[14px] font-medium">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl bg-green/10 text-green px-4 py-3 text-[14px] font-medium">
            {success}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Uploading…" : "Upload document"}
        </Button>
      </form>
    </Card>
  );
}
