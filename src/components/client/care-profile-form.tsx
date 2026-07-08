"use client";

import { useActionState, useState } from "react";
import {
  saveCareProfile,
  type CareProfileActionState,
} from "@/lib/actions/care-profile";
import {
  AGE_BANDS,
  CARE_FOR_OPTIONS,
  CARE_NEEDS,
  DISABLED_CARE_NEEDS,
  GENDER_PREFERENCE_OPTIONS,
  INTEREST_CHIPS,
  LANGUAGES,
  PERSONALITY_OPTIONS,
  SCHEDULE_OPTIONS,
} from "@/lib/matching";
import { RADIUS_MILES_OPTIONS, splitLanguages } from "@/lib/profile-fields";
import type { Database } from "@/lib/supabase/database.types";
import { Button, Card } from "@/components/ui";

type CareProfileRow = Database["public"]["Tables"]["care_profiles"]["Row"];

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

const labelClass =
  "block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5";

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      {hint && <p className="text-[14px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function ChipCheckbox({
  name,
  value,
  label,
  defaultChecked,
  disabled = false,
  onCheckedChange,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  if (disabled) {
    return (
      <span
        title="Not offered just yet"
        className="inline-flex px-3.5 py-1.5 rounded-full border border-hairline bg-sand/50 text-[14px] text-faint cursor-not-allowed"
      >
        {label}
      </span>
    );
  }
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={
          onCheckedChange
            ? (e) => onCheckedChange(e.target.checked)
            : undefined
        }
        className="peer sr-only"
      />
      <span className="inline-flex px-3.5 py-1.5 rounded-full border border-hairline-strong bg-cream text-[14px] text-body transition-colors peer-checked:bg-green peer-checked:border-green peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-green">
        {label}
      </span>
    </label>
  );
}

export function CareProfileForm({
  profile,
  submitLabel,
}: {
  profile: CareProfileRow | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    CareProfileActionState,
    FormData
  >(saveCareProfile, undefined);
  const [liveIn, setLiveIn] = useState(
    profile?.schedule.includes("live_in") ?? false
  );
  const savedLanguages = splitLanguages(profile?.languages ?? []);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      <Card>
        <SectionHeading
          title="Who the care is for"
          hint="Just enough for carers to picture the person, nothing more."
        />
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="careFor" className={labelClass}>
              The care is for
            </label>
            <select
              id="careFor"
              name="careFor"
              defaultValue={profile?.care_for ?? "parent"}
              className={inputClass}
            >
              {CARE_FOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="recipientFirstName" className={labelClass}>
              Their first name (optional)
            </label>
            <input
              id="recipientFirstName"
              name="recipientFirstName"
              type="text"
              defaultValue={profile?.recipient_first_name ?? ""}
              placeholder="e.g. Margaret"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ageBand" className={labelClass}>
              Their age (optional)
            </label>
            <select
              id="ageBand"
              name="ageBand"
              defaultValue={profile?.age_band ?? ""}
              className={inputClass}
            >
              <option value="">Rather not say</option>
              {AGE_BANDS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Where the care happens"
          hint="We use the postcode to suggest carers nearby. Your full address is never shown."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="postcode" className={labelClass}>
              Postcode
            </label>
            <input
              id="postcode"
              name="postcode"
              type="text"
              defaultValue={profile?.postcode ?? ""}
              placeholder="e.g. M1 1AE"
              autoComplete="postal-code"
              className={inputClass}
            />
            {state?.postcodeError ? (
              <p className="text-[13px] text-red-700 mt-1.5">
                {state.postcodeError}
              </p>
            ) : (
              <p className="text-[13px] text-muted mt-1.5">
                UK postcodes only, e.g. M1 1AE or SW1A 1AA.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="radiusMiles" className={labelClass}>
              How far should carers travel to you?
            </label>
            <select
              id="radiusMiles"
              name="radiusMiles"
              defaultValue={String(profile?.radius_miles ?? 15)}
              className={inputClass}
            >
              {RADIUS_MILES_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  Up to {r} miles
                </option>
              ))}
            </select>
            <p className="text-[13px] text-muted mt-1.5">
              Live-in searches ignore distance, as those carers relocate.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="The support they need"
          hint="Tick anything that would help. You can always change this later."
        />
        <div className="flex flex-wrap gap-2">
          {CARE_NEEDS.map((c) => (
            <ChipCheckbox
              key={c.value}
              name="careNeeds"
              value={c.value}
              label={c.label}
              disabled={DISABLED_CARE_NEEDS.includes(c.value)}
              defaultChecked={profile?.care_needs.includes(c.value) ?? false}
            />
          ))}
        </div>
        <p className="text-[13px] text-faint mt-2">
          Greyed-out options aren&rsquo;t offered just yet.
        </p>
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mt-6 mb-2">
          When would help be most welcome?
        </h3>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_OPTIONS.map((c) => (
            <ChipCheckbox
              key={c.value}
              name="schedule"
              value={c.value}
              label={c.label}
              defaultChecked={profile?.schedule.includes(c.value) ?? false}
              onCheckedChange={
                c.value === "live_in" ? setLiveIn : undefined
              }
            />
          ))}
        </div>
        {liveIn && (
          <div className="mt-4 rounded-xl border border-hairline bg-sand/40 px-4 py-3.5">
            <p className="text-[13.5px] text-muted mb-2.5">
              Live-in carers stay in the home, so before we can match you
              please confirm both of these:
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer">
                <input
                  type="checkbox"
                  name="liveInRoom"
                  defaultChecked={profile?.live_in_room ?? false}
                  className="accent-green h-4 w-4"
                />
                There&rsquo;s a spare room for the carer
              </label>
              <label className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer">
                <input
                  type="checkbox"
                  name="liveInBathroom"
                  defaultChecked={profile?.live_in_bathroom ?? false}
                  className="accent-green h-4 w-4"
                />
                The carer has bathroom access
              </label>
            </div>
          </div>
        )}
        <div className="mt-6">
          <span className={labelClass}>Languages spoken at home</span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <ChipCheckbox
                key={lang}
                name="languages"
                value={lang}
                label={lang}
                defaultChecked={savedLanguages.picked.includes(lang)}
              />
            ))}
          </div>
          <input
            id="otherLanguages"
            name="otherLanguages"
            type="text"
            defaultValue={savedLanguages.other}
            placeholder="Any other languages, separated by commas"
            aria-label="Other languages"
            className={`${inputClass} mt-3`}
          />
          <p className="text-[13px] text-muted mt-1.5">
            A carer who shares a language can make all the difference.
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Their world"
          hint="The small things that make good company: shared interests and the right sort of presence."
        />
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint mb-2">
          Things they enjoy
        </h3>
        <div className="flex flex-wrap gap-2">
          {INTEREST_CHIPS.map((c) => (
            <ChipCheckbox
              key={c.value}
              name="interests"
              value={c.value}
              label={c.label}
              defaultChecked={profile?.interests.includes(c.value) ?? false}
            />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-6 mt-6">
          <fieldset>
            <legend className={labelClass}>
              What kind of company suits them?
            </legend>
            <div className="space-y-2 mt-1">
              {PERSONALITY_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer"
                >
                  <input
                    type="radio"
                    name="personalityPreference"
                    value={o.value}
                    defaultChecked={
                      (profile?.personality_preference ?? "no_preference") ===
                      o.value
                    }
                    className="accent-green h-4 w-4"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelClass}>
              Would they prefer a female or male carer?
            </legend>
            <div className="space-y-2 mt-1">
              {GENDER_PREFERENCE_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer"
                >
                  <input
                    type="radio"
                    name="carerGenderPreference"
                    value={o.value}
                    defaultChecked={
                      (profile?.carer_gender_preference ?? "no_preference") ===
                      o.value
                    }
                    className="accent-green h-4 w-4"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="The home"
          hint="So we only suggest carers comfortable in your home as it is."
        />
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer">
            <input
              type="checkbox"
              name="hasPets"
              defaultChecked={profile?.has_pets ?? false}
              className="accent-green h-4 w-4"
            />
            There are pets at home
          </label>
          <label className="flex items-center gap-2.5 text-[15px] text-body cursor-pointer">
            <input
              type="checkbox"
              name="smokingHousehold"
              defaultChecked={profile?.smoking_household ?? false}
              className="accent-green h-4 w-4"
            />
            Someone smokes in the home
          </label>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Anything else?"
          hint="Routines, dislikes, a favourite subject of conversation: whatever you'd want a carer to know."
        />
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={profile?.notes ?? ""}
          placeholder="In your own words, optional."
          className={inputClass}
        />
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {state?.error && (
          <p className="text-[13.5px] text-red-700 mt-3">{state.error}</p>
        )}
        <p className="text-[13.5px] text-muted mt-4 max-w-xl">
          Why we ask: these answers help us suggest carers who fit, from shared
          languages to shared interests. Every question is optional, you can
          change your answers any time, and nothing here is shown publicly.
        </p>
      </div>
    </form>
  );
}
