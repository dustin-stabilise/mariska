import Link from "next/link";
import { brand } from "@/lib/brand";
import { COMMISSION, bookingAmounts, formatGBP } from "@/lib/pricing";

const HATCH_14 =
  "bg-[repeating-linear-gradient(135deg,#E4D7C3_0_14px,#EADFCD_14px_28px)]";
const HATCH_12 =
  "bg-[repeating-linear-gradient(135deg,#E4D7C3_0_12px,#EADFCD_12px_24px)]";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13.5px] font-bold uppercase tracking-[0.06em] text-green">
      {children}
    </span>
  );
}

function ServiceCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-hairline bg-card transition-colors hover:border-green">
      <div className={`h-[150px] ${HATCH_12}`} />
      <div className="p-6">
        <h3 className="mb-2 font-serif text-[22px] font-medium">{title}</h3>
        <p className="text-[14.5px] leading-[1.55] text-muted">{children}</p>
      </div>
    </div>
  );
}

function FaqItem({
  question,
  answer,
  defaultOpen,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-[rgba(36,53,48,0.09)] bg-cream open:border-[rgba(63,94,84,0.4)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-[18px] px-6 py-[22px] [&::-webkit-details-marker]:hidden">
        <span className="text-[17px] font-semibold text-ink">{question}</span>
        <span className="flex-none text-2xl font-light leading-none text-green after:content-['+'] group-open:after:content-['−']" />
      </summary>
      <p className="px-6 pb-[22px] text-[15px] leading-[1.6] text-body">
        {answer}
      </p>
    </details>
  );
}

export default function HomePage() {
  // Worked example for the FAQ: one hour with a £20/hr carer.
  const exampleRate = 2000;
  const example = bookingAmounts(1, exampleRate);

  return (
    <>
      {/* HERO */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-7 pb-[70px] pt-[74px] lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-[26px] inline-flex items-center gap-[9px] rounded-[30px] border border-hairline bg-sand px-[15px] py-[7px] text-[13.5px] font-semibold tracking-[0.01em] text-muted">
            <span className="h-[7px] w-[7px] rounded-full bg-green" />
            Nationwide private care &amp; nursing
          </div>
          <h1 className="mb-6 font-serif text-[44px] font-normal leading-[1.04] tracking-[-0.015em] text-ink sm:text-[62px]">
            Care that feels
            <br />
            like <em className="italic text-green">{brand.name.toLowerCase()}</em>.
          </h1>
          <p className="mb-[34px] max-w-[480px] text-[19px] leading-[1.6] text-body">
            Search fully-vetted private carers and nurses, and choose on more
            than availability: personality, interests and culture. The right
            person, not just an available one.
          </p>
          <div className="mb-[34px] flex flex-wrap gap-[14px]">
            <Link
              href="/signup"
              className="inline-flex items-center gap-[10px] rounded-[32px] bg-green px-7 py-[15px] text-base font-semibold text-cream transition-colors hover:bg-green-dark"
            >
              Find a carer
              <span className="text-lg">→</span>
            </Link>
            <Link
              href="/for-carers"
              className="rounded-[32px] border-[1.5px] border-[rgba(36,53,48,0.18)] bg-transparent px-[26px] py-[15px] text-base font-semibold text-ink transition-colors hover:border-green hover:text-green"
            >
              I&rsquo;m a carer
            </Link>
          </div>
          <div className="flex flex-wrap gap-[26px] text-sm font-semibold text-muted">
            <span className="flex items-center gap-2">
              <span className="text-base text-green">✓</span>Enhanced DBS &amp;
              reference checked
            </span>
            <span className="flex items-center gap-2">
              <span className="text-base text-green">✓</span>No hidden fees
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            className={`flex aspect-[4/5] items-end justify-center overflow-hidden rounded-3xl ${HATCH_14} shadow-[0_30px_60px_-28px_rgba(36,53,48,0.4)]`}
          >
            <span className="mb-[22px] rounded-[20px] bg-[rgba(251,248,243,0.8)] px-3 py-[6px] font-mono text-xs tracking-[0.02em] text-faint">
              carer &amp; client photo, warm &amp; candid
            </span>
          </div>
          <div className="absolute -bottom-[26px] -left-[26px] max-w-[225px] rounded-[18px] border border-[rgba(36,53,48,0.07)] bg-card px-5 py-[18px] shadow-[0_18px_40px_-22px_rgba(36,53,48,0.45)]">
            <div className="mb-[10px] flex">
              <span className="h-[30px] w-[30px] rounded-full border-2 border-card bg-tan" />
              <span className="-ml-2 h-[30px] w-[30px] rounded-full border-2 border-card bg-[#8A9A92]" />
              <span className="-ml-2 h-[30px] w-[30px] rounded-full border-2 border-card bg-green" />
            </div>
            <div className="text-[13.5px] leading-[1.45] text-body">
              <strong className="text-ink">Found in days</strong>, not weeks.
              Search carers who genuinely fit your loved one.
            </div>
          </div>
        </div>
      </section>

      {/* REASSURANCE STRIP */}
      <section className="border-y border-hairline bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-[30px] px-7 py-[22px]">
          <span className="text-[13.5px] font-semibold uppercase tracking-[0.04em] text-faint">
            Trusted by families across the UK
          </span>
          <div className="flex flex-wrap items-center gap-9 text-[15px] font-semibold text-muted">
            <span>★★★★★ 4.9 on reviews</span>
            <span className="hidden h-[18px] w-px bg-hairline-strong sm:block" />
            <span>1,200+ matches made</span>
            <span className="hidden h-[18px] w-px bg-hairline-strong sm:block" />
            <span>Carers vetted to CQC standards</span>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS */}
      <section id="trust" className="mx-auto max-w-[1200px] px-7 pb-[30px] pt-[88px]">
        <div className="mb-[50px] max-w-[660px]">
          <Eyebrow>Why {brand.name}</Eyebrow>
          <h2 className="mt-[14px] font-serif text-[34px] font-normal leading-[1.12] tracking-[-0.01em] text-ink sm:text-[42px]">
            A more human way to find care
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[20px] border border-[rgba(36,53,48,0.1)] bg-[rgba(36,53,48,0.1)] sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card px-[26px] py-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-sand">
              <span className="block h-[22px] w-[18px] rounded-[4px_4px_7px_7px] border-2 border-b-[6px] border-green" />
            </div>
            <h3 className="mb-[9px] font-serif text-xl font-medium text-ink">
              Secure validation checks
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-muted">
              Enhanced DBS, identity, right-to-work, references and
              qualifications, all verified before any profile goes live.
            </p>
          </div>
          <div className="bg-card px-[26px] py-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-sand">
              <span className="block h-5 w-5 -rotate-45 rounded-full border-2 border-green border-r-transparent" />
            </div>
            <h3 className="mb-[9px] font-serif text-xl font-medium text-ink">
              Flexible working
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-muted">
              Visiting, overnight or live-in, arranged around your routine.
              Carers choose work that suits their lives too.
            </p>
          </div>
          <div className="bg-card px-[26px] py-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-sand">
              <span className="font-serif text-[22px] font-semibold text-green">
                £
              </span>
            </div>
            <h3 className="mb-[9px] font-serif text-xl font-medium text-ink">
              No hidden fees
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-muted">
              One transparent price: your carer&rsquo;s rate plus a{" "}
              {COMMISSION.clientPct}% platform fee, shown before you book.
              Often 30%+ less than a managed agency.
            </p>
          </div>
          <div className="bg-green px-[26px] py-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(244,239,232,0.16)]">
              <span className="block h-[11px] w-[11px] rounded-full bg-tan shadow-[14px_0_0_-2px_#F4EFE8,-14px_0_0_-2px_#F4EFE8]" />
            </div>
            <h3 className="mb-[9px] font-serif text-xl font-medium text-cream">
              Matched on what matters
            </h3>
            <p className="text-[14.5px] leading-[1.55] text-sage-light">
              Search on shared interests, hobbies, language and culture, so it
              feels like a friend, not a stranger.
            </p>
          </div>
        </div>
      </section>

      {/* MATCHING FEATURE */}
      <section className="mx-auto max-w-[1200px] px-7 py-[70px]">
        <div className="grid grid-cols-1 items-center gap-[54px] rounded-[28px] border border-hairline bg-card p-7 sm:p-[54px] lg:grid-cols-2">
          <div>
            <Eyebrow>The {brand.name} difference</Eyebrow>
            <h2 className="mb-[18px] mt-[14px] font-serif text-[32px] font-normal leading-[1.14] tracking-[-0.01em] text-ink sm:text-[38px]">
              Continuity comes from connection
            </h2>
            <p className="mb-6 text-[16.5px] leading-[1.6] text-body">
              The right carer isn&rsquo;t just qualified. They&rsquo;re
              someone your loved one looks forward to seeing. Every full
              profile goes beyond the care plan to the person behind it, so you
              can choose on what really matters.
            </p>
            <ul className="flex list-none flex-col gap-[14px]">
              <li className="flex items-start gap-[13px] text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] leading-[1.4] text-green">✓</span>
                <span>
                  <strong>Shared interests &amp; hobbies</strong>: gardening,
                  music, faith, football, the same telly.
                </span>
              </li>
              <li className="flex items-start gap-[13px] text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] leading-[1.4] text-green">✓</span>
                <span>
                  <strong>Language &amp; culture</strong>: a carer who speaks
                  the same first language or shares heritage.
                </span>
              </li>
              <li className="flex items-start gap-[13px] text-[15.5px] text-[#3D4A45]">
                <span className="text-[17px] leading-[1.4] text-green">✓</span>
                <span>
                  <strong>Personality fit</strong>: quietly reassuring or warm
                  and chatty, whatever suits.
                </span>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`flex aspect-square items-end rounded-[18px] ${HATCH_12} p-[14px]`}
            >
              <span className="font-mono text-[11px] text-faint">portrait</span>
            </div>
            <div className="flex aspect-square flex-col justify-center rounded-[18px] bg-green p-5">
              <span className="font-serif text-[40px] leading-none text-cream">
                94%
              </span>
              <span className="mt-[6px] text-[13px] leading-[1.4] text-sage-light">
                of clients stay with their first match
              </span>
            </div>
            <div className="flex aspect-square flex-col justify-center rounded-[18px] bg-tan p-5">
              <span className="font-serif text-[40px] leading-none text-[#3A3322]">
                82%
              </span>
              <span className="mt-[6px] text-[13px] leading-[1.4] text-[#5C5232]">
                of carer applicants don&rsquo;t pass our checks
              </span>
            </div>
            <div
              className={`flex aspect-square items-end rounded-[18px] ${HATCH_12} p-[14px]`}
            >
              <span className="font-mono text-[11px] text-faint">
                candid moment
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-[1200px] px-7 py-[60px]">
        <div className="mb-[42px] flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[560px]">
            <Eyebrow>Our care</Eyebrow>
            <h2 className="mt-[14px] font-serif text-[34px] font-normal leading-[1.12] tracking-[-0.01em] text-ink sm:text-[42px]">
              Whatever care looks like for you
            </h2>
          </div>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-green"
          >
            See how it works →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard title="Live-in care">
            Round-the-clock support from a carer who lives with you, so home
            stays home.
          </ServiceCard>
          <ServiceCard title="Dementia care">
            Patient, familiar faces who bring calm, routine and dignity to
            every day.
          </ServiceCard>
          <ServiceCard title="Specialist nursing">
            Registered nurses for complex, clinical and palliative needs at
            home.
          </ServiceCard>
          <ServiceCard title="Companionship">
            A friendly visitor for conversation, outings and the small things
            that matter.
          </ServiceCard>
          <ServiceCard title="Respite care">
            Trusted cover when family carers need a well-earned break, planned
            or urgent.
          </ServiceCard>
          <a
            href="#contact"
            className="flex min-h-[222px] flex-col justify-between rounded-[20px] bg-ink p-6 text-cream transition-colors hover:bg-ink-deep"
          >
            <span className="font-serif text-2xl font-normal leading-[1.2]">
              Not sure which care you need?
            </span>
            <span className="text-[14.5px] leading-[1.55] text-sage">
              Speak to our team for a free, no-obligation chat. We&rsquo;ll
              help you work it out.
              <br />
              <br />
              <strong className="font-semibold text-tan">Talk to us →</strong>
            </span>
          </a>
        </div>
      </section>

      {/* DUAL AUDIENCE */}
      <section className="mx-auto max-w-[1200px] px-7 py-[70px]">
        <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
          <div className="rounded-3xl bg-green p-8 text-cream sm:p-[46px]">
            <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-tan">
              For families
            </span>
            <h3 className="my-[14px] font-serif text-[30px] font-normal leading-[1.15]">
              Finding care for someone you love
            </h3>
            <p className="mb-[26px] text-[15.5px] leading-[1.6] text-sage-light">
              Create a free account, tell us about the person you care for, and
              search vetted carers who fit. You stay in control, every step.
            </p>
            <Link
              href="/signup"
              className="inline-block rounded-[30px] bg-cream px-6 py-[13px] text-[15px] font-semibold text-ink transition-colors hover:bg-white"
            >
              Find a carer →
            </Link>
          </div>
          <div className="rounded-3xl bg-sand p-8 text-ink sm:p-[46px]">
            <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-green">
              For carers &amp; nurses
            </span>
            <h3 className="my-[14px] font-serif text-[30px] font-normal leading-[1.15]">
              Build a career on your terms
            </h3>
            <p className="mb-[26px] text-[15.5px] leading-[1.6] text-body">
              Choose your clients, set your rates and work flexibly. No
              joining fees, and you keep 85% of the rate you set, paid quickly
              after every visit. Agencies typically keep half.
            </p>
            <Link
              href="/join"
              className="inline-block rounded-[30px] bg-green px-6 py-[13px] text-[15px] font-semibold text-cream transition-colors hover:bg-green-dark"
            >
              Join as a carer →
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="mx-auto max-w-[1200px] px-7 pb-[70px] pt-[50px]">
        <div className="mx-auto max-w-[880px] text-center">
          <div className="h-[30px] font-serif text-[64px] leading-[0.5] text-tan">
            &ldquo;
          </div>
          <p className="mb-7 font-serif text-2xl font-light leading-[1.34] tracking-[-0.01em] text-ink sm:text-[30px]">
            We found Mum a carer who&rsquo;d grown up in the same part of
            Ireland. Within a week they were singing the old songs together. It
            stopped feeling like &lsquo;care&rsquo; and started feeling like
            family.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="h-[42px] w-[42px] rounded-full bg-[repeating-linear-gradient(135deg,#E4D7C3_0_8px,#EADFCD_8px_16px)]" />
            <div className="text-left">
              <div className="text-[15px] font-bold">Sarah M.</div>
              <div className="text-sm text-[#7A8780]">
                Daughter · Manchester
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-hairline bg-card">
        <div className="mx-auto max-w-[880px] px-7 py-[72px]">
          <h2 className="mb-[14px] text-center font-serif text-[32px] font-normal tracking-[-0.01em] text-ink sm:text-[38px]">
            Questions, answered honestly
          </h2>
          <p className="mb-[42px] text-center text-base text-muted">
            Transparency is how trust starts. Here&rsquo;s the plain truth.
          </p>
          <div className="flex flex-col gap-3">
            <FaqItem
              defaultOpen
              question="Are your carers properly checked?"
              answer={`Yes. Every carer completes enhanced DBS, identity and right-to-work checks, reference verification and a face-to-face interview before their profile goes live. We reject around 82% of applicants. Only the best join ${brand.name}.`}
            />
            <FaqItem
              question={`How is ${brand.name} different from a managed care agency?`}
              answer={`We’re a marketplace of vetted, self-employed carers. You browse full profiles for free, meet the people who stand out for free, and book the one who fits. Your carer works with you directly while bookings and payments run securely through the platform, so you stay in control, build a real relationship, and typically save 30% or more compared with a managed agency.`}
            />
            <FaqItem
              question="What does it cost, and are there hidden fees?"
              answer={`No hidden fees. Creating an account, browsing full profiles and meet & greets are all free. You only pay when you book care: your carer’s hourly rate plus a ${COMMISSION.clientPct}% platform fee, paid securely by card. So a carer whose rate is ${formatGBP(exampleRate)}/hr costs ${formatGBP(example.totalAmount)}/hr all-in, and they keep ${formatGBP(example.carerNetAmount)} of it. No joining fees, no subscriptions, no unlock fees, and you can cancel flexibly.`}
            />
            <FaqItem
              question="What does ‘matched on what matters’ actually mean?"
              answer="Full profiles go beyond qualifications to personality, shared interests, hobbies, language and culture, alongside references, verification status and a video introduction. Choosing someone who shares your loved one’s background or passions builds trust faster, which is why 94% of our clients stay with their first match."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="mx-auto max-w-[1200px] px-7 py-[84px]">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-7 py-12 text-center sm:px-[54px] sm:py-16">
          <div className="absolute -right-10 -top-[60px] h-[220px] w-[220px] rounded-full bg-[rgba(201,184,154,0.16)]" />
          <div className="absolute -bottom-20 -left-[30px] h-[200px] w-[200px] rounded-full bg-[rgba(63,94,84,0.5)]" />
          <div className="relative">
            <h2 className="mb-[18px] font-serif text-[34px] font-normal leading-[1.1] tracking-[-0.01em] text-cream sm:text-[44px]">
              Let&rsquo;s find the right person
            </h2>
            <p className="mx-auto mb-[34px] max-w-[520px] text-[17px] leading-[1.6] text-sage">
              Create a free account and start searching vetted carer and nurse
              profiles today. No pressure, no obligation, and our team a phone
              call away.
            </p>
            <div className="flex flex-wrap justify-center gap-[14px]">
              <Link
                href="/signup"
                className="rounded-[32px] bg-tan px-8 py-4 text-base font-bold text-[#2A2517] transition-colors hover:bg-[#d4c4a8]"
              >
                Find a carer
              </Link>
              <a
                href={brand.phoneHref}
                className="rounded-[32px] border-[1.5px] border-[rgba(244,239,232,0.3)] bg-transparent px-[30px] py-4 text-base font-semibold text-cream transition-colors hover:border-cream"
              >
                Call {brand.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
