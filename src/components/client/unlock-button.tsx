"use client";

import { useActionState } from "react";
import { unlockProfile, type ActionResult } from "@/lib/actions/marketplace";
import { Button } from "@/components/ui";

export function UnlockButton({ professionalId }: { professionalId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    unlockProfile,
    undefined
  );

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="professionalId" value={professionalId} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Unlocking…" : "Unlock full profile (1 credit)"}
      </Button>
      {state?.error && (
        <p className="text-[13px] text-red-700 mt-2 text-center">
          {state.error}
        </p>
      )}
    </form>
  );
}
