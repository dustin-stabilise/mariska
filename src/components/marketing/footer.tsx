import Link from "next/link";
import { brand } from "@/lib/brand";

const careLinks = [
  "Live-in care",
  "Dementia care",
  "Specialist nursing",
  "Companionship",
  "Respite care",
];

const companyLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/for-carers", label: "For carers & nurses" },
  { href: "/#trust", label: `Why ${brand.name}` },
  { href: "/#contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-[rgba(36,53,48,0.1)]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-9 px-7 pb-[30px] pt-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="mb-4 flex items-center gap-[11px]">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-green">
              <span className="block h-3 w-3 rotate-45 rounded-[50%_50%_50%_0] border-2 border-cream" />
            </span>
            <span className="font-serif text-[22px] font-medium">
              {brand.name}
            </span>
          </Link>
          <p className="max-w-[300px] text-sm leading-[1.6] text-muted">
            {brand.description}
          </p>
        </div>
        <div>
          <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[0.04em] text-faint">
            Care
          </div>
          <div className="flex flex-col gap-[9px] text-[14.5px] text-body">
            {careLinks.map((label) => (
              <Link
                key={label}
                href="/#services"
                className="transition-colors hover:text-green"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[0.04em] text-faint">
            Company
          </div>
          <div className="flex flex-col gap-[9px] text-[14.5px] text-body">
            {companyLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-green"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-[14px] text-[13px] font-bold uppercase tracking-[0.04em] text-faint">
            Get in touch
          </div>
          <div className="flex flex-col gap-[9px] text-[14.5px] text-body">
            <a href={brand.phoneHref} className="font-semibold text-green">
              {brand.phone}
            </a>
            <a
              href={`mailto:${brand.email}`}
              className="transition-colors hover:text-green"
            >
              {brand.email}
            </a>
            <span>Mon–Fri, 8am–8pm</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-7 pb-10">
        <div className="mb-[22px] rounded-[14px] bg-sand px-[22px] py-[18px] text-[12.5px] leading-[1.6] text-[#6E6450]">
          <strong className="text-[#5A5239]">A note on regulation:</strong>{" "}
          {brand.name} {brand.regulationNote}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-[14px] text-[13px] text-faint">
          <span>
            © {new Date().getFullYear()} {brand.legalName}. All rights
            reserved.
          </span>
          <div className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-green">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-green">
              Terms
            </Link>
            <Link href="/safeguarding" className="transition-colors hover:text-green">
              Safeguarding
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
