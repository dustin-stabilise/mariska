import { reviewDocument } from "@/lib/actions/admin";

/**
 * Inline approve/reject controls for a pending compliance document.
 * Server component - posts straight to the bound admin action; the optional
 * notes field travels with whichever button is pressed.
 */
export function DocReviewForm({ documentId }: { documentId: string }) {
  return (
    <form
      action={reviewDocument.bind(null, documentId, "approve")}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        type="text"
        name="notes"
        placeholder="Review notes (optional)"
        className="flex-1 min-w-40 border border-hairline-strong rounded-full px-3.5 py-1.5 text-[13.5px] bg-card text-ink placeholder:text-faint"
      />
      <button
        type="submit"
        className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors"
      >
        Approve
      </button>
      <button
        type="submit"
        formAction={reviewDocument.bind(null, documentId, "reject")}
        className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors"
      >
        Reject
      </button>
    </form>
  );
}
