import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { PRICING, formatGBP } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ${brand.name} works for families — search vetted carers and nurses, unlock full profiles, interview through the platform and engage directly.`,
};

const HATCH_12 =
  "bg-[repeating-linear-gradient(135deg,#E4D7C3_0_12px,#EADFCD_12px_24px)]";

function VettingCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-cream p-[26px]">
      <div className="mb-2 text-sm font-bold text-green">✓ {title}</div>
      <p className="text-[14.5px] leading-[1.55] text-muted">{children}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  const p = PRICING;

  return (
    <>
      {/* PAGE HERO */}
      <section className="mx-auto max-w-[1200px] px-7 pb-[50px] pt-[70px] text-center">
        <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
          For families
        </span>
        <h1 className="mx-auto mb-5 mt-4 max-w-[760px] font-serif text-[40px] font-normal leading-[1.06] tracking-[-0.015em] text-ink sm:text-[56px]">
          Finding the right carer, made simple
        </h1>
        <p className="mx-auto max-w-[620px] text-[19px] leading-[1.6] text-body">
          Four clear steps from a free account to the moment care begins — with
          you in control the whole way through.
        </p>
      </section>

      {/* STEPS */}
      <section id="start" className="mx-auto max-w-[1100px] px-7 pb-10 pt-[30px]">
        <div className="flex flex-col gap-[18px]">
          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] border border-hairline bg-card p-7 sm:p-10 lg:grid-cols-[88px_1fr_1.1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              01
            </span>
            <div>
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-ink">
                Tell us what you need &amp; search
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Create a free account and tell us about the care you&rsquo;re
                looking for. Then search vetted carers and nurses near you —
                previews show first name, location, years of experience, care
                type and availability.
              </p>
            </div>
            <div
              className={`flex aspect-[16/10] items-end rounded-2xl ${HATCH_12} p-3`}
            >
              <span className="font-mono text-[11px] text-faint">
                search results
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] border border-hairline bg-card p-7 sm:p-10 lg:grid-cols-[88px_1.1fr_1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              02
            </span>
            <div className="lg:order-1">
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-ink">
                Unlock full profiles
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Buy credits to unlock the profiles that stand out —{" "}
                {formatGBP(p.creditPack.amount)} for {p.creditPack.credits}{" "}
                unlocks. See full qualifications, references, verification
                status and a video introduction. Unlocked profiles stay
                accessible for {p.unlockDurationDays} days.
              </p>
            </div>
            <div
              className={`flex aspect-[16/10] items-end rounded-2xl ${HATCH_12} p-3 lg:order-2`}
            >
              <span className="font-mono text-[11px] text-faint">
                carer profiles
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] border border-hairline bg-card p-7 sm:p-10 lg:grid-cols-[88px_1fr_1.1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              03
            </span>
            <div>
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-ink">
                Interview through the platform
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Request an interview for {formatGBP(p.interview.amount)} and
                we&rsquo;ll coordinate it through the platform — by video or in
                person. No contact details are shared before you engage, so
                everyone stays protected. There&rsquo;s never any pressure, and
                you can meet more than one.
              </p>
            </div>
            <div
              className={`flex aspect-[16/10] items-end rounded-2xl ${HATCH_12} p-3`}
            >
              <span className="font-mono text-[11px] text-faint">meeting</span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] bg-green p-7 sm:p-10 lg:grid-cols-[88px_1.1fr_1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              04
            </span>
            <div className="lg:order-1">
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-cream">
                Engage directly
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-sage-light">
                Found the right person? Pay a one-off introduction fee —{" "}
                {formatGBP(p.placement.carer.amount)} for a carer,{" "}
                {formatGBP(p.placement.nurse.amount)} for a nurse — then you
                contract with and pay your carer directly. An optional{" "}
                {formatGBP(p.retainer.amount)}/month support retainer adds
                extra unlocks, replacement search help and priority support.
              </p>
            </div>
            <div className="flex aspect-[16/10] items-end rounded-2xl bg-[repeating-linear-gradient(135deg,#4d6a60_0_12px,#577567_12px_24px)] p-3 lg:order-2">
              <span className="font-mono text-[11px] text-[#aebcb4]">
                care at home
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* VETTING */}
      <section className="mt-10 border-y border-hairline bg-card">
        <div className="mx-auto max-w-[1100px] px-7 py-[74px]">
          <div className="mx-auto mb-[46px] max-w-[600px] text-center">
            <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
              Peace of mind
            </span>
            <h2 className="mt-[14px] font-serif text-[32px] font-normal leading-[1.12] text-ink sm:text-[38px]">
              Every carer, thoroughly checked
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <VettingCard title="Enhanced DBS">
              Current enhanced criminal record check, re-verified regularly.
            </VettingCard>
            <VettingCard title="Identity & right to work">
              Verified documents and the legal right to work in the UK.
            </VettingCard>
            <VettingCard title="References">
              Checked professional references from previous care roles.
            </VettingCard>
            <VettingCard title="Qualifications & training">
              Verified certificates and up-to-date mandatory care training.
            </VettingCard>
            <VettingCard title="Face-to-face interview">
              A personal interview to judge values, warmth and judgement.
            </VettingCard>
            <VettingCard title="Liability insurance">
              Valid professional indemnity and public liability cover.
            </VettingCard>
          </div>
        </div>
      </section>

      {/* COSTS */}
      <section className="mx-auto max-w-[1100px] px-7 py-[74px]">
        <div className="grid grid-cols-1 items-center gap-[54px] lg:grid-cols-2">
          <div>
            <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
              Honest pricing
            </span>
            <h2 className="mb-[18px] mt-[14px] font-serif text-[32px] font-normal leading-[1.14] text-ink sm:text-[38px]">
              No hidden fees, ever
            </h2>
            <p className="mb-[22px] text-[16.5px] leading-[1.6] text-body">
              Because you pay your carer directly and they keep 100% of their
              rate, introductory care typically costs 30% or more less than a
              managed agency. Every fee is fixed, pay-as-you-go and explained
              upfront — no surprises on the invoice.
            </p>
            <ul className="flex list-none flex-col gap-[13px]">
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Free account
                and free profile previews
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>
                {formatGBP(p.creditPack.amount)} for {p.creditPack.credits}{" "}
                full-profile unlocks, each valid {p.unlockDurationDays} days
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>
                {formatGBP(p.interview.amount)} per interview request,
                coordinated by us
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>One-off
                introduction fee from {formatGBP(p.placement.carer.amount)} on
                engagement
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>No
                finder&rsquo;s fees, no markup on care hours — carers keep 100%
                of their rate
              </li>
            </ul>
          </div>
          <div className="rounded-3xl bg-ink p-8 text-center text-cream sm:p-11">
            <div className="mb-[14px] text-sm font-semibold uppercase tracking-[0.04em] text-sage">
              Typical saving vs managed care
            </div>
            <div className="font-serif text-[64px] font-medium leading-none text-tan sm:text-[84px]">
              30%+
            </div>
            <p className="mt-[18px] text-[14.5px] leading-[1.6] text-sage-light">
              while keeping the same vetted standards and a direct relationship
              with your carer.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-7 pb-[84px] pt-10">
        <div className="rounded-[28px] bg-sand px-7 py-12 text-center sm:p-[60px]">
          <h2 className="mb-4 font-serif text-[34px] font-normal leading-[1.1] text-ink sm:text-[42px]">
            Ready to start?
          </h2>
          <p className="mx-auto mb-8 max-w-[500px] text-[17px] leading-[1.6] text-body">
            Create your free account and start searching vetted carers today —
            no obligation, and we&rsquo;re a phone call away if you&rsquo;d
            like a hand.
          </p>
          <div className="flex flex-wrap justify-center gap-[14px]">
            <Link
              href="/signup"
              className="rounded-[32px] bg-green px-8 py-4 text-base font-bold text-cream transition-colors hover:bg-green-dark"
            >
              Create your free account
            </Link>
            <a
              href={brand.phoneHref}
              className="rounded-[32px] border-[1.5px] border-[rgba(36,53,48,0.2)] bg-transparent px-[30px] py-4 text-base font-semibold text-ink transition-colors hover:border-green"
            >
              Call {brand.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
