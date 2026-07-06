"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/lib/brand";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/#services", label: "Our care" },
  { href: "/for-carers", label: "For carers" },
  { href: "/#trust", label: `Why ${brand.name}` },
];

export function Header() {
  const pathname = usePathname();
  const onCarersPage = pathname.startsWith("/for-carers");

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-[rgba(244,239,232,0.96)]">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-7 py-4">
        <Link href="/" className="flex items-center gap-[11px]">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-green">
            <span className="block h-[13px] w-[13px] rotate-45 rounded-[50%_50%_50%_0] border-2 border-cream" />
          </span>
          <span className="font-serif text-2xl font-medium tracking-[-0.01em] text-ink">
            {brand.name}
          </span>
        </Link>
        <div className="hidden items-center gap-[30px] text-[15px] font-medium md:flex">
          {navLinks.map((link) => {
            const active =
              !link.href.includes("#") && pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "font-semibold text-green"
                    : "text-[#3D4A45] transition-colors hover:text-green"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-[18px]">
          <a
            href={brand.phoneHref}
            className="hidden items-center gap-[7px] text-[15px] font-semibold text-green sm:flex"
          >
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-green" />
            {brand.phone}
          </a>
          {onCarersPage ? (
            <Link
              href="/join"
              className="rounded-[30px] bg-green px-5 py-[11px] text-[15px] font-semibold text-cream transition-colors hover:bg-green-dark"
            >
              Join {brand.name}
            </Link>
          ) : (
            <Link
              href="/signup"
              className="rounded-[30px] bg-green px-5 py-[11px] text-[15px] font-semibold text-cream transition-colors hover:bg-green-dark"
            >
              Find care
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
