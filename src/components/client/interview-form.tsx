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
        {pending ? "Sending…" : "Request a free meet & greet"}
      </Button>
      {state?.error && (
        <p className="text-[13px] text-red-700 text-center">{state.error}</p>
      )}
      <p className="text-[13px] text-muted text-center">
        Completely free, with no obligation. Our team will coordinate a time
        that suits you both, by video or in person.
      </p>
    </form>
  );
}
