import { LANGUAGES } from "@/lib/matching";

/**
 * Shared helpers for the language multi-select + "Other" free-text pattern
 * used on both the care profile and the professional profile, plus the
 * search-radius vocabulary.
 */

export const RADIUS_MILES_OPTIONS = [5, 10, 15, 25, 50] as const;

export function isRadiusOption(value: number): boolean {
  return (RADIUS_MILES_OPTIONS as readonly number[]).includes(value);
}

/** Split saved languages into vocabulary picks and free-text "Other" values. */
export function splitLanguages(saved: string[]): {
  picked: string[];
  other: string;
} {
  const canonical = new Map(LANGUAGES.map((l) => [l.toLowerCase(), l]));
  const picked: string[] = [];
  const other: string[] = [];
  for (const lang of saved) {
    const match = canonical.get(lang.trim().toLowerCase());
    if (match) {
      if (!picked.includes(match)) picked.push(match);
    } else if (lang.trim()) {
      other.push(lang.trim());
    }
  }
  return { picked, other: other.join(", ") };
}

/** Combine checkbox picks + the "Other" comma-separated field, deduped and capped. */
export function combineLanguages(
  picks: FormDataEntryValue[],
  otherRaw: FormDataEntryValue | null
): string[] {
  const canonical = new Set<string>(LANGUAGES);
  const result = [
    ...new Set(
      picks.filter((v): v is string => typeof v === "string" && canonical.has(v))
    ),
  ];
  const extras = (typeof otherRaw === "string" ? otherRaw : "")
    .split(",")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean);
  const seen = new Set(result.map((l) => l.toLowerCase()));
  for (const extra of extras) {
    if (!seen.has(extra.toLowerCase())) {
      seen.add(extra.toLowerCase());
      result.push(extra);
    }
  }
  return result.slice(0, 10);
}
