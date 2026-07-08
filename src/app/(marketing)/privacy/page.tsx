import { brand } from "@/lib/brand";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-[760px] px-7 py-20">
      <h1 className="mb-4 font-serif text-4xl text-ink">Privacy policy</h1>
      <p className="mb-4 text-body">
        Our full privacy policy is being finalised and will be published here
        before launch. The principles it will formalise are already how{" "}
        {brand.name} works: we collect only what the service needs, care
        profiles are never shown publicly, compliance documents live in a
        private vault visible only to you and our vetting team, and we never
        sell personal data.
      </p>
      <p className="text-body">
        To ask about your data in the meantime, contact {brand.email}.
      </p>
    </section>
  );
}
