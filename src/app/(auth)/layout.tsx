import Link from "next/link";
import { brand } from "@/lib/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-hairline">
        <div className="max-w-7xl mx-auto px-7 py-4">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-green flex items-center justify-center flex-none">
              <span className="w-3 h-3 border-2 border-cream rounded-[50%_50%_50%_0] rotate-45 block" />
            </span>
            <span className="font-serif text-xl font-medium text-ink">
              {brand.name}
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
