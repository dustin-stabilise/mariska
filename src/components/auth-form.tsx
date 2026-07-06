"use client";

import { useActionState } from "react";
import {
  requestCode,
  verifyCode,
  type OtpMode,
  type OtpState,
} from "@/lib/actions/auth";

export function Field({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[14px] font-semibold text-ink mb-1.5">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[14px] font-semibold text-ink mb-1.5">
        {label}
      </span>
      <select
        name={name}
        className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-2.5 text-[15px] text-ink focus:outline-none focus:border-green"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[14px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
      {message}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-green text-cream px-6 py-3 rounded-full font-semibold text-[15px] hover:bg-green-dark disabled:opacity-60 mt-1"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

/**
 * Two-step passwordless auth: details -> emailed 6-digit code.
 * `children` are the mode's detail fields (none for plain sign-in).
 */
export function OtpAuthForm({
  mode,
  submitLabel,
  next,
  children,
  footer,
}: {
  mode: OtpMode;
  submitLabel: string;
  next?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<OtpState, FormData>(
    async (prev, formData) => {
      const step = formData.get("step");
      return step === "verify" ? verifyCode(prev, formData) : requestCode(prev, formData);
    },
    undefined
  );

  if (state?.step === "verify") {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="step" value="verify" />
        <input type="hidden" name="mode" value={state.mode} />
        <input type="hidden" name="email" value={state.email} />
        {next && <input type="hidden" name="next" value={next} />}
        <p className="text-[15px] text-body">
          We&rsquo;ve emailed a 6-digit code to{" "}
          <strong className="text-ink">{state.email}</strong>. Enter it below.
        </p>
        <label className="block">
          <span className="block text-[14px] font-semibold text-ink mb-1.5">
            Sign-in code
          </span>
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            className="w-full rounded-xl border border-hairline-strong bg-white px-4 py-3 text-[22px] tracking-[0.35em] text-center font-mono text-ink placeholder:text-faint placeholder:tracking-[0.35em] focus:outline-none focus:border-green"
          />
        </label>
        <ErrorNote message={state.error} />
        <SubmitButton pending={pending} label="Verify and continue" />
        <p className="text-[13.5px] text-muted text-center">
          No email after a minute? Check spam, or go back and try again.
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="step" value="request" />
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="next" value={next} />}
      {children}
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <ErrorNote message={state?.error} />
      <SubmitButton pending={pending} label={submitLabel} />
      <p className="text-[13.5px] text-muted text-center">
        No passwords here: we&rsquo;ll email you a 6-digit code to sign in.
      </p>
      {footer}
    </form>
  );
}
