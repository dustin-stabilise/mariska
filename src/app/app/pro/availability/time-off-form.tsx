"use client";

import { useActionState } from "react";
import { addTimeOff, type ProActionState } from "@/lib/actions/professional";
import { Button } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

export function TimeOffForm() {
  const [state, formAction, pending] = useActionState<ProActionState, FormData>(
    addTimeOff,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            First day off
          </span>
          <input name="starts_on" type="date" required className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Last day off
          </span>
          <input name="ends_on" type="date" required className={inputClass} />
        </label>
      </div>
      <label className="block">
        <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
          Note (optional)
        </span>
        <input
          name="note"
          maxLength={200}
          placeholder='e.g. "family holiday"'
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add time off"}
        </Button>
        {state.success && (
          <span className="text-[14px] font-semibold text-green">
            ✓ Time off added.
          </span>
        )}
        {state.error && (
          <span className="text-[13px] text-red-700">{state.error}</span>
        )}
      </div>
    </form>
  );
}
