"use client";

import { useActionState, useState } from "react";
import {
  saveAvailability,
  type ProActionState,
} from "@/lib/actions/professional";
import {
  AVAILABILITY_STATUSES,
  LIMITED_DAYS,
  type AvailabilityStatus,
} from "@/lib/professional-constants";
import { Button } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

export function AvailabilityForm({
  status,
  limitedDays,
  limitedNote,
}: {
  status: AvailabilityStatus;
  limitedDays: string[];
  limitedNote: string | null;
}) {
  const [state, formAction, pending] = useActionState<ProActionState, FormData>(
    saveAvailability,
    {}
  );
  const [selected, setSelected] = useState<AvailabilityStatus>(status);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-2.5">
        {AVAILABILITY_STATUSES.map((s) => (
          <label
            key={s.value}
            className="flex items-start gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
          >
            <input
              type="radio"
              name="availability_status"
              value={s.value}
              checked={selected === s.value}
              onChange={() => setSelected(s.value)}
              className="accent-green w-4 h-4 mt-0.5"
            />
            <span>
              <span className="block text-[14.5px] font-medium text-ink">
                {s.label}
              </span>
              <span className="block text-[12.5px] text-muted">{s.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {selected === "limited" && (
        <div className="space-y-4">
          <div>
            <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Days you can work
            </span>
            <div className="flex flex-wrap gap-2">
              {LIMITED_DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
                >
                  <input
                    type="checkbox"
                    name="limited_days"
                    value={day.value}
                    defaultChecked={limitedDays.includes(day.value)}
                    className="accent-green w-4 h-4"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
              Note (optional)
            </span>
            <input
              name="limited_note"
              defaultValue={limitedNote ?? ""}
              maxLength={200}
              placeholder='e.g. "school hours only"'
              className={inputClass}
            />
          </label>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save availability"}
        </Button>
        {state.success && (
          <span className="text-[14px] font-semibold text-green">
            ✓ {state.success}
          </span>
        )}
        {state.error && (
          <span className="text-[13px] text-red-700">{state.error}</span>
        )}
      </div>
    </form>
  );
}
