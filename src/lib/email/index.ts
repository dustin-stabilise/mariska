import "server-only";
import { Resend } from "resend";
import { brand } from "@/lib/brand";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email layer. Without RESEND_API_KEY every send runs in LOG MODE: the
 * message is printed to the server log and treated as sent, so flows work
 * end-to-end before the domain/Resend account exist.
 *
 * EMAIL_FROM should become e.g. "Kindred <hello@kindredcare.co.uk>" once a
 * sending domain is verified in Resend; the resend.dev sandbox sender only
 * delivers to the account owner's own address.
 */

const emailEnabled = Boolean(process.env.RESEND_API_KEY);

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? `${brand.name} <onboarding@resend.dev>`;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!emailEnabled) {
    console.log(
      `[email:log-mode] to=${opts.to} subject="${opts.subject}" (set RESEND_API_KEY to send)`
    );
    return;
  }
  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) console.error(`[email] send failed to=${opts.to}:`, error.message);
  } catch (err) {
    // Never let a notification failure break a product flow.
    console.error(`[email] send threw to=${opts.to}:`, err);
  }
}

/** Emails live in auth.users, not profiles — resolve via the admin API. */
export async function getUserEmail(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

export async function sendToUser(
  userId: string,
  subject: string,
  html: string
): Promise<void> {
  const email = await getUserEmail(userId);
  if (!email) {
    console.warn(`[email] no address for user ${userId}, skipping "${subject}"`);
    return;
  }
  await sendEmail({ to: email, subject, html });
}
