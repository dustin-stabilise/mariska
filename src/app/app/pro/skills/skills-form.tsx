"use client";

import { useActionState, useState } from "react";
import {
  saveClinicalSkills,
  type ProActionState,
} from "@/lib/actions/professional";
import {
  CLINICAL_SKILLS,
  CLINICAL_SKILL_LEVELS,
} from "@/lib/compliance-requirements";
import { MIN_RATED_SKILLS } from "@/lib/vetting-checklist";
import { Button, Card } from "@/components/ui";

const NOT_APPLICABLE = "na";

const OPTIONS: { value: string; label: string }[] = [
  { value: NOT_APPLICABLE, label: "N/A" },
  { value: "novice", label: "Novice" },
  { value: "competent", label: "Competent" },
  { value: "expert", label: "Expert" },
];

const LEVELS = new Set<string>(CLINICAL_SKILL_LEVELS);

export function SkillsForm({ initial }: { initial: Record<string, string> }) {
  const [levels, setLevels] = useState<Record<string, string>>(() => {
    const clean: Record<string, string> = {};
    for (const skill of CLINICAL_SKILLS) {
      const value = initial[skill.value];
      if (value && LEVELS.has(value)) clean[skill.value] = value;
    }
    return clean;
  });
  const [state, formAction, isPending] = useActionState<ProActionState, FormData>(
    saveClinicalSkills,
    {}
  );

  const rated = Object.keys(levels).length;
  const total = CLINICAL_SKILLS.length;
  const groups = CLINICAL_SKILLS.reduce<
    { group: string; skills: typeof CLINICAL_SKILLS }[]
  >((acc, skill) => {
    const last = acc[acc.length - 1];
    if (last && last.group === skill.group) {
      last.skills.push(skill);
    } else {
      acc.push({ group: skill.group, skills: [skill] });
    }
    return acc;
  }, []);

  function setLevel(skill: string, value: string) {
    setLevels((prev) => {
      const next = { ...prev };
      if (LEVELS.has(value)) {
        next[skill] = value;
      } else {
        delete next[skill];
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {/* Progress */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[15px] font-medium text-ink">
            {rated} of {total} rated
          </span>
          <span
            className={`text-[13.5px] font-semibold ${
              rated >= MIN_RATED_SKILLS ? "text-green" : "text-[#7a6a3d]"
            }`}
          >
            {rated >= MIN_RATED_SKILLS
              ? "Enough for a compliant profile"
              : `At least ${MIN_RATED_SKILLS} required`}
          </span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-sand overflow-hidden">
          <div
            className="h-full rounded-full bg-green transition-all"
            style={{ width: `${Math.round((rated / total) * 100)}%` }}
          />
        </div>
        <p className="text-[13px] text-muted mt-2">
          Choose N/A for anything outside your practice; it simply won&apos;t
          count as rated.
        </p>
      </Card>

      {groups.map(({ group, skills }) => (
        <Card key={group}>
          <h2 className="font-serif text-xl text-ink">{group}</h2>
          <div className="mt-4 space-y-4">
            {skills.map((skill) => {
              const current = levels[skill.value] ?? NOT_APPLICABLE;
              return (
                <div
                  key={skill.value}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <span className="flex-1 text-[14.5px] text-body">
                    {skill.label}
                  </span>
                  <div
                    role="radiogroup"
                    aria-label={skill.label}
                    className="flex rounded-xl border border-hairline overflow-hidden w-full sm:w-auto"
                  >
                    {OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex-1 sm:flex-none sm:w-24 text-center text-[13px] px-2 py-2 cursor-pointer transition-colors border-l border-hairline first:border-l-0 ${
                          current === opt.value
                            ? "bg-green text-cream font-semibold"
                            : "text-muted hover:bg-sand"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`skill_${skill.value}`}
                          value={opt.value}
                          checked={current === opt.value}
                          onChange={() => setLevel(skill.value, opt.value)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {state.error && (
        <p className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[15px] font-medium">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl bg-green/10 text-green px-4 py-3 text-[15px] font-medium">
          {state.success}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save clinical skills"}
      </Button>
    </form>
  );
}
