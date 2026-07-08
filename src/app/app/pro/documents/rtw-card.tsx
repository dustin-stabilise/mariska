"use client";

import { useActionState, useState } from "react";
import { saveRtwDetails, type ProActionState } from "@/lib/actions/professional";
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RtwCard({
  route,
  shareCode,
  checkedAt,
  expiresAt,
  passportApproved,
}: {
  route: string | null;
  shareCode: string | null;
  checkedAt: string | null;
  expiresAt: string | null;
  passportApproved: boolean;
}) {
  const [selected, setSelected] = useState(route ?? "");
  const [state, formAction, isPending] = useActionState<ProActionState, FormData>(
    saveRtwDetails,
    {}
  );

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Right to work</h2>
      <p className="text-[14px] text-muted mt-1">
        Everyone working through the platform must prove their right to work in
        the UK. Choose whichever of these applies to you.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-2.5">
          <label className="flex items-start gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5">
            <input
              type="radio"
              name="rtw_route"
              value="british_irish_passport"
              checked={selected === "british_irish_passport"}
              onChange={() => setSelected("british_irish_passport")}
              className="accent-green w-4 h-4 mt-0.5"
              required
            />
            <span>
              <span className="block text-[14.5px] font-medium text-ink">
                I have a British or Irish passport
              </span>
              <span className="block text-[12.5px] text-muted">
                Your passport proves it, no extra paperwork.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5">
            <input
              type="radio"
              name="rtw_route"
              value="share_code"
              checked={selected === "share_code"}
              onChange={() => setSelected("share_code")}
              className="accent-green w-4 h-4 mt-0.5"
              required
            />
            <span>
              <span className="block text-[14.5px] font-medium text-ink">
                I have a share code
              </span>
              <span className="block text-[12.5px] text-muted">
                From the Home Office online right-to-work service.
              </span>
            </span>
          </label>
        </div>

        {selected === "british_irish_passport" && (
          <p className="text-[13.5px] text-body bg-sand/60 rounded-xl px-4 py-3">
            Upload your passport as &ldquo;Photo ID&rdquo; using the upload form.
            Once it&apos;s approved, it covers your right to work too.
            {passportApproved && (
              <span className="block mt-1 font-semibold text-green">
                Your passport is approved, so your right to work is covered.
              </span>
            )}
          </p>
        )}

        {selected === "share_code" && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
                Your share code
              </span>
              <input
                name="rtw_share_code"
                defaultValue={shareCode ?? ""}
                placeholder="e.g. ABC-DEF-GHI"
                className={inputClass}
                required
              />
            </label>
            {checkedAt ? (
              <p className="text-[13.5px] text-body bg-green/10 rounded-xl px-4 py-3">
                <span className="font-semibold text-green">
                  Verified {formatDate(checkedAt)}.
                </span>{" "}
                {expiresAt
                  ? `Your permission is time-limited, so we'll re-check before ${formatDate(expiresAt)}.`
                  : "No expiry recorded, so nothing more to do here."}
              </p>
            ) : shareCode ? (
              <p className="text-[13.5px] text-body bg-sand/60 rounded-xl px-4 py-3">
                Code saved. Our team will verify it with the Home Office and
                record the result here.
              </p>
            ) : null}
          </div>
        )}

        {state.error && (
          <p className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[14px] font-medium">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="rounded-xl bg-green/10 text-green px-4 py-3 text-[14px] font-medium">
            {state.success}
          </p>
        )}

        {selected && (
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save right-to-work details"}
          </Button>
        )}
      </form>
    </Card>
  );
}
