import Link from "next/link";
import { OtpAuthForm } from "@/components/auth-form";

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
        Enter your email and we&rsquo;ll send you a sign-in code.
      </p>
      <OtpAuthForm
        mode="login"
        submitLabel="Email me a code"
        next={next}
        footer={
          <p className="text-[14px] text-muted text-center mt-2">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-green">
              Create a free account
            </Link>{" "}
            or{" "}
            <Link href="/join" className="font-semibold text-green">
              join as a carer
            </Link>
          </p>
        }
      />
    </div>
  );
}
