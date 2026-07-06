import Link from "next/link";
import { signUpProfessional } from "@/lib/actions/auth";
import { AuthForm, Field, SelectField } from "@/components/auth-form";

export const metadata = { title: "Join as a carer or nurse" };

export default function JoinPage() {
  return (
    <div className="bg-card border border-hairline rounded-3xl p-8 md:p-10">
      <h1 className="font-serif text-3xl text-ink mb-2">
        Care work, on your terms
      </h1>
      <p className="text-muted text-[15px] mb-7">
        Apply in minutes. We&rsquo;ll verify your documents and interview you
        before your profile goes live — you keep 100% of your rate.
      </p>
      <AuthForm
        action={signUpProfessional}
        submitLabel="Apply to join"
        footer={
          <p className="text-[14px] text-muted text-center mt-2">
            Already applied?{" "}
            <Link href="/login" className="font-semibold text-green">
              Sign in
            </Link>
          </p>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="firstName" autoComplete="given-name" />
          <Field label="Last name" name="lastName" autoComplete="family-name" />
        </div>
        <SelectField
          label="I am a…"
          name="kind"
          options={[
            { value: "carer", label: "Carer" },
            { value: "nurse", label: "Registered nurse" },
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Town / city" name="location" />
          <Field
            label="Years of experience"
            name="yearsExperience"
            type="number"
          />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Phone (optional)"
          name="phone"
          type="tel"
          required={false}
          autoComplete="tel"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </AuthForm>
    </div>
  );
}
