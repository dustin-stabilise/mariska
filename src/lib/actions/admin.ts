"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/payments/fulfil";
import { PRICING } from "@/lib/pricing";
import { Constants, type Database } from "@/lib/supabase/database.types";

/**
 * Agency admin actions. Every action re-verifies the admin role before
 * touching the service-role client (writes bypass RLS).
 *
 * Actions that back row-scoped forms accept their trailing argument as either
 * a plain value or the FormData React passes to a bound server action.
 */

type Enums = Database["public"]["Enums"];
type ProfessionalStatus = Enums["professional_status"];
type ProfessionalTier = Enums["professional_tier"];
type FlagReason = Enums["flag_reason"];

const ADMIN_ROOT = "/app/admin";

function formValue(source: FormData, key: string): string | undefined {
  const v = source.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function isEnum<T extends string>(list: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (list as readonly string[]).includes(value);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export async function reviewDocument(
  documentId: string,
  decision: "approve" | "reject",
  notes?: string | FormData
) {
  const { user } = await requireRole("admin");
  const noteText = notes instanceof FormData ? formValue(notes, "notes") : notes;

  const db = createAdminClient();
  const { error } = await db
    .from("compliance_documents")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: noteText ?? null,
    })
    .eq("id", documentId);
  if (error) throw new Error(`reviewDocument: ${error.message}`);
  // compliance_documents has a DB trigger that recomputes compliance.
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Professionals                                                       */
/* ------------------------------------------------------------------ */

export async function setProfessionalStatus(
  professionalId: string,
  status: ProfessionalStatus | FormData
) {
  await requireRole("admin");
  const value = status instanceof FormData ? formValue(status, "status") : status;
  if (!isEnum(Constants.public.Enums.professional_status, value)) {
    throw new Error("setProfessionalStatus: invalid status");
  }

  const db = createAdminClient();
  const { error } = await db
    .from("professional_profiles")
    .update({ status: value })
    .eq("id", professionalId);
  if (error) throw new Error(`setProfessionalStatus: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

export async function markInterviewPassed(professionalId: string, _formData?: FormData) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from("professional_profiles")
    .update({ interview_passed_at: new Date().toISOString() })
    .eq("id", professionalId);
  if (error) throw new Error(`markInterviewPassed: ${error.message}`);

  // Setting interview_passed_at does not fire the compliance trigger.
  const { error: rpcError } = await db.rpc("compute_compliance", {
    p_professional_id: professionalId,
  });
  if (rpcError) throw new Error(`markInterviewPassed: ${rpcError.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

export async function setTier(professionalId: string, tier: ProfessionalTier | FormData) {
  await requireRole("admin");
  const value = tier instanceof FormData ? formValue(tier, "tier") : tier;
  if (!isEnum(Constants.public.Enums.professional_tier, value)) {
    throw new Error("setTier: invalid tier");
  }

  const db = createAdminClient();
  const { error } = await db
    .from("professional_profiles")
    .update({ tier: value })
    .eq("id", professionalId);
  if (error) throw new Error(`setTier: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Interviews                                                          */
/* ------------------------------------------------------------------ */

export async function scheduleInterview(
  interviewId: string,
  datetime: string | FormData,
  videoUrl?: string
) {
  await requireRole("admin");
  const isForm = datetime instanceof FormData;
  const raw = isForm ? formValue(datetime, "scheduledAt") : datetime;
  const video = isForm ? formValue(datetime, "videoUrl") : videoUrl;
  const when = raw ? new Date(raw) : null;
  if (!when || Number.isNaN(when.getTime())) {
    throw new Error("scheduleInterview: invalid date/time");
  }

  const db = createAdminClient();
  const { data: updated, error } = await db
    .from("interview_requests")
    .update({
      status: "scheduled",
      scheduled_at: when.toISOString(),
      // Only touch video_url when a link was supplied, so rescheduling
      // without one does not wipe an existing link.
      ...(video ? { video_url: video } : {}),
    })
    .eq("id", interviewId)
    .select("client_id, professional_id, video_url")
    .single();
  if (error) throw new Error(`scheduleInterview: ${error.message}`);

  const { sendToUser } = await import("@/lib/email");
  const { interviewScheduledEmail } = await import("@/lib/email/templates");
  const whenText = when.toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  });
  const email = interviewScheduledEmail(whenText, updated.video_url);
  await sendToUser(updated.client_id, email.subject, email.html);
  await sendToUser(updated.professional_id, email.subject, email.html);

  revalidatePath(ADMIN_ROOT, "layout");
}

export async function completeInterview(interviewId: string, _formData?: FormData) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from("interview_requests")
    .update({ status: "completed" })
    .eq("id", interviewId);
  if (error) throw new Error(`completeInterview: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

/**
 * Admin-side booking cancellation. Only proposed or confirmed bookings can
 * be cancelled; completed and disputed ones go through other flows.
 */
export async function adminCancelBooking(bookingId: string, reason?: string | FormData) {
  await requireRole("admin");
  const reasonText = reason instanceof FormData ? formValue(reason, "reason") : reason;

  const db = createAdminClient();
  const { data: booking, error: fetchError } = await db
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .single();
  if (fetchError || !booking) throw new Error("adminCancelBooking: booking not found");
  if (booking.status !== "proposed" && booking.status !== "confirmed") {
    throw new Error("adminCancelBooking: only proposed or confirmed bookings can be cancelled");
  }

  const { error } = await db
    .from("bookings")
    .update({ status: "cancelled", cancelled_reason: reasonText ?? "Cancelled by admin" })
    .eq("id", bookingId);
  if (error) throw new Error(`adminCancelBooking: ${error.message}`);

  revalidatePath(ADMIN_ROOT, "layout");
  revalidatePath("/app/bookings");
  revalidatePath("/app/pro/bookings");
}

/* ------------------------------------------------------------------ */
/* Placements                                                          */
/* ------------------------------------------------------------------ */

export async function recordPlacement(opts: {
  clientId: string;
  professionalId: string;
  interviewId?: string;
  kind: "carer" | "nurse";
}) {
  const { user } = await requireRole("admin");
  const fee = PRICING.placement[opts.kind].amount;

  const payment = await recordPayment({
    userId: opts.clientId,
    kind: "placement_fee",
    amount: fee,
    provider: "manual",
    status: "paid",
    metadata: {
      professional_id: opts.professionalId,
      professional_kind: opts.kind,
      recorded_by: user.id,
    },
  });

  const db = createAdminClient();
  const { error } = await db.from("placements").insert({
    client_id: opts.clientId,
    professional_id: opts.professionalId,
    interview_id: opts.interviewId ?? null,
    fee_amount: fee,
    payment_id: payment.id,
    status: "active",
    started_at: today(),
  });
  if (error) throw new Error(`recordPlacement: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/** Form wrapper for the new-placement page; derives kind from the professional. */
export async function recordPlacementForm(formData: FormData) {
  await requireRole("admin");
  const clientId = formValue(formData, "clientId");
  const professionalId = formValue(formData, "professionalId");
  const interviewId = formValue(formData, "interviewId");
  if (!clientId || !professionalId) {
    throw new Error("recordPlacement: choose a client and a professional");
  }

  const db = createAdminClient();
  const { data: pro, error } = await db
    .from("professional_profiles")
    .select("kind, status")
    .eq("id", professionalId)
    .single();
  if (error || !pro) throw new Error("recordPlacement: professional not found");
  if (pro.status !== "active") throw new Error("recordPlacement: professional is not active");

  await recordPlacement({ clientId, professionalId, interviewId, kind: pro.kind });
  redirect("/app/admin/placements");
}

export async function endPlacement(placementId: string, replaced?: boolean, _formData?: FormData) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from("placements")
    .update({ status: replaced ? "replaced" : "ended", ended_at: today() })
    .eq("id", placementId);
  if (error) throw new Error(`endPlacement: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export async function grantCredits(clientId: string, amount: number | FormData, note?: string) {
  await requireRole("admin");
  let delta: number;
  let noteText: string | undefined = note;
  if (amount instanceof FormData) {
    delta = Number(formValue(amount, "amount"));
    noteText = formValue(amount, "note");
  } else {
    delta = amount;
  }
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("grantCredits: amount must be a non-zero whole number");
  }

  const db = createAdminClient();
  const { error } = await db.from("credit_ledger").insert({
    client_id: clientId,
    delta,
    reason: "admin_grant",
    note: noteText ?? null,
  });
  if (error) throw new Error(`grantCredits: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Safeguarding                                                        */
/* ------------------------------------------------------------------ */

export async function raiseFlag(
  professionalId: string,
  reason: FlagReason | FormData,
  details?: string
) {
  const { user } = await requireRole("admin");
  let reasonValue: string | undefined;
  let detailText: string | undefined = details;
  if (reason instanceof FormData) {
    reasonValue = formValue(reason, "reason");
    detailText = formValue(reason, "details");
  } else {
    reasonValue = reason;
  }
  if (!isEnum(Constants.public.Enums.flag_reason, reasonValue)) {
    throw new Error("raiseFlag: invalid reason");
  }

  const db = createAdminClient();
  const { error } = await db.from("safeguarding_flags").insert({
    professional_id: professionalId,
    raised_by: user.id,
    reason: reasonValue,
    details: detailText ?? "",
  });
  if (error) throw new Error(`raiseFlag: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

export async function resolveFlag(
  flagId: string,
  outcome: "resolved" | "dismissed",
  _formData?: FormData
) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from("safeguarding_flags")
    .update({ status: outcome, resolved_at: new Date().toISOString() })
    .eq("id", flagId);
  if (error) throw new Error(`resolveFlag: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Referrals                                                           */
/* ------------------------------------------------------------------ */

const REFERRAL_REWARDS: Record<Enums["referral_kind"], number> = {
  carer: PRICING.referral.carer,
  specialist_carer: PRICING.referral.specialistCarer,
  nurse: PRICING.referral.nurse,
};

export async function markReferralPaid(referralId: string, _formData?: FormData) {
  await requireRole("admin");
  const db = createAdminClient();

  const { data: referral, error: fetchError } = await db
    .from("referrals")
    .select("id, kind, status")
    .eq("id", referralId)
    .single();
  if (fetchError || !referral) throw new Error("markReferralPaid: referral not found");
  if (referral.status === "paid") return;

  const { error } = await db
    .from("referrals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      reward_amount: REFERRAL_REWARDS[referral.kind],
    })
    .eq("id", referralId);
  if (error) throw new Error(`markReferralPaid: ${error.message}`);
  revalidatePath(ADMIN_ROOT, "layout");
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export type InviteStaffState =
  | { error?: string; created?: { email: string; password: string } }
  | undefined;

/**
 * Provision a staff (admin) account. Until the domain/email setup lands,
 * the generated password is shown once to the inviting admin to pass on
 * personally; when passwordless sign-in ships, invitees can ignore it and
 * use email codes.
 */
export async function inviteStaff(
  _prev: InviteStaffState,
  formData: FormData
): Promise<InviteStaffState> {
  await requireRole("admin");

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const firstName = ((formData.get("firstName") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (!firstName) return { error: "First name is required" };

  const { randomBytes } = await import("node:crypto");
  const password = randomBytes(12).toString("base64url");

  const db = createAdminClient();
  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) {
    if (/already/i.test(error.message)) {
      return { error: "An account with that email already exists" };
    }
    return { error: "Could not create the account, please try again" };
  }

  revalidatePath(`${ADMIN_ROOT}/staff`);
  return { created: { email, password } };
}
