"use client";

import { useActionState } from "react";
import { acceptContract, type ProActionState } from "@/lib/actions/professional";
import { Button } from "@/components/ui";

export function AcceptContractForm() {
  const [state, formAction, isPending] = useActionState<ProActionState, FormData>(
    acceptContract,
    {}
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="flex items-start gap-2.5 text-[14.5px] text-body cursor-pointer">
        <input type="checkbox" required className="accent-green w-4 h-4 mt-0.5" />
        I&apos;ve read this agreement and accept it.
      </label>

      {state.error && (
        <p className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[14px] font-medium">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Accepting…" : "Accept agreement"}
      </Button>
    </form>
  );
}
