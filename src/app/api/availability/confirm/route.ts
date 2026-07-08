import { verifyAvailabilityToken } from "@/lib/availability-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { brand } from "@/lib/brand";

/**
 * One-click availability confirmation from the weekly digest email.
 * No session required; the HMAC token authorises exactly one professional
 * for a limited window. GET because it's an email link.
 */

function page(title: string, body: string, cta?: { href: string; label: string }) {
  const c = brand.colors;
  return new Response(
    `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:${c.cream};font-family:Helvetica,Arial,sans-serif;color:${c.ink};">
  <div style="max-width:480px;margin:0 auto;padding:64px 24px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:22px;margin-bottom:24px;">${brand.name}</div>
    <div style="background:${c.card};border-radius:16px;padding:36px 28px;">
      <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;">${title}</h1>
      <p style="font-size:15px;line-height:1.6;color:${c.body};margin:0 0 20px;">${body}</p>
      ${cta ? `<a href="${cta.href}" style="display:inline-block;background:${c.green};color:${c.cream};padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600;">${cta.label}</a>` : ""}
    </div>
  </div>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const expires = Number(url.searchParams.get("e") ?? "0");
  const sig = url.searchParams.get("s") ?? "";

  if (!verifyAvailabilityToken(userId, expires, sig)) {
    return page(
      "This link has expired",
      "Confirmation links only last a week. Sign in to confirm your availability instead.",
      { href: "/login?next=/app/pro/availability", label: "Sign in" }
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("professional_profiles")
    .update({ availability_confirmed_at: new Date().toISOString() })
    .eq("id", userId)
    .select("availability_status")
    .maybeSingle();

  if (error || !data) {
    return page(
      "Something went wrong",
      "We couldn't confirm your availability just now. Sign in to update it instead.",
      { href: "/login?next=/app/pro/availability", label: "Sign in" }
    );
  }

  return page(
    "Availability confirmed",
    "Thanks. Your profile stays visible to families searching for care. If anything has changed, you can update your availability any time.",
    { href: "/login?next=/app/pro/availability", label: "Update availability" }
  );
}
