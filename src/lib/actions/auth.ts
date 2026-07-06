"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Passwordless auth (email one-time codes). One requestCode/verifyCode pair
 * covers sign-in, client sign-up and professional applications: the mode
 * decides whether a missing account is an error or a registration, and what
 * lands in user_metadata (the DB trigger promotes role into app_metadata and
 * builds the profile row; 'admin' can never be self-assigned).
 */

export type OtpMode = "login" | "client" | "professional";

export type OtpState =
  | { step: "request"; error?: string }
  | { step: "verify"; email: string; mode: OtpMode; error?: string }
  | undefined;

const emailSchema = z.email("Enter a valid email address");

const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

const professionalSchema = clientSchema.extend({
  kind: z.enum(["carer", "nurse"]),
  location: z.string().min(1, "Town or city is required"),
  yearsExperience: z.coerce.number().min(0).max(70),
});

export async function requestCode(prev: OtpState, formData: FormData): Promise<OtpState> {
  const mode = (formData.get("mode") as OtpMode) || "login";
  const emailParse = emailSchema.safeParse(formData.get("email"));
  if (!emailParse.success) {
    return { step: "request", error: emailParse.error.issues[0].message };
  }
  const email = emailParse.data;

  let metadata: Record<string, unknown> | undefined;

  if (mode === "client") {
    const parsed = clientSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone") || undefined,
    });
    if (!parsed.success) return { step: "request", error: parsed.error.issues[0].message };
    metadata = {
      role: "client",
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
    };
  } else if (mode === "professional") {
    const parsed = professionalSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone") || undefined,
      kind: formData.get("kind"),
      location: formData.get("location"),
      yearsExperience: formData.get("yearsExperience"),
    });
    if (!parsed.success) return { step: "request", error: parsed.error.issues[0].message };
    metadata = {
      role: "professional",
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
      kind: parsed.data.kind,
      location: parsed.data.location,
      years_experience: parsed.data.yearsExperience,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode !== "login",
      data: metadata,
    },
  });

  if (error) {
    if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
      return {
        step: "request",
        error: "No account found with that email. Create a free account or apply to join first.",
      };
    }
    if (error.status === 429) {
      return { step: "request", error: "Too many attempts. Please wait a minute and try again." };
    }
    return { step: "request", error: "Could not send the code, please try again." };
  }

  return { step: "verify", email, mode };
}

export async function verifyCode(prev: OtpState, formData: FormData): Promise<OtpState> {
  const email = (formData.get("email") as string) || "";
  const mode = ((formData.get("mode") as OtpMode) || "login") as OtpMode;
  const token = ((formData.get("token") as string) || "").trim();

  if (!email) return { step: "request", error: "Please start again" };
  if (!/^\d{6}$/.test(token)) {
    return { step: "verify", email, mode, error: "Enter the 6-digit code from your email" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return {
      step: "verify",
      email,
      mode,
      error: "That code didn't match or has expired. Check the email or request a new code.",
    };
  }

  const user = data.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const isNewUser =
    Date.now() - new Date(user.created_at).getTime() < 10 * 60 * 1000;

  // First verification of a professional application: create the
  // application row from the metadata captured at sign-up (RLS: own row only).
  if (meta.role === "professional" && meta.kind) {
    const { data: existing } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("professional_profiles").insert({
        id: user.id,
        kind: meta.kind as "carer" | "nurse",
        location: (meta.location as string) ?? "",
        years_experience: Number(meta.years_experience ?? 0),
      });
    }
  }

  if (isNewUser && user.email) {
    const { sendEmail } = await import("@/lib/email");
    const templates = await import("@/lib/email/templates");
    const welcome =
      meta.role === "professional"
        ? templates.welcomeProfessionalEmail((meta.first_name as string) || "there")
        : templates.welcomeClientEmail((meta.first_name as string) || "there");
    await sendEmail({ to: user.email, ...welcome });
  }

  revalidatePath("/", "layout");
  redirect((formData.get("next") as string) || "/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
