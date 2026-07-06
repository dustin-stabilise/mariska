"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  AVAILABILITY_OPTIONS,
  AVAILABILITY_STATUSES,
  DOC_TYPES,
  REFERRAL_KINDS,
  careCategoriesFor,
  type AvailabilityOption,
  type AvailabilityStatus,
  type CareCategory,
  type DocumentType,
  type ReferralKind,
} from "@/lib/professional-constants";

export type ProActionState = { error?: string; success?: string };

/** Auth for every mutation is re-derived server-side — never trusted from the client. */
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

function csvToArray(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
    .filter((v) => allowedCategories.has(v));

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

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      headline: str(formData, "headline"),
      bio: str(formData, "bio"),
      location: str(formData, "location"),
      region: str(formData, "region"),
      years_experience: yearsExperience,
      care_categories: careCategories,
      availability_status: availabilityStatus as AvailabilityStatus,
      availability_options: availabilityOptions,
      hourly_rate_min: rateMin,
      hourly_rate_max: rateMax,
      languages: csvToArray(str(formData, "languages")),
      interests: csvToArray(str(formData, "interests")),
      photo_url: str(formData, "photo_url") || null,
      intro_video_url: str(formData, "intro_video_url") || null,
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
/* Compliance documents                                                */
/* ------------------------------------------------------------------ */

export async function addDocumentRecord(input: {
  docType: string;
  title: string;
  storagePath: string;
  issueDate?: string;
  expiryDate?: string;
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

  const { error } = await supabase.from("compliance_documents").insert({
    professional_id: user.id,
    doc_type: input.docType as DocumentType,
    title,
    storage_path: input.storagePath,
    issue_date: input.issueDate || null,
    expiry_date: input.expiryDate || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/documents");
  return { success: "Document uploaded — it's now waiting for review." };
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
/* Interview requests                                                  */
/* ------------------------------------------------------------------ */

export async function respondToInterview(formData: FormData): Promise<void> {
  const { supabase, user } = await requireProfessional();
  const id = formData.get("id") as string;
  const decision = formData.get("decision") as string;
  if (!id || (decision !== "accepted" && decision !== "declined")) return;

  await supabase
    .from("interview_requests")
    .update({ status: decision })
    .eq("id", id)
    .eq("professional_id", user.id)
    .eq("status", "requested");

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
          "Referrals unlock once your own profile is active — finish your compliance checks first.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/app/pro");
  revalidatePath("/app/pro/referrals");
  return { success: "Invitation recorded — we'll track their progress for you." };
}
