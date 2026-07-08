import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { COMMISSION } from "@/lib/pricing";
import { PageHeading, Card } from "@/components/ui";
import { AcceptContractForm } from "./accept-form";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ProContractPage() {
  const { supabase, user } = await requireRole("professional");

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("kind, contract_version, contract_accepted_at")
    .eq("id", user.id)
    .single();

  if (!pro?.contract_version) {
    return (
      <div>
        <PageHeading eyebrow="Professional" title="Working agreement" />
        <Card>
          <p className="text-muted text-[15px]">
            Your working agreement hasn&apos;t been issued yet. Our team issues
            it as part of your vetting, so there&apos;s nothing for you to do
            here for now.
          </p>
          <Link
            href="/app/pro"
            className="inline-block mt-3 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Back to your dashboard →
          </Link>
        </Card>
      </div>
    );
  }

  const keepPct = 100 - COMMISSION.carerPct;

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Working agreement"
        intro="The agreement between you and the platform. Read it carefully; accepting it is recorded with the date and your IP address."
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-ink">
              Self-employed {pro.kind === "nurse" ? "nurse" : "carer"} agreement
            </h2>
            <span className="text-[13px] text-muted">
              Version {pro.contract_version}
            </span>
          </div>

          <div className="mt-4 space-y-4 text-[15px] text-body">
            <p>In summary, this agreement sets out that:</p>
            <ul className="space-y-2.5 list-disc pl-5">
              <li>
                You work as a <strong>self-employed professional</strong>. You
                are not an employee or worker of the platform, and you stay in
                control of your own rates, availability and how you deliver
                care.
              </li>
              <li>
                You <strong>keep {keepPct}%</strong> of your rate on every
                booking. The platform&apos;s commission covers everything we do
                for you.
              </li>
              <li>
                The platform handles <strong>introductions and payments</strong>:
                we introduce you to clients, take care of bookings, invoicing
                and payouts, and provide support if anything goes wrong.
              </li>
              <li>
                A <strong>non-solicitation clause</strong> applies: work with
                clients you meet through the platform stays on the platform,
                rather than moving to private arrangements that bypass it.
              </li>
            </ul>
            <p className="text-[13.5px] text-muted bg-sand/60 rounded-xl px-4 py-3">
              This is a draft summary pending final legal wording. The full
              agreement text will replace it before launch, and you&apos;ll be
              asked to accept any materially changed version again.
            </p>
          </div>

          {pro.contract_accepted_at ? (
            <p className="mt-6 rounded-xl bg-green/10 text-green px-4 py-3 text-[15px] font-medium">
              You accepted version {pro.contract_version} on{" "}
              {formatDate(pro.contract_accepted_at)}.
            </p>
          ) : (
            <AcceptContractForm />
          )}
        </Card>
      </div>
    </div>
  );
}
