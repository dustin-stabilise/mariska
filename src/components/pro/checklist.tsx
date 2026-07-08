import Link from "next/link";
import {
  CHECKLIST_STATE_LABELS,
  CHECKLIST_STATE_TONE,
  type ChecklistItem,
} from "@/lib/vetting-checklist";

/**
 * One row of the vetting checklist - shared between the pro dashboard and
 * the documents page so requirement states always read the same way.
 */

const DOT: Record<string, string> = {
  good: "bg-green",
  warn: "bg-tan",
  bad: "bg-red-400",
};

const TEXT: Record<string, string> = {
  good: "text-muted",
  warn: "text-[#7a6a3d]",
  bad: "text-red-700",
};

export function ChecklistRow({ item }: { item: ChecklistItem }) {
  const tone = CHECKLIST_STATE_TONE[item.state];
  return (
    <li className="py-3 flex items-start gap-3">
      <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-none ${DOT[tone]}`} />
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[15px] font-medium text-ink">
            {item.href ? (
              <Link href={item.href} className="hover:text-green">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </span>
          <span className={`text-[13px] ${TEXT[tone]}`}>
            {CHECKLIST_STATE_LABELS[item.state]}
            {item.detail ? ` · ${item.detail}` : ""}
          </span>
        </div>
        {item.blurb && <p className="text-[13px] text-muted mt-0.5">{item.blurb}</p>}
        {item.notes && (
          <p className="text-[13px] text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mt-1.5 max-w-sm">
            {item.notes}
          </p>
        )}
      </div>
    </li>
  );
}
