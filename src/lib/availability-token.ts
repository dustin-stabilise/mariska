import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed one-click availability confirmation links (weekly digest email).
 * Token = HMAC-SHA256(`${userId}.${expiresEpoch}`, CRON_SECRET), so the link
 * works without a session but cannot be forged or re-targeted. CRON_SECRET
 * doubles as the signing key: server-only, present in every environment.
 */

function secret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is required for availability tokens");
  return s;
}

export function signAvailabilityToken(userId: string, expiresEpoch: number): string {
  return createHmac("sha256", secret())
    .update(`${userId}.${expiresEpoch}`)
    .digest("base64url");
}

export function verifyAvailabilityToken(
  userId: string,
  expiresEpoch: number,
  token: string
): boolean {
  if (!userId || !Number.isFinite(expiresEpoch)) return false;
  if (expiresEpoch * 1000 < Date.now()) return false;
  const expected = signAvailabilityToken(userId, expiresEpoch);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function availabilityConfirmUrl(userId: string, daysValid = 8): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const exp = Math.floor(Date.now() / 1000) + daysValid * 86400;
  const sig = signAvailabilityToken(userId, exp);
  return `${base}/api/availability/confirm?u=${userId}&e=${exp}&s=${sig}`;
}
