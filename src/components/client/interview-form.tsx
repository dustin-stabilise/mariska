"use client";

import { useActionState } from "react";
import { requestInterview, type ActionResult } from "@/lib/actions/marketplace";
import { Button } from "@/components/ui";

export function InterviewRequestForm({
  professionalId,
  firstName,
}: {
  professionalId: string;
  firstName: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    requestInterview,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />
      <div>
        <label
          htmlFor="notes"
          className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-2"
        >
          Notes for {firstName} (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Tell them a little about the care you're looking for, and when you'd like to talk."
          className="w-full rounded-xl border border-hairline-strong bg-cream px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green"
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Redirecting…" : "Request interview (£15)"}
      </Button>
      {state?.error && (
        <p className="text-[13px] text-red-700 text-center">{state.error}</p>
      )}
      <p className="text-[13px] text-muted text-center">
        You&apos;ll be taken to secure checkout. We only pass on your notes once
        payment is confirmed.
      </p>
    </form>
  );
}
