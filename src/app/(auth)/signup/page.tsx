import Link from "next/link";
import { signUpClient } from "@/lib/actions/auth";
import { AuthForm, Field, TermsCheckbox } from "@/components/auth-form";

export const metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="bg-card border border-hairline rounded-3xl p-8 md:p-10">
      <h1 className="font-serif text-3xl text-ink mb-2">
        Find the right carer
      </h1>
      <p className="text-muted text-[15px] mb-7">
        Create a free account to search vetted carers and nurses near you.
      </p>
      <AuthForm
        action={signUpClient}
        submitLabel="Create free account"
        footer={
          <p className="text-[14px] text-muted text-center mt-2">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-green">
              Sign in
            </Link>
            {" · "}
            Carer or nurse?{" "}
            <Link href="/join" className="font-semibold text-green">
              Join here
            </Link>
          </p>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" name="firstName" autoComplete="given-name" />
          <Field label="Last name" name="lastName" autoComplete="family-name" />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <TermsCheckbox audience="client" />
      </AuthForm>
    </div>
  );
}
