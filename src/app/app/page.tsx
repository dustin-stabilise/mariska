import { redirect } from "next/navigation";
import { requireUser, roleHome } from "@/lib/auth-helpers";

/** /app routes to the role's home. */
export default async function AppIndex() {
  const { profile } = await requireUser();
  redirect(roleHome(profile.role));
}
