"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { geocodePostcode } from "@/lib/geocode";
import {
  AGE_BANDS,
  CARE_FOR_OPTIONS,
  CARE_NEEDS,
  DISABLED_CARE_NEEDS,
  GENDER_PREFERENCE_OPTIONS,
  INTEREST_CHIPS,
  PERSONALITY_OPTIONS,
  SCHEDULE_OPTIONS,
} from "@/lib/matching";
import { combineLanguages, isRadiusOption } from "@/lib/profile-fields";

export type CareProfileActionState =
  | { error?: string; postcodeError?: string }
  | undefined;

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

  const languages = combineLanguages(
    formData.getAll("languages"),
    formData.get("otherLanguages")
  );

  // Never persist support types that aren't offered yet, whatever the form sent.
  const careNeeds = knownValues(formData.getAll("careNeeds"), CARE_NEEDS).filter(
    (n) => !DISABLED_CARE_NEEDS.includes(n)
  );
  const schedule = knownValues(formData.getAll("schedule"), SCHEDULE_OPTIONS);

  // Live-in only works when the carer has somewhere to stay.
  const liveInRoom = formData.get("liveInRoom") === "on";
  const liveInBathroom = formData.get("liveInBathroom") === "on";
  if (schedule.includes("live_in") && (!liveInRoom || !liveInBathroom)) {
    return {
      error:
        "For live-in care, please confirm there's a spare room for the carer and that they'll have bathroom access.",
    };
  }

  // Geocode server-side so matching never does it at read time. An empty
  // postcode clears the stored location.
  const postcodeRaw = optionalText(formData.get("postcode"), 12);
  let postcode: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (postcodeRaw) {
    const geo = await geocodePostcode(postcodeRaw);
    if (!geo) {
      return {
        postcodeError:
          "We couldn't find that postcode. Please check it and try again.",
      };
    }
    postcode = geo.postcode;
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const radiusRaw = Number(formData.get("radiusMiles"));
  const radiusMiles = isRadiusOption(radiusRaw) ? radiusRaw : 15;

  const { error } = await supabase.from("care_profiles").upsert(
    {
      client_id: user.id,
      care_for: knownValue(formData.get("careFor"), CARE_FOR_OPTIONS, "other"),
      recipient_first_name: optionalText(formData.get("recipientFirstName"), 60),
      age_band:
        knownValue(formData.get("ageBand"), AGE_BANDS, "") || null,
      care_needs: careNeeds,
      schedule,
      languages,
      postcode,
      latitude,
      longitude,
      radius_miles: radiusMiles,
      live_in_room: liveInRoom,
      live_in_bathroom: liveInBathroom,
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
