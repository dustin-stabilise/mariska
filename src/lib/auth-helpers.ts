import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Current user + profile, or redirect to login. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return { supabase, user, profile };
}

/** Role-gated page guard; wrong role bounces to their own home. */
export async function requireRole(role: Role) {
  const ctx = await requireUser();
  if (ctx.profile.role !== role) redirect("/app");
  return ctx;
}

export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/app/admin";
    case "professional":
      return "/app/pro";
    default:
      return "/app/dashboard";
  }
}
