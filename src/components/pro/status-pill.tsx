/**
 * Small status pill for the professional area — covers document, interview,
 * referral and professional statuses with the shared traffic-light palette.
 */

const GOOD = "bg-green/10 text-green";
const WAIT = "bg-tan/30 text-[#7a6a3d]";
const BAD = "bg-red-100 text-red-700";
const NEUTRAL = "bg-sand text-muted";

const STATUS_STYLES: Record<string, string> = {
  // documents
  approved: GOOD,
  pending_review: WAIT,
  rejected: BAD,
  // interviews
  requested: WAIT,
  accepted: GOOD,
  scheduled: GOOD,
  completed: NEUTRAL,
  declined: NEUTRAL,
  cancelled: NEUTRAL,
  // referrals
  invited: WAIT,
  registered: WAIT,
  compliant: GOOD,
  paid: GOOD,
  // professional
  applied: WAIT,
  in_review: WAIT,
  active: GOOD,
  suspended: BAD,
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize whitespace-nowrap ${STATUS_STYLES[status] ?? NEUTRAL}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
