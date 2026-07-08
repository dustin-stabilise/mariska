"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  CLINICAL_SKILLS,
  CLINICAL_SKILL_LEVELS,
  certificateExpiry,
  certificateType,
} from "@/lib/compliance-requirements";
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_STATUSES,
  DOC_TYPES,
  LIMITED_DAYS,
  REFERRAL_KINDS,
  careCategoriesFor,
  type AvailabilityOption,
  type AvailabilityStatus,
  type CareCategory,
  type DocumentType,
  type ReferralKind,
} from "@/lib/professional-constants";
import { confirmAvailability } from "@/lib/actions/marketplace";
import {
  CARER_PERSONALITY_OPTIONS,
  COMFORTABLE_WITH_OPTIONS,
  DISABLED_CARE_CATEGORIES,
  INTEREST_CHIPS,
} from "@/lib/matching";
import { geocodePostcode } from "@/lib/geocode";
import { combineLanguages } from "@/lib/profile-fields";

export type ProActionState = { error?: string; success?: string };

/** Auth for every mutation is re-derived server-side - never trusted from the client. */
async function requireProfessional() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function str(formData: FormData, key: string): string {
  return ((formData.get(key) as string) ?? "").trim();
}

function poundsToPence(raw: string): number | null {
  if (!raw) return null;
  const pounds = Number(raw);
  if (!Number.isFinite(pounds) || pounds < 0) return null;
  return Math.round(pounds * 100);
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function saveProfessionalProfile(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  // Re-read kind server-side so category choices are filtered honestly.
  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("kind")
    .eq("id", user.id)
    .single();
  if (!pro) return { error: "Professional profile not found." };

  const allowedCategories = new Set(
    careCategoriesFor(pro.kind).map((c) => c.value)
  );
  const careCategories = formData
    .getAll("care_categories")
    .map((v) => v as CareCategory)
    .filter(
      (v) => allowedCategories.has(v) && !DISABLED_CARE_CATEGORIES.includes(v)
    );

  const allowedOptions = new Set(AVAILABILITY_OPTIONS.map((o) => o.value));
  const availabilityOptions = formData
    .getAll("availability_options")
    .map((v) => v as AvailabilityOption)
    .filter((v) => allowedOptions.has(v));

  const availabilityStatus = str(formData, "availability_status");
  if (!AVAILABILITY_STATUSES.some((s) => s.value === availabilityStatus)) {
    return { error: "Please choose an availability status." };
  }

  const yearsExperience = Math.max(
    0,
    Math.min(60, parseInt(str(formData, "years_experience"), 10) || 0)
  );

  const rateMin = poundsToPence(str(formData, "hourly_rate_min"));
  const rateMax = poundsToPence(str(formData, "hourly_rate_max"));
  if (rateMin !== null && rateMax !== null && rateMin > rateMax) {
    return { error: "Minimum hourly rate can't be above the maximum." };
  }

  const nmcPin = str(formData, "nmc_pin");

  // Matching fields: only values from the shared vocabularies are persisted.
  const interestValues = new Set<string>(INTEREST_CHIPS.map((c) => c.value));
  const interests = formData
    .getAll("interests")
    .map((v) => String(v))
    .filter((v) => interestValues.has(v));

  const comfortableValues = new Set<string>(
    COMFORTABLE_WITH_OPTIONS.map((o) => o.value)
  );
  const comfortableWith = formData
    .getAll("comfortable_with")
    .map((v) => String(v))
    .filter((v) => comfortableValues.has(v));

  const personalityRaw = str(formData, "personality_style");
  const personalityStyle = CARER_PERSONALITY_OPTIONS.some(
    (o) => o.value === personalityRaw
  )
    ? personalityRaw
    : null;

  const genderRaw = str(formData, "gender");
  const gender = genderRaw === "female" || genderRaw === "male" ? genderRaw : null;

  const cookingRaw = str(formData, "cooking_skill");
  const cookingSkill = ["basic", "good", "very_good"].includes(cookingRaw)
    ? cookingRaw
    : null;

  // Geocode server-side so search never does it at read time. An empty
  // postcode clears the stored location.
  const postcodeRaw = str(formData, "postcode");
  let postcode: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (postcodeRaw) {
    const geo = await geocodePostcode(postcodeRaw);
    if (!geo) {
      return {
        error: "We couldn't find that postcode. Please check it and try again.",
      };
    }
    postcode = geo.postcode;
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      headline: str(formData, "headline"),
      bio: str(formData, "bio"),
      location: str(formData, "location"),
      region: str(formData, "region"),
      postcode,
      latitude,
      longitude,
      years_experience: yearsExperience,
      care_categories: careCategories,
      availability_status: availabilityStatus as AvailabilityStatus,
      availability_options: availabilityOptions,
      hourly_rate_min: rateMin,
      hourly_rate_max: rateMax,
      languages: combineLanguages(
        formData.getAll("languages"),
        formData.get("other_languages")
      ),
      interests,
      gender,
      personality_style: personalityStyle,
      cooking_skill: cookingSkill,
      comfortable_with: comfortableWith,
      photo_url: str(formData, "photo_url") || null,
      intro_video_url: str(formData, "intro_video_url") || null,
      can_drive: formData.has("can_drive"),
      ...(pro.kind === "nurse" ? { nmc_pin: nmcPin || null } : {}),
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  // Contact details live on the base profile row.
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: str(formData, "phone") || null,
    })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/profile");
  return { success: "Profile saved." };
}

/* ------------------------------------------------------------------ */
/* Availability & time off                                             */
/* ------------------------------------------------------------------ */

export async function saveAvailability(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  const status = str(formData, "availability_status");
  if (!AVAILABILITY_STATUSES.some((s) => s.value === status)) {
    return { error: "Please choose an availability status." };
  }

  // Days and note only apply to "limited"; anything else clears them.
  let limitedDays: string[] = [];
  let limitedNote: string | null = null;
  if (status === "limited") {
    const chosen = new Set(formData.getAll("limited_days").map((v) => String(v)));
    limitedDays = LIMITED_DAYS.map((d) => d.value).filter((v) => chosen.has(v));
    limitedNote = str(formData, "limited_note").slice(0, 200) || null;
  }

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      availability_status: status as AvailabilityStatus,
      limited_days: limitedDays,
      limited_note: limitedNote,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/availability");
  return { success: "Availability saved." };
}

export async function addTimeOff(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  const startsOn = str(formData, "starts_on");
  const endsOn = str(formData, "ends_on");
  if (!ISO_DATE.test(startsOn) || Number.isNaN(new Date(startsOn).getTime())) {
    return { error: "Please enter a start date." };
  }
  if (!ISO_DATE.test(endsOn) || Number.isNaN(new Date(endsOn).getTime())) {
    return { error: "Please enter an end date." };
  }
  if (endsOn < startsOn) {
    return { error: "The end date can't be before the start date." };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (endsOn < today) {
    return { error: "That time off is already in the past." };
  }
  const note = str(formData, "note").slice(0, 200) || null;

  const { error } = await supabase.from("unavailable_dates").insert({
    professional_id: user.id,
    starts_on: startsOn,
    ends_on: endsOn,
    note,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/pro/availability");
  return { success: "Time off added. Those dates now show as busy to families." };
}

export async function deleteTimeOff(formData: FormData): Promise<void> {
  const { supabase, user } = await requireProfessional();
  const id = formData.get("id") as string;
  if (!id) return;

  await supabase
    .from("unavailable_dates")
    .delete()
    .eq("id", id)
    .eq("professional_id", user.id);

  revalidatePath("/app/pro/availability");
}

/** useActionState wrapper around confirmAvailability so the button can show
 * visible "Confirmed just now" feedback instead of succeeding silently. */
export async function confirmAvailabilityWithFeedback(
  // Required by the useActionState signature; nothing is read from the form.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: ProActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<ProActionState> {
  await confirmAvailability();
  return { success: "Availability confirmed." };
}

/* ------------------------------------------------------------------ */
/* Compliance documents                                                */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addDocumentRecord(input: {
  docType: string;
  title: string;
  storagePath: string;
  issueDate?: string;
  expiryDate?: string;
  certificateType?: string;
  completionDate?: string;
}): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  if (!DOC_TYPES.includes(input.docType as DocumentType)) {
    return { error: "Unknown document type." };
  }
  // The file must live in the caller's own storage folder.
  if (!input.storagePath.startsWith(`${user.id}/`)) {
    return { error: "Invalid storage path." };
  }
  const title = input.title.trim();
  if (!title) return { error: "Please give the document a title." };

  let issueDate = input.issueDate || null;
  let expiryDate = input.expiryDate || null;
  let certType: string | null = null;

  if (input.docType === "training_certificate") {
    // Certificate subtype must come from the shared vocabulary, and the
    // expiry is recomputed here - the client's preview is never trusted.
    const cert = certificateType(input.certificateType ?? "");
    if (!cert) {
      return { error: "Please choose which training certificate this is." };
    }
    const completion = (input.completionDate ?? "").trim();
    if (!ISO_DATE.test(completion) || Number.isNaN(new Date(completion).getTime())) {
      return { error: "Please enter the date you completed the training." };
    }
    if (new Date(completion).getTime() > Date.now()) {
      return { error: "The completion date can't be in the future." };
    }
    certType = cert.value;
    issueDate = completion;
    expiryDate = certificateExpiry(cert.value, completion);
  }

  const { error } = await supabase.from("compliance_documents").insert({
    professional_id: user.id,
    doc_type: input.docType as DocumentType,
    title,
    storage_path: input.storagePath,
    issue_date: issueDate,
    expiry_date: expiryDate,
    certificate_type: certType,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/documents");
  return { success: "Document uploaded. It's now waiting for review." };
}

export async function deleteDocument(formData: FormData): Promise<void> {
  const { supabase, user } = await requireProfessional();
  const id = formData.get("id") as string;
  if (!id) return;

  const { data: doc } = await supabase
    .from("compliance_documents")
    .select("id, status, storage_path")
    .eq("id", id)
    .eq("professional_id", user.id)
    .single();
  if (!doc || doc.status !== "pending_review") return;

  const { error } = await supabase
    .from("compliance_documents")
    .delete()
    .eq("id", doc.id)
    .eq("professional_id", user.id);
  if (error) return;

  // Best-effort tidy-up of the underlying file.
  try {
    await supabase.storage.from("compliance-documents").remove([doc.storage_path]);
  } catch {
    // Row is gone; a stray file in a private bucket is acceptable.
  }

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/documents");
}

/* ------------------------------------------------------------------ */
/* Right to work                                                       */
/* ------------------------------------------------------------------ */

export async function saveRtwDetails(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  const route = str(formData, "rtw_route");
  if (route !== "british_irish_passport" && route !== "share_code") {
    return { error: "Please choose how you'll prove your right to work." };
  }

  let shareCode: string | null = null;
  if (route === "share_code") {
    const normalised = str(formData, "rtw_share_code")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (normalised.length !== 9) {
      return {
        error: "Share codes are 9 characters, in the format ABC-DEF-GHI.",
      };
    }
    shareCode = `${normalised.slice(0, 3)}-${normalised.slice(3, 6)}-${normalised.slice(6, 9)}`;
  }

  const { error } = await supabase
    .from("professional_profiles")
    .update({ rtw_route: route, rtw_share_code: shareCode })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/documents");
  return {
    success:
      route === "share_code"
        ? "Share code saved. Our team will verify it with the Home Office."
        : "Route saved. Once your passport is approved, your right to work is covered.",
  };
}

/* ------------------------------------------------------------------ */
/* Clinical skills (nurses)                                            */
/* ------------------------------------------------------------------ */

export async function saveClinicalSkills(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("kind")
    .eq("id", user.id)
    .single();
  if (!pro || pro.kind !== "nurse") {
    return { error: "The clinical skills checklist applies to nurses only." };
  }

  // Only vocabulary keys and levels are persisted; anything else is dropped.
  const levels = new Set<string>(CLINICAL_SKILL_LEVELS);
  const skills: Record<string, string> = {};
  for (const skill of CLINICAL_SKILLS) {
    const raw = str(formData, `skill_${skill.value}`);
    if (levels.has(raw)) skills[skill.value] = raw;
  }

  const { error } = await supabase
    .from("professional_profiles")
    .update({ clinical_skills: skills })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/skills");
  return {
    success: `Saved. ${Object.keys(skills).length} of ${CLINICAL_SKILLS.length} skills rated.`,
  };
}

/* ------------------------------------------------------------------ */
/* Working agreement                                                   */
/* ------------------------------------------------------------------ */

export async function acceptContract(
  // Required by the useActionState signature; nothing is read from the form.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: ProActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<ProActionState> {
  const { supabase } = await requireProfessional();

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  const { error } = await supabase.rpc("accept_contract", {
    p_ip: ip ?? undefined,
  });
  if (error) {
    if (error.message.includes("no_contract_to_accept")) {
      return { error: "There's no agreement waiting for your acceptance." };
    }
    return { error: error.message };
  }

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/contract");
  return { success: "Agreement accepted." };
}

/* ------------------------------------------------------------------ */
/* Interview requests                                                  */
/* ------------------------------------------------------------------ */

export async function respondToInterview(formData: FormData): Promise<void> {
  const { supabase, user } = await requireProfessional();
  const id = formData.get("id") as string;
  const decision = formData.get("decision") as string;
  if (!id || (decision !== "accepted" && decision !== "declined")) return;

  const { data: updated } = await supabase
    .from("interview_requests")
    .update({ status: decision })
    .eq("id", id)
    .eq("professional_id", user.id)
    .eq("status", "requested")
    .select("client_id")
    .maybeSingle();

  if (updated && decision === "accepted") {
    const { data: me } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single();
    const { sendToUser } = await import("@/lib/email");
    const { interviewAcceptedEmail } = await import("@/lib/email/templates");
    const email = interviewAcceptedEmail(me?.first_name ?? "Your carer");
    await sendToUser(updated.client_id, email.subject, email.html);
  }

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/interviews");
}

/* ------------------------------------------------------------------ */
/* Referrals                                                           */
/* ------------------------------------------------------------------ */

export async function createReferral(
  _prev: ProActionState,
  formData: FormData
): Promise<ProActionState> {
  const { supabase, user } = await requireProfessional();

  const email = str(formData, "referred_email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  const kind = str(formData, "kind");
  if (!REFERRAL_KINDS.some((k) => k.value === kind)) {
    return { error: "Please choose what kind of professional you're referring." };
  }

  const { error } = await supabase.from("referrals").insert({
    referrer_id: user.id,
    referred_email: email,
    kind: kind as ReferralKind,
  });
  if (error) {
    if (error.code === "42501" || /policy/i.test(error.message)) {
      return {
        error:
          "Referrals unlock once your own profile is active, so finish your compliance checks first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/referrals");
  return { success: "Invitation recorded. We'll track their progress for you." };
}
