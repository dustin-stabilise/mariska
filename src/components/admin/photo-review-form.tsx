import { reviewPhoto } from "@/lib/actions/admin";

/**
 * Inline approve/reject controls for a profile photo. Server component -
 * posts straight to the bound admin action, mirroring DocReviewForm.
 */
export function PhotoReviewForm({ photoId }: { photoId: string }) {
  return (
    <form
      action={reviewPhoto.bind(null, photoId, "approve")}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        type="submit"
        className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold bg-green text-cream hover:bg-green-dark transition-colors"
      >
        Approve
      </button>
      <button
        type="submit"
        formAction={reviewPhoto.bind(null, photoId, "reject")}
        className="px-4 py-1.5 rounded-full text-[13.5px] font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors"
      >
        Reject
      </button>
    </form>
  );
}
