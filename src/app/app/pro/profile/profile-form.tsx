"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import {
  saveProfessionalProfile,
  type ProActionState,
} from "@/lib/actions/professional";
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_STATUSES,
  careCategoriesFor,
  type AvailabilityOption,
  type AvailabilityStatus,
  type CareCategory,
  type ProfessionalKind,
} from "@/lib/professional-constants";
import {
  CARER_PERSONALITY_OPTIONS,
  COMFORTABLE_WITH_OPTIONS,
  INTEREST_CHIPS,
} from "@/lib/matching";
import { Button, Card } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-hairline-strong bg-cream px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-green";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold uppercase tracking-wide text-faint mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[13px] text-muted mt-1">{hint}</span>}
    </label>
  );
}

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">{title}</h2>
      {intro && <p className="text-[14px] text-muted mt-1">{intro}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </Card>
  );
}

export function ProfileForm({
  pro,
  contact,
}: {
  pro: {
    kind: ProfessionalKind;
    headline: string;
    bio: string;
    location: string;
    region: string;
    years_experience: number;
    care_categories: CareCategory[];
    availability_status: AvailabilityStatus;
    availability_options: AvailabilityOption[];
    hourly_rate_min: number | null;
    hourly_rate_max: number | null;
    languages: string[];
    interests: string[];
    gender: string | null;
    personality_style: string | null;
    comfortable_with: string[];
    photo_url: string | null;
    intro_video_url: string | null;
    nmc_pin: string | null;
    can_drive: boolean;
  };
  contact: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState<ProActionState, FormData>(
    saveProfessionalProfile,
    {}
  );
  const categories = careCategoriesFor(pro.kind);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.success && (
        <div className="rounded-xl bg-green/10 text-green px-4 py-3 text-[15px] font-medium">
          {state.success}
        </div>
      )}
      {state.error && (
        <div className="rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[15px] font-medium">
          {state.error}
        </div>
      )}

      <Section title="About you">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="First name">
            <input
              name="first_name"
              defaultValue={contact.first_name}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Last name">
            <input
              name="last_name"
              defaultValue={contact.last_name}
              className={inputClass}
              required
            />
          </Field>
        </div>
        <Field label="Phone" hint="Only shared by the agency, never shown publicly.">
          <input
            name="phone"
            type="tel"
            defaultValue={contact.phone ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="Headline"
          hint='One warm sentence, e.g. "Live-in carer with 10 years of dementia experience".'
        >
          <input
            name="headline"
            defaultValue={pro.headline}
            maxLength={120}
            className={inputClass}
          />
        </Field>
        <Field label="Bio">
          <textarea
            name="bio"
            defaultValue={pro.bio}
            rows={6}
            className={inputClass}
            placeholder="Tell families about your experience, approach and what makes you a good match."
          />
        </Field>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Location" hint="Town or city.">
            <input name="location" defaultValue={pro.location} className={inputClass} />
          </Field>
          <Field label="Region" hint="e.g. South East.">
            <input name="region" defaultValue={pro.region} className={inputClass} />
          </Field>
          <Field label="Years of experience">
            <input
              name="years_experience"
              type="number"
              min={0}
              max={60}
              defaultValue={pro.years_experience}
              className={inputClass}
            />
          </Field>
        </div>
        {pro.kind === "nurse" && (
          <Field label="NMC PIN" hint="We verify this against your NMC registration document.">
            <input name="nmc_pin" defaultValue={pro.nmc_pin ?? ""} className={inputClass} />
          </Field>
        )}
      </Section>

      <Section
        title={pro.kind === "nurse" ? "Nursing specialisms" : "Types of care"}
        intro="Tick everything you're qualified and happy to take on."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {categories.map((cat) => (
            <label
              key={cat.value}
              className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
            >
              <input
                type="checkbox"
                name="care_categories"
                value={cat.value}
                defaultChecked={pro.care_categories.includes(cat.value)}
                className="accent-green w-4 h-4"
              />
              {cat.label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Availability">
        <Field label="Current status">
          <div className="grid sm:grid-cols-3 gap-2.5">
            {AVAILABILITY_STATUSES.map((s) => (
              <label
                key={s.value}
                className="flex items-start gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
              >
                <input
                  type="radio"
                  name="availability_status"
                  value={s.value}
                  defaultChecked={pro.availability_status === s.value}
                  className="accent-green w-4 h-4 mt-0.5"
                />
                <span>
                  <span className="block text-[14.5px] font-medium text-ink">
                    {s.label}
                  </span>
                  <span className="block text-[12.5px] text-muted">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Working patterns">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
              >
                <input
                  type="checkbox"
                  name="availability_options"
                  value={opt.value}
                  defaultChecked={pro.availability_options.includes(opt.value)}
                  className="accent-green w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Rates & extras">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Hourly rate from (£)">
            <input
              name="hourly_rate_min"
              type="number"
              min={0}
              step="0.50"
              defaultValue={
                pro.hourly_rate_min !== null ? pro.hourly_rate_min / 100 : ""
              }
              className={inputClass}
              placeholder="e.g. 16"
            />
          </Field>
          <Field label="Hourly rate to (£)">
            <input
              name="hourly_rate_max"
              type="number"
              min={0}
              step="0.50"
              defaultValue={
                pro.hourly_rate_max !== null ? pro.hourly_rate_max / 100 : ""
              }
              className={inputClass}
              placeholder="e.g. 22"
            />
          </Field>
        </div>
        <Field label="Languages" hint="Comma-separated, e.g. English, Polish.">
          <input
            name="languages"
            defaultValue={pro.languages.join(", ")}
            className={inputClass}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Photo URL">
            <input
              name="photo_url"
              type="url"
              defaultValue={pro.photo_url ?? ""}
              className={inputClass}
              placeholder="https://…"
            />
          </Field>
          <Field label="Intro video URL" hint="A short hello goes a long way with families.">
            <input
              name="intro_video_url"
              type="url"
              defaultValue={pro.intro_video_url ?? ""}
              className={inputClass}
              placeholder="https://…"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Matching"
        intro="These help us introduce you to clients you'll genuinely get on with"
      >
        <Field label="Interests" hint="Tick anything you'd happily chat about or do together.">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {INTEREST_CHIPS.map((chip) => (
              <label
                key={chip.value}
                className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
              >
                <input
                  type="checkbox"
                  name="interests"
                  value={chip.value}
                  defaultChecked={pro.interests.includes(chip.value)}
                  className="accent-green w-4 h-4"
                />
                {chip.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="How would clients describe you?">
          <div className="grid sm:grid-cols-3 gap-2.5">
            {CARER_PERSONALITY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
              >
                <input
                  type="radio"
                  name="personality_style"
                  value={opt.value}
                  defaultChecked={pro.personality_style === opt.value}
                  className="accent-green w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
        <Field
          label="Gender"
          hint="Some families ask for a specific gender for personal care. Leaving this blank never hides you from anyone."
        >
          <select
            name="gender"
            defaultValue={pro.gender ?? ""}
            className={inputClass}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="I'm comfortable in...">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {COMFORTABLE_WITH_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5"
              >
                <input
                  type="checkbox"
                  name="comfortable_with"
                  value={opt.value}
                  defaultChecked={pro.comfortable_with.includes(opt.value)}
                  className="accent-green w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
        <Field
          label="Driving"
          hint="Handy for appointments, errands and days out; some families search for a driver."
        >
          <label className="flex items-center gap-2.5 rounded-xl border border-hairline px-3.5 py-2.5 text-[14.5px] text-body cursor-pointer hover:border-green has-checked:border-green has-checked:bg-green/5 sm:max-w-xs">
            <input
              type="checkbox"
              name="can_drive"
              defaultChecked={pro.can_drive}
              className="accent-green w-4 h-4"
            />
            I can drive
          </label>
        </Field>
      </Section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save profile"}
        </Button>
        {state.success && !isPending && (
          <span className="text-[14px] text-green font-medium">Saved</span>
        )}
      </div>
    </form>
  );
}
