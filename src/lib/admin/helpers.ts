/**
 * Small display helpers shared by the agency-admin pages.
 * Pure functions only — safe in server components.
 */

export type NamedProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export function fullName(
  p?: { first_name: string | null; last_name: string | null } | null
): string {
  if (!p) return "Unknown";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || "Unnamed";
}

/** Build an id → "First Last" lookup from fetched profile rows. */
export function nameMap(rows: NamedProfile[] | null | undefined): Map<string, string> {
  return new Map((rows ?? []).map((r) => [r.id, fullName(r)]));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAY_MS = 86_400_000;

/** Whole days from today until a YYYY-MM-DD date (negative = past). */
export function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayUtc) / DAY_MS);
}

/** Whole days elapsed since a timestamp. */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

/** Humanise enum values: "in_review" → "in review". */
export function humanise(value: string): string {
  return value.replaceAll("_", " ");
}

/** Shared table cell / heading classes for admin tables. */
export const th =
  "text-left text-[12px] font-semibold uppercase tracking-wide text-faint pb-3 pr-4 whitespace-nowrap";
export const td = "py-3 pr-4 align-top text-[14.5px] text-body";
export const trow = "border-t border-hairline";

const statusTint: Record<string, string> = {
  // professional
  applied: "bg-sand text-muted",
  in_review: "bg-tan/30 text-[#7a6a3d]",
  active: "bg-green/10 text-green",
  suspended: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  // interviews
  requested: "bg-sand text-muted",
  accepted: "bg-tan/30 text-[#7a6a3d]",
  scheduled: "bg-green/10 text-green",
  completed: "bg-green/10 text-green",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-sand text-muted",
  // placements / flags / docs
  pending: "bg-sand text-muted",
  ended: "bg-sand text-muted",
  replaced: "bg-tan/30 text-[#7a6a3d]",
  open: "bg-red-100 text-red-700",
  resolved: "bg-green/10 text-green",
  dismissed: "bg-sand text-muted",
  pending_review: "bg-tan/30 text-[#7a6a3d]",
  approved: "bg-green/10 text-green",
};

export function statusPillClass(status: string): string {
  return `inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold capitalize whitespace-nowrap ${
    statusTint[status] ?? "bg-sand text-muted"
  }`;
}
