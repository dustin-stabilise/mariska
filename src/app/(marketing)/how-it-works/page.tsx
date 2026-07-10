import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import {
  CARER_KEEPS_PCT,
  COMMISSION,
  bookingAmounts,
  formatGBP,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ${brand.name} works for families: browse full vetted carer and nurse profiles for free, meet for free, then book and pay through the platform.`,
};

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
  // Worked example: one hour with a carer whose rate is £20/hr.
  const exampleRate = 2000;
  const example = bookingAmounts(1, exampleRate);

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
          Four clear steps from a free account to ongoing care, with you in
          control the whole way through.
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
                Create a free account &amp; browse
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Tell us about the care you&rsquo;re looking for, then browse
                full profiles of vetted carers and nurses near you, completely
                free. See qualifications, references, verification status,
                rates, interests and a video introduction. No credits, no
                unlock fees.
              </p>
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl">
              <img
                src="/illustrations/step-profiles.svg"
                alt="Illustration of vetted carer profile cards fanned out"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] border border-hairline bg-card p-7 sm:p-10 lg:grid-cols-[88px_1.1fr_1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              02
            </span>
            <div className="lg:order-1">
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-ink">
                Meet for free
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Found someone who feels right? Request a free meet &amp; greet
                and we&rsquo;ll coordinate a time, by video or in person.
                There&rsquo;s never any pressure, and you can meet more than
                one before deciding.
              </p>
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl lg:order-2">
              <img
                src="/illustrations/step-meeting.svg"
                alt="Illustration of a family and a carer meeting over a video call"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] border border-hairline bg-card p-7 sm:p-10 lg:grid-cols-[88px_1fr_1.1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              03
            </span>
            <div>
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-ink">
                Book and pay through the platform
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-muted">
                Book the hours you need straight from your carer&rsquo;s
                profile. You pay their rate plus a {COMMISSION.clientPct}%
                platform fee, all handled securely by card, and you can cancel
                flexibly. The all-in price is shown before you confirm
                anything.
              </p>
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl">
              <img
                src="/illustrations/step-conversation.svg"
                alt="Illustration of a person booking care on their phone with message bubbles"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-9 rounded-[22px] bg-green p-7 sm:p-10 lg:grid-cols-[88px_1.1fr_1fr]">
            <span className="font-serif text-[56px] font-medium leading-none text-tan">
              04
            </span>
            <div className="lg:order-1">
              <h3 className="mb-[10px] font-serif text-[25px] font-medium text-cream">
                Ongoing care, same carer
              </h3>
              <p className="text-[15.5px] leading-[1.6] text-sage-light">
                Keep booking the same carer for as long as you need them, from
                a weekly visit to live-in care. Your carer keeps{" "}
                {CARER_KEEPS_PCT}% of the rate they set and is paid quickly
                after each visit, so the
                relationship stays strong on both sides.
              </p>
            </div>
            <div className="aspect-[16/10] overflow-hidden rounded-2xl lg:order-2">
              <img
                src="/illustrations/step-care-begins.svg"
                alt="Illustration of a carer and client walking together arm in arm"
                className="h-full w-full object-cover"
              />
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
              One simple fee, shown upfront
            </h2>
            <p className="mb-[22px] text-[16.5px] leading-[1.6] text-body">
              You pay your carer&rsquo;s hourly rate plus a{" "}
              {COMMISSION.clientPct}% platform fee, and that&rsquo;s the whole
              bill. No joining fees, no subscriptions, no unlock fees. The
              all-in price is on every profile and every booking, so there are
              no surprises on the invoice.
            </p>
            <ul className="flex list-none flex-col gap-[13px]">
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Free account,
                free full profiles, free meet &amp; greets
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Pay only when
                you book: your carer&rsquo;s rate + {COMMISSION.clientPct}%
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Secure card
                payments and clear records of every visit
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Cancel
                flexibly, no long contracts or tie-ins
              </li>
              <li className="flex gap-3 text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] text-green">✓</span>Carers keep{" "}
                {CARER_KEEPS_PCT}% of the rate they set, paid quickly after
                each visit
              </li>
            </ul>
          </div>
          <div className="rounded-3xl bg-ink p-8 text-center text-cream sm:p-11">
            <div className="mb-[14px] text-sm font-semibold uppercase tracking-[0.04em] text-sage">
              A worked example
            </div>
            <div className="font-serif text-[52px] font-medium leading-none text-tan sm:text-[68px]">
              {formatGBP(example.totalAmount)}/hr
            </div>
            <p className="mt-[18px] text-[14.5px] leading-[1.6] text-sage-light">
              is all you pay for a carer whose rate is{" "}
              {formatGBP(exampleRate)}/hr: their rate plus the{" "}
              {formatGBP(example.clientFeeAmount)} platform fee. Your carer
              keeps {formatGBP(example.carerNetAmount)} of every hour, far more
              than the roughly half an agency would leave them.
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
            Create your free account and start browsing vetted carers today.
            No obligation, and we&rsquo;re a phone call away if you&rsquo;d
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
