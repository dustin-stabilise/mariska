"use client";

import { useActionState } from "react";
import {
  createReferral,
  type ProActionState,
} from "@/lib/actions/professional";
import { REFERRAL_KINDS } from "@/lib/professional-constants";
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green disabled:opacity-50";

export function ReferralForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState<ProActionState, FormData>(
    createReferral,
    {}
  );

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Invite someone</h2>
      <p className="text-[14px] text-muted mt-1">
        We&apos;ll track their registration against your account.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            Their email
          </span>
          <input
            name="referred_email"
            type="email"
            className={inputClass}
            placeholder="name@example.com"
            disabled={disabled}
            required
          />
        </label>

        <label className="block">
          <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
            They are a…
          </span>
          <select name="kind" className={inputClass} defaultValue="carer" disabled={disabled}>
            {REFERRAL_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

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

        <Button type="submit" disabled={disabled || isPending} className="w-full">
          {isPending ? "Sending…" : "Add referral"}
        </Button>
      </form>
    </Card>
  );
}
