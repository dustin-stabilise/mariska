"use client";

import { useActionState, useState } from "react";
import {
  proposeBooking,
  type BookingActionState,
} from "@/lib/actions/bookings";
import { Button } from "@/components/ui";

/** A busy window from the professional_busy view - times only, no identities. */
export type BusyRange = {
  startsAt: string;
  endsAt: string;
  kind: "booking" | "time_off";
};

/** True when [starts, ends) overlaps any busy range. Advisory only - the
 * server enforces the real clash check when the carer accepts. */
function overlapsBusy(starts: string, ends: string, busy: BusyRange[]): boolean {
  const s = new Date(starts).getTime();
  const e = new Date(ends).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
  return busy.some(
    (b) => s < new Date(b.endsAt).getTime() && e > new Date(b.startsAt).getTime()
  );
}

/** Client-side wrapper for the proposeBooking server action. */
export function BookingForm({
  professionalId,
  busy = [],
  disabled = false,
}: {
  professionalId: string;
  busy?: BusyRange[];
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    BookingActionState,
    FormData
  >(proposeBooking, undefined);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const overlaps = overlapsBusy(startsAt, endsAt, busy);

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
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
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
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className={inputClass}
        />
      </div>
      {overlaps && (
        <p className="text-[13.5px] text-[#7a6a3d] bg-tan/20 rounded-lg px-3 py-2">
          This overlaps a time they&apos;re busy. You can still propose it, but
          they may not be able to accept.
        </p>
      )}
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
