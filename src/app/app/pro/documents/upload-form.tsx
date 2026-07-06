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
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const docType = formData.get("doc_type") as DocumentType;
    const title = (formData.get("title") as string).trim();
    const issueDate = (formData.get("issue_date") as string) || undefined;
    const expiryDate = (formData.get("expiry_date") as string) || undefined;
    const file = formData.get("file") as File | null;

    if (!title) {
      setError("Please give the document a title.");
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
        issueDate,
        expiryDate,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(result.success ?? "Document uploaded.");
      formRef.current?.reset();
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
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Document type
          </span>
          <select name="doc_type" className={inputClass} defaultValue="dbs" required>
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Title
          </span>
          <input
            name="title"
            className={inputClass}
            placeholder="e.g. Enhanced DBS certificate"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Issue date
            </span>
            <input name="issue_date" type="date" className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Expiry date
            </span>
            <input name="expiry_date" type="date" className={inputClass} />
          </label>
        </div>

        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            File
          </span>
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
