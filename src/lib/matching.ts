/**
 * Matching vocabularies + scoring (DR-0001 era questionnaire feature).
 *
 * Both sides of the marketplace pick from these shared lists, which is what
 * makes overlap computable. The vocabularies live here (not in DB enums) so
 * adding a chip is a code change, not a migration.
 *
 * Scoring is deliberately transparent: a weighted overlap that produces
 * human-readable reasons. Matches are shown as a badge plus reasons, never a
 * percentage. An explicit carer-gender-preference mismatch excludes the card
 * from results (families expect the preference respected); carers who have
 * not stated a gender are never excluded.
 */

export const INTEREST_CHIPS = [
  { value: "gardening", label: "Gardening" },
  { value: "music", label: "Music & singing" },
  { value: "faith", label: "Faith & church" },
  { value: "football", label: "Football & sport" },
  { value: "cooking", label: "Cooking & baking" },
  { value: "old_films", label: "Old films & telly" },
  { value: "books", label: "Books & reading" },
  { value: "crafts", label: "Knitting & crafts" },
  { value: "walking", label: "Walks & fresh air" },
  { value: "history", label: "History & heritage" },
  { value: "cards_games", label: "Cards & board games" },
  { value: "animals", label: "Animals & pets" },
  { value: "dancing", label: "Dancing" },
  { value: "puzzles", label: "Puzzles & crosswords" },
  { value: "travel_stories", label: "Travel stories" },
  { value: "current_affairs", label: "News & current affairs" },
] as const;

export const CARE_NEEDS = [
  { value: "companionship", label: "Companionship & conversation" },
  { value: "personal_care", label: "Personal care (washing, dressing)" },
  { value: "mobility", label: "Help moving around" },
  { value: "memory_support", label: "Memory support (gentle help with forgetfulness and routines)" },
  { value: "medication_prompts", label: "Medication prompts (reminders to take them)" },
  { value: "medication_support", label: "Medication support (help taking them)" },
  { value: "meals", label: "Meals & cooking" },
  { value: "household", label: "Light housework" },
  { value: "running_affairs", label: "Running affairs & errands (post, bills, shopping)" },
  { value: "appointments_outings", label: "Accompanying to appointments & outings" },
  { value: "needs_driver", label: "A carer who drives" },
  { value: "overnight", label: "Overnight presence" },
  { value: "complex", label: "Complex or clinical needs" },
  { value: "end_of_life", label: "End-of-life care" },
] as const;

/** Not offered yet (product-owner decision 2026-07-08): shown greyed out. */
export const DISABLED_CARE_NEEDS = ["complex", "end_of_life"];
export const DISABLED_CARE_CATEGORIES = [
  "complex",
  "end_of_life",
  "mental_health_nurse",
  "learning_disability_nurse",
];

/** ~20 most spoken languages in UK households + Other free entry in UIs. */
export const LANGUAGES = [
  "English", "Welsh", "Polish", "Punjabi", "Urdu", "Bengali", "Gujarati",
  "Arabic", "French", "Portuguese", "Spanish", "Romanian", "Italian",
  "Somali", "Turkish", "Tamil", "Cantonese", "Mandarin", "Hindi", "Lithuanian",
];

export const SCHEDULE_OPTIONS = [
  { value: "mornings", label: "Mornings" },
  { value: "daytime", label: "Daytime" },
  { value: "evenings", label: "Evenings" },
  { value: "overnight", label: "Overnight" },
  { value: "weekends", label: "Weekends" },
  { value: "live_in", label: "Live-in" },
] as const;

export const CARE_FOR_OPTIONS = [
  { value: "parent", label: "My parent" },
  { value: "partner", label: "My partner" },
  { value: "relative", label: "Another relative" },
  { value: "friend", label: "A friend or neighbour" },
  { value: "self", label: "Myself" },
  { value: "other", label: "Someone else" },
] as const;

export const AGE_BANDS = [
  { value: "under_65", label: "Under 65" },
  { value: "65_74", label: "65 to 74" },
  { value: "75_84", label: "75 to 84" },
  { value: "85_plus", label: "85 and over" },
] as const;

export const PERSONALITY_OPTIONS = [
  { value: "calm_quiet", label: "Calm and quietly reassuring" },
  { value: "warm_chatty", label: "Warm and chatty" },
  { value: "no_preference", label: "No preference" },
] as const;

export const CARER_PERSONALITY_OPTIONS = [
  { value: "calm_quiet", label: "Calm and quietly reassuring" },
  { value: "warm_chatty", label: "Warm and chatty" },
  { value: "adaptable", label: "I adapt to the person" },
] as const;

export const GENDER_PREFERENCE_OPTIONS = [
  { value: "no_preference", label: "No preference" },
  { value: "female", label: "A female carer" },
  { value: "male", label: "A male carer" },
] as const;

export const COMFORTABLE_WITH_OPTIONS = [
  { value: "pets", label: "Homes with pets" },
  { value: "smoking_household", label: "Smoking households" },
] as const;

export function chipLabel(
  list: readonly { value: string; label: string }[],
  value: string
): string {
  return list.find((c) => c.value === value)?.label ?? value;
}

/** Maps a client's stated needs to the carer categories that serve them. */
const NEED_TO_CATEGORIES: Record<string, string[]> = {
  companionship: ["companionship", "day"],
  personal_care: ["day", "live_in"],
  mobility: ["day", "live_in"],
  memory_support: ["dementia", "dementia_nurse"],
  medication: ["day", "complex", "general_nurse", "community_nurse"],
  medication_prompts: ["day", "companionship", "live_in"],
  medication_support: ["day", "complex", "general_nurse", "community_nurse"],
  running_affairs: ["day", "companionship"],
  appointments_outings: ["day", "companionship"],
  meals: ["day", "live_in"],
  household: ["day", "companionship"],
  overnight: ["night"],
  complex: ["complex", "complex_nurse", "general_nurse"],
  end_of_life: ["end_of_life", "palliative_nurse"],
};

/** Maps schedule wishes to the carer availability options that satisfy them. */
const SCHEDULE_TO_AVAILABILITY: Record<string, string[]> = {
  mornings: ["day_shifts", "part_time", "full_time"],
  daytime: ["day_shifts", "part_time", "full_time"],
  evenings: ["part_time", "night_shifts", "full_time"],
  overnight: ["night_shifts", "live_in"],
  weekends: ["weekends"],
  live_in: ["live_in"],
};

export type CareProfileForMatching = {
  latitude?: number | null;
  longitude?: number | null;
  radius_miles?: number | null;
  care_needs: string[];
  schedule: string[];
  languages: string[];
  interests: string[];
  personality_preference: string;
  carer_gender_preference: string;
  has_pets: boolean;
  smoking_household: boolean;
};

export type CardForMatching = {
  latitude?: number | null;
  longitude?: number | null;
  can_drive?: boolean | null;
  cooking_skill?: string | null;
  care_categories: string[];
  availability_options: string[];
  languages: string[] | null;
  interests: string[] | null;
  gender: string | null;
  personality_style: string | null;
  comfortable_with: string[] | null;
};

export type MatchResult = {
  /** null = excluded (explicit gender-preference mismatch) */
  score: number | null;
  badge: "great" | "good" | null;
  reasons: string[];
};

/** Great-circle distance in miles (client-safe, pure math). */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function computeMatch(
  profile: CareProfileForMatching,
  card: CardForMatching
): MatchResult {
  // Hard filter: explicit gender preference vs explicitly stated gender.
  if (
    profile.carer_gender_preference !== "no_preference" &&
    card.gender &&
    card.gender !== profile.carer_gender_preference
  ) {
    return { score: null, badge: null, reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  // Distance (live-in exempt: those carers relocate). Beyond the client's
  // radius -> excluded entirely; otherwise closer scores higher.
  const wantsLiveIn = profile.schedule.includes("live_in");
  if (
    !wantsLiveIn &&
    profile.latitude != null && profile.longitude != null &&
    card.latitude != null && card.longitude != null
  ) {
    const miles = distanceMiles(profile.latitude, profile.longitude, card.latitude, card.longitude);
    const radius = profile.radius_miles ?? 15;
    if (miles > radius) {
      return { score: null, badge: null, reasons: [] };
    }
    if (miles <= 5) {
      score += 12;
      reasons.push(miles < 1.5 ? "Less than 2 miles away" : `About ${Math.round(miles)} miles away`);
    } else if (miles <= 10) {
      score += 8;
      reasons.push(`About ${Math.round(miles)} miles away`);
    } else {
      score += 4;
    }
  }

  // Shared language (strongest signal for connection).
  const cardLangs = (card.languages ?? []).map((l) => l.toLowerCase());
  const sharedLangs = profile.languages.filter((l) =>
    cardLangs.includes(l.toLowerCase())
  );
  // English is near-universal; only call out non-English shared languages.
  const notableLangs = sharedLangs.filter((l) => l.toLowerCase() !== "english");
  if (notableLangs.length > 0) {
    score += 30;
    reasons.push(`Speaks ${notableLangs[0][0].toUpperCase()}${notableLangs[0].slice(1)}`);
  }

  // Care-need fit against the carer's categories.
  const categories = card.care_categories ?? [];
  const categoryNeeds = profile.care_needs.filter((n) => n !== "needs_driver");
  const coveredNeeds = categoryNeeds.filter((need) =>
    (NEED_TO_CATEGORIES[need] ?? []).some((c) => categories.includes(c))
  );
  if (categoryNeeds.length > 0 && coveredNeeds.length > 0) {
    const coverage = coveredNeeds.length / categoryNeeds.length;
    score += Math.round(25 * coverage);
    const headline = coveredNeeds.find((n) =>
      ["memory_support", "end_of_life", "complex"].includes(n)
    );
    if (headline) {
      reasons.push(`Experienced with ${chipLabel(CARE_NEEDS, headline).toLowerCase()}`);
    } else if (coverage === 1) {
      reasons.push("Covers all the support you need");
    }
  }

  // Schedule overlap.
  const availability = card.availability_options ?? [];
  const scheduleHits = profile.schedule.filter((s) =>
    (SCHEDULE_TO_AVAILABILITY[s] ?? []).some((a) => availability.includes(a))
  );
  if (profile.schedule.length > 0 && scheduleHits.length > 0) {
    score += Math.round(15 * (scheduleHits.length / profile.schedule.length));
    if (scheduleHits.includes("live_in")) reasons.push("Available for live-in care");
    else if (scheduleHits.includes("overnight")) reasons.push("Available overnight");
  }

  // Gender preference satisfied by an explicit match.
  if (
    profile.carer_gender_preference !== "no_preference" &&
    card.gender === profile.carer_gender_preference
  ) {
    score += 10;
    reasons.push(card.gender === "female" ? "A female carer, as you asked" : "A male carer, as you asked");
  }

  // Personality fit.
  if (
    profile.personality_preference !== "no_preference" &&
    card.personality_style &&
    (card.personality_style === profile.personality_preference ||
      card.personality_style === "adaptable")
  ) {
    score += 8;
    reasons.push(
      card.personality_style === "adaptable"
        ? "Adapts to the person they care for"
        : profile.personality_preference === "calm_quiet"
          ? "A calm, reassuring presence"
          : "Warm and chatty company"
    );
  }

  // Shared interests (the human layer; cap at three).
  const cardInterests = card.interests ?? [];
  const sharedInterests = profile.interests.filter((i) => cardInterests.includes(i));
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length, 3) * 6;
    for (const interest of sharedInterests.slice(0, 2)) {
      reasons.push(`You both enjoy ${chipLabel(INTEREST_CHIPS, interest).toLowerCase()}`);
    }
  }

  // Driver requirement.
  if (profile.care_needs.includes("needs_driver") && card.can_drive) {
    score += 8;
    reasons.push("Drives, for appointments and outings");
  }

  // Cooking, when meals are part of the care.
  if (
    profile.care_needs.includes("meals") &&
    (card.cooking_skill === "good" || card.cooking_skill === "very_good")
  ) {
    score += 4;
    reasons.push(card.cooking_skill === "very_good" ? "A great cook" : "A confident cook");
  }

  // Home compatibility.
  const comfortable = card.comfortable_with ?? [];
  if (profile.has_pets && comfortable.includes("pets")) {
    score += 5;
    reasons.push("Happy around pets");
  }
  if (profile.smoking_household && comfortable.includes("smoking_household")) {
    score += 5;
  }

  const badge = score >= 60 ? "great" : score >= 35 ? "good" : null;
  return { score, badge, reasons: reasons.slice(0, 3) };
}
