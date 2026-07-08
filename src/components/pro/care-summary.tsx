import type { ReactNode } from "react";
import {
  AGE_BANDS,
  CARE_FOR_OPTIONS,
  CARE_NEEDS,
  INTEREST_CHIPS,
  PERSONALITY_OPTIONS,
  SCHEDULE_OPTIONS,
  chipLabel,
} from "@/lib/matching";
import type { Database } from "@/lib/supabase/database.types";

type CareProfileRow = Database["public"]["Tables"]["care_profiles"]["Row"];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <span className="sm:w-36 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-faint pt-0.5">
        {label}
      </span>
      <span className="text-[14px] text-body">{children}</span>
    </div>
  );
}

/**
 * Expandable "About the person" block, shown to professionals who are engaged
 * with a client (interview or booking). RLS decides who can read the profile;
 * this component only renders what it's given.
 */
export function CareSummary({ profile }: { profile: CareProfileRow }) {
  const liveIn = profile.schedule.includes("live_in");
  const home = [
    profile.has_pets ? "Pets at home" : null,
    profile.smoking_household ? "Someone smokes in the home" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <details className="mt-4 rounded-xl border border-hairline bg-sand/40">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[14px] font-semibold text-ink">
        About the person
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-2.5">
        <Row label="The care is for">
          {chipLabel(CARE_FOR_OPTIONS, profile.care_for)}
          {profile.age_band
            ? `, ${chipLabel(AGE_BANDS, profile.age_band).toLowerCase()}`
            : ""}
        </Row>
        {profile.care_needs.length > 0 && (
          <Row label="Support needed">
            {profile.care_needs
              .map((n) => chipLabel(CARE_NEEDS, n))
              .join(" · ")}
          </Row>
        )}
        {profile.schedule.length > 0 && (
          <Row label="When">
            {profile.schedule
              .map((s) => chipLabel(SCHEDULE_OPTIONS, s))
              .join(", ")}
          </Row>
        )}
        {liveIn && (
          <Row label="Live-in home">
            {profile.live_in_room
              ? "Spare room confirmed"
              : "Spare room not confirmed"}
            {" · "}
            {profile.live_in_bathroom
              ? "bathroom access confirmed"
              : "bathroom access not confirmed"}
          </Row>
        )}
        {profile.languages.length > 0 && (
          <Row label="Languages at home">{profile.languages.join(", ")}</Row>
        )}
        {profile.interests.length > 0 && (
          <Row label="Enjoys">
            {profile.interests
              .map((i) => chipLabel(INTEREST_CHIPS, i))
              .join(", ")}
          </Row>
        )}
        <Row label="Company that suits">
          {chipLabel(PERSONALITY_OPTIONS, profile.personality_preference)}
        </Row>
        {home && <Row label="The home">{home}</Row>}
        {profile.notes && (
          <Row label="In their words">&ldquo;{profile.notes}&rdquo;</Row>
        )}
      </div>
    </details>
  );
}
