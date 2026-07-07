"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  AGE_BANDS,
  CARE_FOR_OPTIONS,
  CARE_NEEDS,
  GENDER_PREFERENCE_OPTIONS,
  INTEREST_CHIPS,
  PERSONALITY_OPTIONS,
  SCHEDULE_OPTIONS,
} from "@/lib/matching";

export type CareProfileActionState = { error?: string } | undefined;

/** Keep only values that exist in the vocabulary; silently drop the rest. */
function knownValues(
  entries: FormDataEntryValue[],
  list: readonly { value: string }[]
): string[] {
  const allowed = new Set(list.map((c) => c.value));
  return [
    ...new Set(
      entries.filter(
        (e): e is string => typeof e === "string" && allowed.has(e)
      )
    ),
  ];
}

/** Single-choice field: vocabulary value or the given fallback. */
function knownValue(
  entry: FormDataEntryValue | null,
  list: readonly { value: string }[],
  fallback: string
): string {
  return typeof entry === "string" && list.some((c) => c.value === entry)
    ? entry
    : fallback;
}

function optionalText(entry: FormDataEntryValue | null, maxLength: number) {
  const text = typeof entry === "string" ? entry.trim().slice(0, maxLength) : "";
  return text || null;
}

export async function saveCareProfile(
  _prev: CareProfileActionState,
  formData: FormData
): Promise<CareProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") {
    return { error: "Only clients can save a care profile" };
  }

  const languages = [
    ...new Set(
      ((formData.get("languages") as string) ?? "")
        .split(",")
        .map((l) => l.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 10)
    ),
  ];

  const { error } = await supabase.from("care_profiles").upsert(
    {
      client_id: user.id,
      care_for: knownValue(formData.get("careFor"), CARE_FOR_OPTIONS, "other"),
      recipient_first_name: optionalText(formData.get("recipientFirstName"), 60),
      age_band:
        knownValue(formData.get("ageBand"), AGE_BANDS, "") || null,
      care_needs: knownValues(formData.getAll("careNeeds"), CARE_NEEDS),
      schedule: knownValues(formData.getAll("schedule"), SCHEDULE_OPTIONS),
      languages,
      interests: knownValues(formData.getAll("interests"), INTEREST_CHIPS),
      personality_preference: knownValue(
        formData.get("personalityPreference"),
        PERSONALITY_OPTIONS,
        "no_preference"
      ),
      carer_gender_preference: knownValue(
        formData.get("carerGenderPreference"),
        GENDER_PREFERENCE_OPTIONS,
        "no_preference"
      ),
      has_pets: formData.get("hasPets") === "on",
      smoking_household: formData.get("smokingHousehold") === "on",
      notes: optionalText(formData.get("notes"), 2000),
    },
    { onConflict: "client_id" }
  );
  if (error) return { error: "We couldn't save your answers. Please try again." };

  revalidatePath("/app", "layout");

  const next = formData.get("next");
  redirect(
    typeof next === "string" && next.startsWith("/app")
      ? next
      : "/app/search?matched=1"
  );
}
