"use client";

import { useActionState } from "react";
import { inviteStaff, type InviteStaffState } from "@/lib/actions/admin";

export function InviteStaffForm() {
  const [state, formAction, pending] = useActionState<InviteStaffState, FormData>(
    inviteStaff,
    undefined
  );

  if (state?.created) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-body">
          Account created for{" "}
          <strong className="text-ink">{state.created.email}</strong>. Share
          this one-time password with them personally; it is shown only now.
        </p>
        <div className="rounded-xl bg-sand px-4 py-3 font-mono text-[17px] tracking-wider text-ink select-all">
          {state.created.password}
        </div>
        <p className="text-[13px] text-muted">
          They sign in at /login with their email and this password. Once
          passwordless sign-in ships, they can use emailed codes instead.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-[14px] font-semibold text-ink mb-1.5">
            First name
          </span>
          <input
            name="firstName"
            required
            className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
          />
        </label>
        <label className="block">
          <span className="block text-[14px] font-semibold text-ink mb-1.5">
            Last name
          </span>
          <input
            name="lastName"
            className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-[14px] font-semibold text-ink mb-1.5">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
        />
      </label>
      {state?.error && (
        <p className="text-[14px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start bg-green text-cream px-6 py-2.5 rounded-full font-semibold text-[15px] hover:bg-green-dark disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create staff account"}
      </button>
    </form>
  );
}
