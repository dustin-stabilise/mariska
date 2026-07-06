"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Client cancels their own interview request. RLS restricts clients to
 * updating the status column of their own rows; we additionally only
 * cancel requests that are still in the 'requested' state.
 */
export async function cancelInterview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const interviewId = formData.get("interviewId") as string;
  if (!interviewId) return;

  await supabase
    .from("interview_requests")
    .update({ status: "cancelled" })
    .eq("id", interviewId)
    .eq("client_id", user.id)
    .eq("status", "requested");

  revalidatePath("/app/interviews");
}
