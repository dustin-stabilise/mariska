import Link from "next/link";
import { requireUser, roleHome } from "@/lib/auth-helpers";
import { signOut } from "@/lib/actions/auth";
import { brand } from "@/lib/brand";

const NAV = {
  client: [
    { href: "/app/dashboard", label: "Dashboard" },
    { href: "/app/search", label: "Find care" },
    { href: "/app/bookings", label: "Bookings" },
    { href: "/app/interviews", label: "Interviews" },
  ],
  professional: [
    { href: "/app/pro", label: "Dashboard" },
    { href: "/app/pro/profile", label: "My profile" },
    { href: "/app/pro/bookings", label: "Bookings & earnings" },
    { href: "/app/pro/documents", label: "Documents" },
    { href: "/app/pro/interviews", label: "Interviews" },
    { href: "/app/pro/referrals", label: "Referrals" },
  ],
  admin: [
    { href: "/app/admin", label: "Overview" },
    { href: "/app/admin/professionals", label: "Professionals" },
    { href: "/app/admin/bookings", label: "Bookings" },
    { href: "/app/admin/documents", label: "Document review" },
    { href: "/app/admin/interviews", label: "Interviews" },
    { href: "/app/admin/placements", label: "Placements" },
    { href: "/app/admin/clients", label: "Clients" },
    { href: "/app/admin/flags", label: "Safeguarding" },
  ],
} as const;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  const nav = NAV[profile.role];

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <Link href={roleHome(profile.role)} className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-green flex items-center justify-center flex-none">
              <span className="w-3 h-3 border-2 border-cream rounded-[50%_50%_50%_0] rotate-45 block" />
            </span>
            <span className="font-serif text-xl font-medium text-ink">
              {brand.name}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-[14.5px] font-medium text-body overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-green whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[14px] text-muted">
              {profile.first_name || "Account"}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[14px] font-semibold text-green hover:text-green-dark"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="md:hidden flex gap-4 px-6 pb-3 text-[14px] font-medium text-body overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-green whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
