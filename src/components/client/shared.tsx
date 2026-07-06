import type { ReactNode } from "react";
import type { Database } from "@/lib/supabase/database.types";

/** Shared bits for the client area — labels, chips and status banners. */

export type InterviewStatus = Database["public"]["Enums"]["interview_status"];

/** "end_of_life" → "End of life" */
export function labelize(value: string): string {
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-sand text-[12.5px] font-medium text-body">
      {children}
    </span>
  );
}

const availabilityStyles: Record<string, string> = {
  available: "bg-green/10 text-green",
  limited: "bg-tan/30 text-[#7a6a3d]",
  unavailable: "bg-sand text-muted",
};

export function AvailabilityPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${availabilityStyles[status] ?? "bg-sand text-muted"}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const interviewStyles: Record<InterviewStatus, string> = {
  requested: "bg-tan/30 text-[#7a6a3d]",
  accepted: "bg-green/10 text-green",
  scheduled: "bg-green/10 text-green",
  completed: "bg-sage/30 text-green-dark",
  declined: "bg-red-100 text-red-700",
  cancelled: "bg-sand text-muted",
};

export function InterviewStatusPill({ status }: { status: InterviewStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${interviewStyles[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Banner({
  tone = "success",
  children,
}: {
  tone?: "success" | "warn" | "error";
  children: ReactNode;
}) {
  const styles = {
    success: "bg-green/10 border-green/20 text-green-dark",
    warn: "bg-tan/25 border-tan/40 text-[#7a6a3d]",
    error: "bg-red-50 border-red-200 text-red-700",
  }[tone];
  return (
    <div
      className={`border rounded-2xl px-5 py-3.5 text-[14.5px] font-medium mb-6 ${styles}`}
    >
      {children}
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Whole days until an ISO timestamp (0 if past). */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
