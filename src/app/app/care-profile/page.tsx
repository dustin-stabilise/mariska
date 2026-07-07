import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading } from "@/components/ui";
import { CareProfileForm } from "@/components/client/care-profile-form";

export default async function CareProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const welcome = sp.welcome === "1";
  const { supabase } = await requireRole("client");

  const { data: profile } = await supabase
    .from("care_profiles")
    .select("*")
    .maybeSingle();

  return (
    <div>
      <PageHeading
        eyebrow="Your care profile"
        title={
          welcome
            ? "One last thing before you meet your carers"
            : "Tell us about your loved one"
        }
        intro="A few unhurried questions about the person who'll receive care, so we can suggest carers who fit them, not just the postcode."
        actions={
          welcome ? (
            <Link
              href="/app/search"
              className="text-[14.5px] font-semibold text-muted hover:text-green py-2.5"
            >
              Skip for now
            </Link>
          ) : undefined
        }
      />
      <CareProfileForm
        profile={profile}
        submitLabel={welcome ? "Save and see my matches" : "Save changes"}
      />
    </div>
  );
}
