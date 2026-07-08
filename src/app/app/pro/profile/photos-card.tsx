"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const SLOTS = [1, 2, 3] as const;

export type ProfilePhoto = {
  id: string;
  storage_path: string;
  status: "pending_review" | "approved" | "rejected";
  position: number;
};

const STATUS_PILLS: Record<ProfilePhoto["status"], { label: string; tint: string }> = {
  pending_review: { label: "Awaiting review", tint: "bg-tan/30 text-[#7a6a3d]" },
  approved: { label: "Live", tint: "bg-green/10 text-green" },
  rejected: { label: "Rejected", tint: "bg-red-100 text-red-700" },
};

/**
 * Three-slot profile photo manager. Uploads go straight to the public
 * profile-photos bucket from the browser (RLS scopes writes to the
 * professional's own folder), then a profile_photos row is inserted so the
 * team can review before anything shows to clients.
 */
export function PhotosCard({
  userId,
  photos,
}: {
  userId: string;
  photos: ProfilePhoto[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bySlot = new Map(photos.map((p) => [p.position, p]));

  function publicUrl(path: string): string {
    return supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
  }

  async function removePhoto(photo: ProfilePhoto) {
    const { error: deleteError } = await supabase
      .from("profile_photos")
      .delete()
      .eq("id", photo.id)
      .eq("professional_id", userId);
    if (deleteError) {
      throw new Error("We couldn't remove the existing photo. Please try again.");
    }
    // Best-effort tidy-up; the row is gone so the photo can't be shown.
    await supabase.storage.from("profile-photos").remove([photo.storage_path]);
  }

  async function handleFile(slot: number, file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (a photo, not a document).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Photos must be 5 MB or smaller.");
      return;
    }

    setBusySlot(slot);
    try {
      const existing = bySlot.get(slot);
      if (existing) await removePhoto(existing);

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(storagePath, file);
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { error: insertError } = await supabase.from("profile_photos").insert({
        professional_id: userId,
        storage_path: storagePath,
        position: slot,
      });
      if (insertError) {
        // Don't leave an orphaned file in the public bucket.
        await supabase.storage.from("profile-photos").remove([storagePath]);
        setError("We couldn't save your photo. Please try again.");
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusySlot(null);
    }
  }

  async function handleRemove(slot: number) {
    const existing = bySlot.get(slot);
    if (!existing) return;
    setError(null);
    setBusySlot(slot);
    try {
      await removePhoto(existing);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <Card>
      <h2 className="font-serif text-xl text-ink">Profile photos</h2>
      <p className="text-[14px] text-muted mt-1">
        Photos are reviewed by our team before clients see them. Three clear,
        friendly photos help families choose.
      </p>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SLOTS.map((slot) => {
          const photo = bySlot.get(slot);
          const busy = busySlot === slot;
          return (
            <div key={slot} className="border border-hairline rounded-xl p-3">
              <input
                ref={(el) => {
                  if (el) inputRefs.current.set(slot, el);
                  else inputRefs.current.delete(slot);
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleFile(slot, file);
                }}
              />
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl(photo.storage_path)}
                    alt={`Your profile photo ${slot}`}
                    className="w-full aspect-square object-cover rounded-lg border border-hairline"
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap ${STATUS_PILLS[photo.status].tint}`}
                    >
                      {STATUS_PILLS[photo.status].label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRefs.current.get(slot)?.click()}
                      className="text-[13.5px] font-semibold text-green hover:text-green-dark disabled:opacity-50"
                    >
                      {busy ? "Working…" : "Replace"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemove(slot)}
                      className="text-[13.5px] font-semibold text-muted hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRefs.current.get(slot)?.click()}
                  className="w-full aspect-square rounded-lg border border-dashed border-hairline-strong flex flex-col items-center justify-center gap-1.5 text-muted hover:border-green hover:text-green transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    +
                  </span>
                  <span className="text-[13.5px] font-semibold">
                    {busy ? "Uploading…" : "Add photo"}
                  </span>
                  <span className="text-[12px]">JPG or PNG, up to 5 MB</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-100 text-red-700 px-4 py-3 text-[14px] font-medium">
          {error}
        </p>
      )}
    </Card>
  );
}
