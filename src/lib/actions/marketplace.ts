"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  startCreditPackCheckout,
  startRetainerCheckout,
} from "@/lib/payments";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function buyCreditPack() {
  const { user } = await requireUser();
  const url = await startCreditPackCheckout(user.id);
  redirect(url);
}

export async function subscribeRetainer() {
  const { user } = await requireUser();
  const url = await startRetainerCheckout(user.id);
  redirect(url);
}

export type ActionResult = { error?: string } | undefined;

export async function requestInterview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const professionalId = formData.get("professionalId") as string;
  const notes = (formData.get("notes") as string) || undefined;
  if (!professionalId) return { error: "Missing professional" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") return { error: "Only clients can request interviews" };

  // DR-0001: interviews are free meet-and-greets, the step before a booking.
  const { createInterviewRequest } = await import("@/lib/payments/fulfil");
  await createInterviewRequest({ clientId: user.id, professionalId, notes });

  const { sendToUser } = await import("@/lib/email");
  const { interviewRequestedEmail } = await import("@/lib/email/templates");
  const email = interviewRequestedEmail(notes);
  await sendToUser(professionalId, email.subject, email.html);

  revalidatePath("/app/interviews");
  redirect("/app/interviews?status=requested");
}

export async function unlockProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const professionalId = formData.get("professionalId") as string;
  if (!professionalId) return { error: "Missing professional" };

  const { error } = await supabase.rpc("unlock_profile", {
    p_professional_id: professionalId,
  });
  if (error) {
    if (error.message.includes("insufficient_credits")) {
      redirect("/app/credits?status=insufficient");
    }
    return { error: error.message };
  }

  revalidatePath("/app/search");
  redirect(`/app/professionals/${professionalId}`);
}

export async function confirmAvailability() {
  const { supabase } = await requireUser();
  await supabase.rpc("confirm_availability");
  revalidatePath("/app", "layout");
}
