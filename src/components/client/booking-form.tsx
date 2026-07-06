"use client";

import { useActionState } from "react";
import {
  proposeBooking,
  type BookingActionState,
} from "@/lib/actions/bookings";
import { Button } from "@/components/ui";

/** Client-side wrapper for the proposeBooking server action. */
export function BookingForm({
  professionalId,
  disabled = false,
}: {
  professionalId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    BookingActionState,
    FormData
  >(proposeBooking, undefined);

  const inputClass =
    "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />
      <div>
        <label
          htmlFor="startsAt"
          className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
        >
          Starts
        </label>
        <input
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="endsAt"
          className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
        >
          Ends
        </label>
        <input
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          disabled={disabled}
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor="booking-notes"
          className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5"
        >
          Notes (optional)
        </label>
        <textarea
          id="booking-notes"
          name="notes"
          rows={3}
          disabled={disabled}
          placeholder="Anything your carer should know about this visit."
          className={`${inputClass} placeholder:text-faint`}
        />
      </div>
      <Button type="submit" disabled={disabled || pending} className="w-full">
        {pending ? "Sending…" : "Propose booking"}
      </Button>
      {state?.error && (
        <p className="text-[13px] text-red-700 text-center">{state.error}</p>
      )}
      <p className="text-[13px] text-muted text-center">
        Nothing is charged yet. Your carer confirms first, then you pay
        securely through the platform.
      </p>
    </form>
  );
}
