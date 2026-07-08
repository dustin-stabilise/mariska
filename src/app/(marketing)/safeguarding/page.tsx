import { brand } from "@/lib/brand";

export const metadata = { title: "Safeguarding" };

export default function SafeguardingPage() {
  return (
    <section className="mx-auto max-w-[760px] px-7 py-20">
      <h1 className="mb-4 font-serif text-4xl text-ink">Safeguarding</h1>
      <p className="mb-4 text-body">
        Every professional on {brand.name} passes enhanced DBS, identity,
        right-to-work, reference and training checks before their profile goes
        live, and compliance is monitored continuously: lapsed documents remove
        a profile from search automatically.
      </p>
      <p className="mb-4 text-body">
        If you have a concern about anyone introduced through {brand.name},
        contact us straight away at {brand.email} or {brand.phone}. Concerns
        are logged, reviewed by our team, and escalated to the appropriate
        authorities where necessary. If someone is in immediate danger, call
        999 first.
      </p>
      <p className="text-body">
        Our full safeguarding policy will be published here before launch.
      </p>
    </section>
  );
}
