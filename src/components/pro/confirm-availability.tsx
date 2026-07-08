"use client";

import { useActionState } from "react";
import {
  confirmAvailabilityWithFeedback,
  type ProActionState,
} from "@/lib/actions/professional";
import { Button } from "@/components/ui";

/**
 * Confirm-availability button with visible feedback. The date label is
 * preformatted server-side so SSR and client render identically.
 */
export function ConfirmAvailability({
  lastConfirmedLabel,
}: {
  lastConfirmedLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ProActionState, FormData>(
    confirmAvailabilityWithFeedback,
    {}
  );

  return (
    <div>
      <p className="text-[14px] text-muted">
        Last confirmed{" "}
        <span className="font-medium text-body">
          {state.success ? "just now" : lastConfirmedLabel}
        </span>
        .
      </p>
      <form action={formAction} className="mt-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Confirming…" : "Confirm availability"}
        </Button>
      </form>
      {state.success && (
        <p className="mt-3 text-[14px] font-semibold text-green">
          ✓ Confirmed just now. Thanks, you&apos;re all set.
        </p>
      )}
      {state.error && (
        <p className="mt-3 text-[13px] text-red-700">{state.error}</p>
      )}
    </div>
  );
}
