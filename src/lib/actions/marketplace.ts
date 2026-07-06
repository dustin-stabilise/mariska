"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
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

export async function confirmAvailability() {
  const { supabase } = await requireUser();
  await supabase.rpc("confirm_availability");
  revalidatePath("/app", "layout");
}
