"use client";

import { useActionState } from "react";
import type { AuthState } from "@/lib/actions/auth";

export function Field({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
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

export function TermsCheckbox({ audience }: { audience: "client" | "professional" }) {
  return (
    <label className="flex items-start gap-3 text-[14px] text-body">
      <input
        type="checkbox"
        name="acceptTerms"
        required
        className="mt-0.5 h-4 w-4 accent-[#3F5E54]"
      />
      <span>
        I accept the{" "}
        <a href="/terms" target="_blank" className="font-semibold text-green underline">
          terms &amp; conditions
        </a>{" "}
        and{" "}
        <a href="/privacy" target="_blank" className="font-semibold text-green underline">
          privacy policy
        </a>
        {audience === "professional"
          ? ", and confirm I am applying to work on a self-employed basis."
          : "."}
      </span>
    </label>
  );
}

export function AuthForm({
  action,
  submitLabel,
  children,
  footer,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {state?.error && (
        <p className="text-[14px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-green text-cream px-6 py-3 rounded-full font-semibold text-[15px] hover:bg-green-dark disabled:opacity-60 mt-1"
      >
        {pending ? "One moment…" : submitLabel}
      </button>
      {footer}
    </form>
  );
}
