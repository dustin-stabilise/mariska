import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { AuthForm, Field } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="bg-card border border-hairline rounded-3xl p-8 md:p-10">
      <h1 className="font-serif text-3xl text-ink mb-2">Welcome back</h1>
      <p className="text-muted text-[15px] mb-7">
        Sign in to your account to continue.
      </p>
      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        footer={
          <p className="text-[14px] text-muted text-center mt-2">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-green">
              Create a free account
            </Link>{" "}
            or{" "}
            <Link href="/join" className="font-semibold text-green">
              join as a carer or nurse
            </Link>
          </p>
        }
      >
        {next && <input type="hidden" name="next" value={next} />}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </AuthForm>
    </div>
  );
}
