import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { PRICING, formatGBP } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "For carers & nurses",
  description: `Join ${brand.name}: free registration, set your own rates, keep 100% of your pay and choose the clients you work with.`,
};

const HATCH_14 =
  "bg-[repeating-linear-gradient(135deg,#E4D7C3_0_14px,#EADFCD_14px_28px)]";

function BenefitCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-hairline bg-card p-[30px]">
      <h3 className="mb-[9px] font-serif text-[21px] font-medium">{title}</h3>
      <p className="text-[14.5px] leading-[1.55] text-muted">{children}</p>
    </div>
  );
}

function JoinStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-hairline bg-cream p-7">
      <span className="font-serif text-[40px] font-medium text-tan">
        {number}
      </span>
      <h3 className="mb-2 mt-[10px] font-serif text-[19px] font-medium">
        {title}
      </h3>
      <p className="text-sm leading-[1.55] text-muted">{children}</p>
    </div>
  );
}

export default function ForCarersPage() {
  const referral = PRICING.referral;

  return (
    <>
      {/* HERO */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-7 pb-[60px] pt-[74px] lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-[26px] inline-flex items-center gap-[9px] rounded-[30px] border border-hairline bg-sand px-[15px] py-[7px] text-[13.5px] font-semibold text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-green" />
            For carers &amp; nurses
          </div>
          <h1 className="mb-[22px] font-serif text-[42px] font-normal leading-[1.04] tracking-[-0.015em] text-ink sm:text-[58px]">
            Care work,
            <br />
            on <em className="italic text-green">your</em> terms.
          </h1>
          <p className="mb-8 max-w-[480px] text-[19px] leading-[1.6] text-body">
            Choose your clients, set your own rates and work flexibly around
            your life. Registration is free, private clients find and engage
            you directly, and we never take a penny of your pay.
          </p>
          <div className="mb-8 flex flex-wrap gap-[14px]">
            <Link
              href="/join"
              className="inline-flex items-center gap-[10px] rounded-[32px] bg-green px-7 py-[15px] text-base font-semibold text-cream transition-colors hover:bg-green-dark"
            >
              Apply to join <span className="text-lg">→</span>
            </Link>
            <a
              href="#how"
              className="rounded-[32px] border-[1.5px] border-[rgba(36,53,48,0.18)] bg-transparent px-[26px] py-[15px] text-base font-semibold text-ink transition-colors hover:border-green hover:text-green"
            >
              How it works
            </a>
          </div>
          <div className="flex flex-wrap gap-[26px] text-sm font-semibold text-muted">
            <span className="flex items-center gap-2">
              <span className="text-base text-green">✓</span>Keep 100% of your
              rate
            </span>
            <span className="flex items-center gap-2">
              <span className="text-base text-green">✓</span>You choose your
              clients
            </span>
          </div>
        </div>
        <div className="relative">
          <div
            className={`flex aspect-[4/5] items-end justify-center overflow-hidden rounded-3xl ${HATCH_14} shadow-[0_30px_60px_-28px_rgba(36,53,48,0.4)]`}
          >
            <span className="mb-[22px] rounded-[20px] bg-[rgba(251,248,243,0.8)] px-3 py-[6px] font-mono text-xs text-faint">
              carer portrait, confident &amp; warm
            </span>
          </div>
          <div className="absolute -bottom-[26px] -right-[22px] max-w-[210px] rounded-[18px] bg-green px-[22px] py-5 shadow-[0_18px_40px_-22px_rgba(36,53,48,0.5)]">
            <div className="font-serif text-[34px] leading-none text-tan">
              £0
            </div>
            <div className="mt-[6px] text-[13.5px] leading-[1.45] text-sage-light">
              taken from your hourly pay. You&rsquo;re paid directly by your
              client.
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-[1200px] px-7 py-[50px]">
        <div className="mb-[42px] max-w-[600px]">
          <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
            Why carers choose {brand.name}
          </span>
          <h2 className="mt-[14px] font-serif text-[32px] font-normal leading-[1.12] text-ink sm:text-[40px]">
            The freedom of self-employment, without the loneliness
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <BenefitCard title="Set your own rates">
            You decide what your skills and experience are worth. Clients pay
            you directly, and we never take a cut.
          </BenefitCard>
          <BenefitCard title="Choose your clients">
            Pick the people, the type of care and the hours that suit you.
            Build relationships that last.
          </BenefitCard>
          <BenefitCard title="Genuinely flexible">
            Visiting, overnight or live-in. Work full weeks or fit care around
            family. It&rsquo;s your schedule.
          </BenefitCard>
          <BenefitCard title="Chosen, not assigned">
            Clients find you for your interests, values and personality (not
            just your availability), so the work feels meaningful.
          </BenefitCard>
          <BenefitCard title="Real support behind you">
            A dedicated team on the phone, help arranging holiday cover, and a
            community of fellow carers.
          </BenefitCard>
          <div className="flex flex-col justify-center rounded-[20px] bg-ink p-[30px] text-cream">
            <h3 className="mb-[9px] font-serif text-[22px] font-normal">
              Less admin, more caring
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-sage">
              We handle your profile, interview coordination and the paperwork
              around introductions, so you can focus on the people you care
              for.
            </p>
          </div>
        </div>
      </section>

      {/* HOW JOINING WORKS */}
      <section
        id="how"
        className="mt-[30px] border-y border-hairline bg-card"
      >
        <div className="mx-auto max-w-[1100px] px-7 py-[74px]">
          <div className="mx-auto mb-12 max-w-[560px] text-center">
            <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
              Joining {brand.name}
            </span>
            <h2 className="mt-[14px] font-serif text-[32px] font-normal leading-[1.12] text-ink sm:text-[38px]">
              Four steps to your first match
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <JoinStep number="01" title="Apply online">
              Tell us about your experience, qualifications and the care you
              love to give.
            </JoinStep>
            <JoinStep number="02" title="Checks & interview">
              We verify your enhanced DBS, right to work, references and
              training, and meet you face to face.
            </JoinStep>
            <JoinStep number="03" title="Build your profile">
              Share your skills, rates, interests and a video introduction so
              the right clients can find you.
            </JoinStep>
            <JoinStep number="04" title="Meet your clients">
              Clients unlock your profile and request interviews through the
              platform. You choose who to work with.
            </JoinStep>
          </div>
          <div className="mt-6 rounded-2xl border border-hairline bg-sand px-[22px] py-[18px] text-center text-[14.5px] leading-[1.6] text-body">
            <strong className="text-ink">Referral rewards:</strong> know
            someone great? Earn {formatGBP(referral.carer)} for referring a
            carer, {formatGBP(referral.specialistCarer)} for a specialist carer
            and {formatGBP(referral.nurse)} for a nurse once they pass vetting
            and join.
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto max-w-[1100px] px-7 py-[74px]">
        <div className="grid grid-cols-1 items-center gap-12 rounded-[28px] bg-sand p-8 sm:p-[54px] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex aspect-square items-end rounded-[20px] bg-[repeating-linear-gradient(135deg,#dccdb2_0_12px,#e4d7c3_12px_24px)] p-4">
            <span className="font-mono text-[11px] text-faint">
              carer portrait
            </span>
          </div>
          <div>
            <div className="h-6 font-serif text-[54px] leading-[0.4] text-tan">
              &ldquo;
            </div>
            <p className="mb-[22px] font-serif text-[21px] font-light leading-[1.36] text-ink sm:text-[25px]">
              After years with an agency taking half my pay, {brand.name} felt
              like getting my career back. I choose my clients, I&rsquo;m paid
              fairly, and I&rsquo;ve never felt more supported.
            </p>
            <div className="text-[15px] font-bold">Grace O.</div>
            <div className="text-sm text-[#7A8780]">
              Senior carer · 3 years with {brand.name}
            </div>
          </div>
        </div>
      </section>

      {/* APPLY CTA */}
      <section id="apply" className="mx-auto max-w-[1200px] px-7 pb-[84px] pt-[30px]">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-7 py-12 text-center sm:px-[54px] sm:py-16">
          <div className="absolute -right-10 -top-[60px] h-[220px] w-[220px] rounded-full bg-[rgba(201,184,154,0.16)]" />
          <div className="relative">
            <h2 className="mb-4 font-serif text-[34px] font-normal leading-[1.1] text-cream sm:text-[44px]">
              Bring your care to {brand.name}
            </h2>
            <p className="mx-auto mb-[34px] max-w-[520px] text-[17px] leading-[1.6] text-sage">
              Join a network of carers and nurses who&rsquo;ve taken back
              control of their work. Registration is free, and applying takes
              ten minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-[14px]">
              <Link
                href="/join"
                className="rounded-[32px] bg-tan px-8 py-4 text-base font-bold text-[#2A2517] transition-colors hover:bg-[#d4c4a8]"
              >
                Apply to join
              </Link>
              <a
                href={brand.phoneHref}
                className="rounded-[32px] border-[1.5px] border-[rgba(244,239,232,0.3)] bg-transparent px-[30px] py-4 text-base font-semibold text-cream transition-colors hover:border-cream"
              >
                Ask us a question
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
