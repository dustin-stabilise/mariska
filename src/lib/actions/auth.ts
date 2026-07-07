"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = credentialsSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export type AuthState = { error?: string } | undefined;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Invalid email or password" };

  revalidatePath("/", "layout");
  redirect((formData.get("next") as string) || "/app");
}

export async function signUpClient(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        // the DB trigger promotes this into app_metadata; only
        // client/professional are accepted, never admin
        role: "client",
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        phone: parsed.data.phone,
      },
    },
  });
  if (error) return { error: error.message };

  const { sendEmail } = await import("@/lib/email");
  const { welcomeClientEmail } = await import("@/lib/email/templates");
  const welcome = welcomeClientEmail(parsed.data.firstName);
  await sendEmail({ to: parsed.data.email, ...welcome });

  revalidatePath("/", "layout");
  redirect("/app/care-profile?welcome=1");
}

const professionalSignupSchema = signupSchema.extend({
  kind: z.enum(["carer", "nurse"]),
  location: z.string().min(1, "Town or city is required"),
  yearsExperience: z.coerce.number().min(0).max(70),
});

export async function signUpProfessional(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = professionalSignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    kind: formData.get("kind"),
    location: formData.get("location"),
    yearsExperience: formData.get("yearsExperience"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: "professional",
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        phone: parsed.data.phone,
      },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Sign-up failed, please try again" };

  // Application record - starts in 'applied'; admin review + vetting moves it
  // to active. RLS: professionals may insert only their own row.
  const { error: profileError } = await supabase.from("professional_profiles").insert({
    id: data.user.id,
    kind: parsed.data.kind,
    location: parsed.data.location,
    years_experience: parsed.data.yearsExperience,
  });
  if (profileError) return { error: profileError.message };

  const { sendEmail } = await import("@/lib/email");
  const { welcomeProfessionalEmail } = await import("@/lib/email/templates");
  const welcome = welcomeProfessionalEmail(parsed.data.firstName);
  await sendEmail({ to: parsed.data.email, ...welcome });

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
