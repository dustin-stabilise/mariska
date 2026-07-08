import { brand } from "@/lib/brand";

export const metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-[760px] px-7 py-20">
      <h1 className="mb-4 font-serif text-4xl text-ink">Terms &amp; conditions</h1>
      <p className="mb-4 text-body">
        Our full terms of use for clients and care professionals are being
        finalised with our legal advisers and will be published here before
        launch. The version you accept at sign-up is recorded against your
        account, and we will notify you whenever these terms change.
      </p>
      <p className="text-body">
        In the meantime, the essentials: {brand.name} {brand.regulationNote}
      </p>
    </section>
  );
}
