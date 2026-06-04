import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { invalidateScansSignedUrl } from "@/lib/supabase/scanPhotoUrl";
import { uploadScanPhotoBytes } from "@/lib/supabase/storage";
import { useSpotterStore } from "@/store/useSpotterStore";

import {
  base64ToArrayBuffer,
  dequeuePendingPhotoUpload,
  getPendingPhotoUpload,
  listPendingPhotoUploads,
  loadPendingPhotoUploads,
  markPendingUploadAttempt,
  type PendingPhotoUpload,
} from "./pendingPhotoUploads";
import { clearLocalPhotoPreview } from "./localPhotoPreviews";

let inFlight: Promise<void> | null = null;

/**
 * Try to upload a single pending entry. On success: writes `photo_url` to
 * Supabase, updates the local store, drops the entry from the queue. On
 * failure: bumps the attempt counter so the queue will retry later (with
 * eventual give-up at the queue level).
 */
export async function retryOnePendingPhotoUpload(scanId: string): Promise<{
  ok: boolean;
  storagePath?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured) return { ok: false, error: "supabase not configured" };
  await loadPendingPhotoUploads();
  const entry = getPendingPhotoUpload(scanId);
  if (!entry) return { ok: true };

  return uploadEntry(entry);
}

async function uploadEntry(
  entry: PendingPhotoUpload,
): Promise<{ ok: boolean; storagePath?: string; error?: string }> {
  try {
    const bytes = base64ToArrayBuffer(entry.base64);
    const storagePath = await uploadScanPhotoBytes(
      entry.userId,
      entry.scanId,
      bytes,
      entry.mimeType,
    );

    // Reflect the new path everywhere so signed URLs regenerate cleanly.
    const supabaseDb = supabase as any;
    const { error: updateError } = await supabaseDb
      .from("scans")
      .update({ photo_url: storagePath })
      .eq("id", entry.scanId)
      .eq("user_id", entry.userId);
    if (updateError) throw updateError;

    invalidateScansSignedUrl(storagePath);
    const confirmedAt = new Date().toISOString();
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === entry.scanId
          ? { ...s, photoUrl: storagePath, serverConfirmedAt: confirmedAt }
          : s,
      ),
    }));
    useSpotterStore.getState().bumpPhotoVersion(entry.scanId);
    await dequeuePendingPhotoUpload(entry.scanId);
    clearLocalPhotoPreview(entry.scanId);
    return { ok: true, storagePath };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "unknown upload error";
    console.warn("[retryPendingUploads] upload failed:", entry.scanId, message);
    await markPendingUploadAttempt(entry.scanId, message);
    return { ok: false, error: message };
  }
}

/**
 * Iterate the queue and try to upload each entry sequentially. Multiple
 * concurrent calls coalesce into a single run.
 */
export async function retryAllPendingPhotoUploads(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      await loadPendingPhotoUploads();
      const queue = listPendingPhotoUploads();
      for (const entry of queue) {
        await uploadEntry(entry);
      }
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Sweep through the local scans and clear any that still hold a known-dead
 * preview URL (`blob:`, `data:`) but have no pending queue entry to recover
 * from. Better to show "Photo missing" than to show a permanently broken
 * `<Image>`. Exported so the store can call this defensively on hydration.
 */
export function purgeStaleClientPhotoUrls(): number {
  const state = useSpotterStore.getState();
  let purged = 0;
  const nextScans = state.scans.map((scan) => {
    const u = scan.photoUrl?.trim() ?? "";
    if (!u) return scan;
    if (u.startsWith("blob:") || u.startsWith("data:")) {
      const hasPending = getPendingPhotoUpload(scan.id);
      if (!hasPending) {
        purged += 1;
        return { ...scan, photoUrl: "" };
      }
    }
    return scan;
  });
  if (purged > 0) {
    useSpotterStore.setState({ scans: nextScans });
    console.warn("[retryPendingUploads] purged stale client photo urls:", purged);
  }
  return purged;
}

/** Parse a `userId/scanId.jpg` storage path to its raw scanId, or null. */
export function parseStoragePathScanId(storagePath: string): string | null {
  const m = storagePath.match(/^[^/]+\/([^/]+)\.jpg$/);
  return m?.[1] ?? null;
}
