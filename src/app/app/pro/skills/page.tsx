import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeading, Card } from "@/components/ui";
import { SkillsForm } from "./skills-form";

export const dynamic = "force-dynamic";

export default async function ProSkillsPage() {
  const { supabase, user } = await requireRole("professional");

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("kind, clinical_skills")
    .eq("id", user.id)
    .single();

  if (!pro || pro.kind !== "nurse") {
    return (
      <div>
        <PageHeading eyebrow="Professional" title="Clinical skills" />
        <Card>
          <p className="text-muted text-[15px]">
            The clinical skills checklist applies to nurses only.
          </p>
          <Link
            href="/app/pro"
            className="inline-block mt-3 text-[15px] font-semibold text-green hover:text-green-dark"
          >
            Back to your dashboard →
          </Link>
        </Card>
      </div>
    );
  }

  const initial =
    pro.clinical_skills &&
    typeof pro.clinical_skills === "object" &&
    !Array.isArray(pro.clinical_skills)
      ? (pro.clinical_skills as Record<string, string>)
      : {};

  return (
    <div>
      <PageHeading
        eyebrow="Professional"
        title="Clinical skills"
        intro="Rate yourself honestly on each skill. Your assessor will go through these with you at your vetting interview, and they help us match you to the right clients."
      />
      <SkillsForm initial={initial} />
    </div>
  );
}
