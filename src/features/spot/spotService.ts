import {
  setLocalPhotoPreview,
  clearLocalPhotoPreview,
} from "@/lib/photoUpload/localPhotoPreviews";
import {
  enqueuePendingPhotoUpload,
  dequeuePendingPhotoUpload,
} from "@/lib/photoUpload/pendingPhotoUploads";
import { retryOnePendingPhotoUpload } from "@/lib/photoUpload/retryPendingUploads";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { invalidateScansSignedUrl, parseScansStoragePath } from "@/lib/supabase/scanPhotoUrl";
import {
  fetchImageBytesFromUri,
  uploadScanPhoto,
  uploadScanPhotoBytes,
} from "@/lib/supabase/storage";
import { useSpotterStore } from "@/store/useSpotterStore";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export async function saveSpot(input: {
  userId: string;
  breedId: string | null;
  photoUri: string;
  dogName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
  coatColourId?: string | null;
  coatColourNote?: string | null;
  spotComment?: string | null;
  isPrivate?: boolean;
}) {
  const db = supabase as any;

  /**
   * STEP 1 — Persist with EMPTY photoUrl, never a `blob:`/`file:` URL.
   *
   * The local store's `photoUrl` is the source of truth for cross-session
   * persistence and DB writes. `blob:` URLs are tied to the page session and
   * silently break on reload; `file:` URIs can be cleaned up by the OS. We
   * keep the volatile URI in a separate in-memory preview map so the user
   * still sees their just-captured photo instantly.
   */
  const result = useSpotterStore.getState().completeScan({
    breedId: input.breedId,
    photoUrl: "",
    dogName: input.dogName,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    locationLabel: input.locationLabel,
    coatColourId: input.coatColourId,
    coatColourNote: input.coatColourNote,
    spotComment: input.spotComment,
    isPrivate: input.isPrivate ?? false,
  });
  setLocalPhotoPreview(result.scan.id, input.photoUri);

  if (!isSupabaseConfigured) {
    return result;
  }

  try {
    /**
     * STEP 2 — Read the photo bytes ONCE, before the URI can expire (e.g.
     * the user refreshes the page mid-upload). The bytes go into the
     * pending-upload queue so retries can happen across sessions even if
     * the original blob: URL is gone.
     */
    let pendingEnqueued = false;
    let bytes: ArrayBuffer | null = null;
    let mimeType = "image/jpeg";
    try {
      const fetched = await fetchImageBytesFromUri(input.photoUri);
      bytes = fetched.bytes;
      mimeType = fetched.mimeType || "image/jpeg";
      await enqueuePendingPhotoUpload({
        scanId: result.scan.id,
        userId: input.userId,
        bytes,
        mimeType,
      });
      pendingEnqueued = true;
    } catch (fetchErr) {
      console.warn("[saveSpot] could not capture photo bytes for retry:", fetchErr);
    }

    /**
     * STEP 3 — Upload from the captured bytes if we have them; fall back to
     * uploading from the URI directly otherwise.
     */
    const uploadedUrl = bytes
      ? await uploadScanPhotoBytes(input.userId, result.scan.id, bytes, mimeType)
      : await uploadScanPhoto(input.userId, result.scan.id, input.photoUri);

    let dogProfileId = result.dogProfile?.id ?? null;
    const trimmedName = input.dogName?.trim();

    if (input.breedId && trimmedName) {
      const normalized = normalizeName(trimmedName);
      const { data: existingDog } = await db
        .from("dog_profiles")
        .select("id,total_scans")
        .eq("breed_id", input.breedId)
        .eq("normalized_name", normalized)
        .maybeSingle();

      if (existingDog) {
        dogProfileId = existingDog.id;
        await db
          .from("dog_profiles")
          .update({ total_scans: existingDog.total_scans + 1 })
          .eq("id", existingDog.id);
      } else {
        const { data: createdDog } = await db
          .from("dog_profiles")
          .insert({
            id: result.dogProfile?.id ?? undefined,
            name: trimmedName,
            normalized_name: normalized,
            breed_id: input.breedId,
            owner_id: null,
            total_scans: 1,
          })
          .select("id")
          .single();
        dogProfileId = createdDog?.id ?? dogProfileId;
      }
    }

    const { error: upsertError } = await db.from("scans").upsert({
      id: result.scan.id,
      user_id: input.userId,
      breed_id: input.breedId,
      photo_url: uploadedUrl,
      dog_name: trimmedName ?? null,
      dog_profile_id: dogProfileId,
      location_lat: input.locationLat ?? null,
      location_lng: input.locationLng ?? null,
      location_label: result.scan.locationLabel,
      scanned_at: result.scan.scannedAt,
      is_pending_breed: !input.breedId,
      points_awarded: result.scan.pointsAwarded,
      matched_featured_breed: result.scan.matchedFeaturedBreed,
      coat_colour_id: result.scan.coatColourId,
      coat_colour_note: result.scan.coatColourNote,
      spot_comment: result.scan.spotComment,
      is_private: result.scan.isPrivate,
    });
    if (upsertError) throw upsertError;

    const confirmedAt = new Date().toISOString();
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === result.scan.id
          ? { ...s, photoUrl: uploadedUrl, serverConfirmedAt: confirmedAt }
          : s,
      ),
    }));
    if (pendingEnqueued) await dequeuePendingPhotoUpload(result.scan.id);
    clearLocalPhotoPreview(result.scan.id);

    await db
      .from("users")
      .update({ total_scans: useSpotterStore.getState().currentUser.totalScans })
      .eq("id", input.userId);
  } catch (error) {
    /**
     * STEP 4 (failure path) — keep the scan local with EMPTY `photoUrl`. The
     * queue still has the bytes (if we managed to capture them), so the
     * boot-time retry or a manual retry will eventually push the photo. The
     * UI shows an "Uploading…" overlay for pending entries instead of the
     * misleading "Photo unavailable / tap to retry" copy.
     */
    console.warn("[saveSpot] Supabase sync failed; kept local scan:", error);
  }

  return result;
}

export async function deleteSpot(scanId: string) {
  const { currentUser, scans, deleteScan } = useSpotterStore.getState();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan || scan.userId !== currentUser.id) return;

  // Supabase-first: delete from the server, then mirror locally. This avoids
  // a window where the local store says "deleted" but Supabase still has the
  // row — which would let the next sync resurrect the scan.
  if (isSupabaseConfigured) {
    const db = supabase as any;
    try {
      const { error } = await db
        .from("scans")
        .delete()
        .eq("id", scanId)
        .eq("user_id", currentUser.id);
      if (error) throw error;

      // Verify the row is actually gone (RLS could silently filter the row).
      const { data: stillThere, error: verifyError } = await db
        .from("scans")
        .select("id")
        .eq("id", scanId)
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (verifyError) throw verifyError;
      if (stillThere) {
        throw new Error(
          "Supabase did not delete the scan (no rows removed). Check that you are signed in.",
        );
      }

      const storagePath = `${currentUser.id}/${scanId}.jpg`;
      const { error: storageError } = await supabase.storage.from("scans").remove([storagePath]);
      if (storageError) {
        console.warn("[deleteSpot] storage remove failed (scan row deleted):", storageError.message);
      }
      invalidateScansSignedUrl(storagePath);
    } catch (err) {
      console.warn("[deleteSpot] supabase delete failed:", err);
      const message =
        err instanceof Error ? err.message : "Couldn't delete the scan. Please try again.";
      throw new Error(message);
    }
  }

  // Remote delete succeeded (or Supabase not configured) — now remove locally.
  deleteScan(scanId);

  if (!isSupabaseConfigured) return;
  const db = supabase as any;
  try {
    await db
      .from("users")
      .update({ total_scans: useSpotterStore.getState().currentUser.totalScans })
      .eq("id", currentUser.id);
  } catch (err) {
    // Non-fatal: scan is already gone; total_scans will re-sync on next pull.
    console.warn("[deleteSpot] total_scans update failed:", err);
  }
}

/**
 * Resolve a pending scan: assigns the breed locally, then pushes the update to
 * Supabase so it persists across devices and sync round-trips. Returns whether
 * the breed was unlocked for the first time so the UI can celebrate.
 *
 * Throws if the remote update fails so the caller can show a real error
 * message; on failure the local optimistic update is rolled back so the next
 * pull-sync doesn't drift back to the pending state.
 */
export async function confirmPendingScanBreed(
  scanId: string,
  breedId: string,
  options?: { coatColourId?: string | null; coatColourNote?: string | null },
) {
  const store = useSpotterStore.getState();
  const previousScan = store.scans.find((s) => s.id === scanId);
  const result = store.assignPendingBreed(scanId, breedId, options);

  if (!result.updatedScan) {
    throw new Error("Could not find that scan on this device.");
  }
  if (!isSupabaseConfigured) {
    return result;
  }

  const db = supabase as any;
  try {
    const { error } = await db
      .from("scans")
      .update({
        breed_id: breedId,
        is_pending_breed: false,
        matched_featured_breed: result.matchedFeatured,
        points_awarded: result.updatedScan.pointsAwarded,
        coat_colour_id: result.updatedScan.coatColourId,
        coat_colour_note: result.updatedScan.coatColourNote,
      })
      .eq("id", result.updatedScan.id)
      .eq("user_id", result.updatedScan.userId);
    if (error) throw error;

    // Verify Supabase actually applied the change (e.g. RLS could silently
    // filter the row). If it didn't, treat it as a failure so the user sees an
    // error rather than a phantom success.
    const { data: verifyRow, error: verifyError } = await db
      .from("scans")
      .select("id, breed_id, is_pending_breed")
      .eq("id", result.updatedScan.id)
      .eq("user_id", result.updatedScan.userId)
      .maybeSingle();
    if (verifyError) throw verifyError;
    if (!verifyRow || verifyRow.breed_id !== breedId || verifyRow.is_pending_breed) {
      throw new Error(
        "Supabase did not save the breed (no rows updated). Check that you are signed in.",
      );
    }
    const confirmedAt = new Date().toISOString();
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === scanId ? { ...s, serverConfirmedAt: confirmedAt } : s,
      ),
    }));
  } catch (err) {
    // Roll back the optimistic local change so the UI / Dogdex don't lie about
    // what was actually saved.
    if (previousScan) {
      useSpotterStore.setState((state) => ({
        scans: state.scans.map((s) => (s.id === scanId ? previousScan : s)),
      }));
    }
    console.warn("[confirmPendingScanBreed] sync error:", err);
    const message =
      err instanceof Error ? err.message : "Couldn't save to the server. Please try again.";
    throw new Error(message);
  }

  return result;
}

/**
 * Resolve a pending scan as "Other / Unknown" — clears the pending flag but
 * does not assign a breed (so nothing unlocks in the Dogdex). Persists the
 * change to Supabase and rolls back the local update if the remote save fails.
 */
export async function confirmPendingScanAsOther(scanId: string) {
  const store = useSpotterStore.getState();
  const previousScan = store.scans.find((s) => s.id === scanId);
  const updated = store.resolvePendingScanAsOther(scanId);

  if (!updated) {
    throw new Error("Could not find that scan on this device.");
  }
  if (!isSupabaseConfigured) {
    return updated;
  }

  const db = supabase as any;
  try {
    const { error } = await db
      .from("scans")
      .update({
        breed_id: null,
        is_pending_breed: false,
        matched_featured_breed: false,
        points_awarded: 0,
        coat_colour_id: null,
        coat_colour_note: null,
      })
      .eq("id", updated.id)
      .eq("user_id", updated.userId);
    if (error) throw error;
    const confirmedAt = new Date().toISOString();
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === scanId ? { ...s, serverConfirmedAt: confirmedAt } : s,
      ),
    }));
  } catch (err) {
    if (previousScan) {
      useSpotterStore.setState((state) => ({
        scans: state.scans.map((s) => (s.id === scanId ? previousScan : s)),
      }));
    }
    console.warn("[confirmPendingScanAsOther] sync error:", err);
    const message =
      err instanceof Error ? err.message : "Couldn't save to the server. Please try again.";
    throw new Error(message);
  }

  return updated;
}

/**
 * Patch one of the user's scans (location, comment, privacy, coat colour) and
 * persist the change to Supabase. Rolls back the local change if the remote
 * save fails.
 */
export async function confirmUpdateScanDetails(
  scanId: string,
  fields: {
    locationLabel?: string | null;
    spotComment?: string | null;
    isPrivate?: boolean;
    coatColourId?: string | null;
    coatColourNote?: string | null;
  },
) {
  const store = useSpotterStore.getState();
  const previousScan = store.scans.find((s) => s.id === scanId);
  const updated = store.updateScanDetails(scanId, fields);

  if (!updated) {
    throw new Error("Could not find that scan on this device.");
  }
  if (!isSupabaseConfigured) {
    return updated;
  }

  const db = supabase as any;
  try {
    const { error } = await db
      .from("scans")
      .update({
        location_label: updated.locationLabel,
        spot_comment: updated.spotComment,
        is_private: updated.isPrivate,
        coat_colour_id: updated.coatColourId,
        coat_colour_note: updated.coatColourNote,
      })
      .eq("id", updated.id)
      .eq("user_id", updated.userId);
    if (error) throw error;
    const confirmedAt = new Date().toISOString();
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === scanId ? { ...s, serverConfirmedAt: confirmedAt } : s,
      ),
    }));
  } catch (err) {
    if (previousScan) {
      useSpotterStore.setState((state) => ({
        scans: state.scans.map((s) => (s.id === scanId ? previousScan : s)),
      }));
    }
    console.warn("[confirmUpdateScanDetails] sync error:", err);
    const message =
      err instanceof Error ? err.message : "Couldn't save the changes. Please try again.";
    throw new Error(message);
  }

  return updated;
}

/**
 * Replace a scan's photo with a freshly edited (cropped/resized) version.
 * Uploads to the same Storage object path (overwrites) so existing
 * `photoUrl` records stay valid, invalidates the signed URL cache, and
 * bumps a per-scan version counter so React Native's Image cache reloads.
 */
export async function replaceScanPhoto(scanId: string, newLocalUri: string) {
  const store = useSpotterStore.getState();
  const scan = store.scans.find((s) => s.id === scanId);
  if (!scan || scan.userId !== store.currentUser.id) {
    throw new Error("Could not find that scan on this device.");
  }

  /**
   * Show the new photo immediately via the in-memory preview map so the user
   * gets instant feedback while the upload runs.
   */
  setLocalPhotoPreview(scanId, newLocalUri);

  if (!isSupabaseConfigured) {
    useSpotterStore.getState().bumpPhotoVersion(scanId);
    // Local-only mode: keep the volatile URI as the photoUrl (no DB to
    // corrupt). Persistence will sanitize it on next hydration.
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) => (s.id === scanId ? { ...s, photoUrl: newLocalUri } : s)),
    }));
    return;
  }

  let pendingEnqueued = false;
  let bytes: ArrayBuffer | null = null;
  let mimeType = "image/jpeg";
  try {
    const fetched = await fetchImageBytesFromUri(newLocalUri);
    bytes = fetched.bytes;
    mimeType = fetched.mimeType || "image/jpeg";
    await enqueuePendingPhotoUpload({
      scanId,
      userId: scan.userId,
      bytes,
      mimeType,
    });
    pendingEnqueued = true;
  } catch (fetchErr) {
    console.warn("[replaceScanPhoto] could not capture photo bytes for retry:", fetchErr);
  }

  try {
    const uploadedPath = bytes
      ? await uploadScanPhotoBytes(scan.userId, scan.id, bytes, mimeType)
      : await uploadScanPhoto(scan.userId, scan.id, newLocalUri);

    // Invalidate any cached signed URL pointing at this object so the next
    // resolution generates a fresh one with new content.
    const previousPath = parseScansStoragePath(scan.photoUrl);
    if (previousPath) invalidateScansSignedUrl(previousPath);
    if (uploadedPath !== previousPath) invalidateScansSignedUrl(uploadedPath);

    const db = supabase as any;
    const { error } = await db
      .from("scans")
      .update({ photo_url: uploadedPath })
      .eq("id", scan.id)
      .eq("user_id", scan.userId);
    if (error) throw error;

    useSpotterStore.getState().bumpPhotoVersion(scanId);
    useSpotterStore.setState((state) => ({
      scans: state.scans.map((s) =>
        s.id === scanId
          ? { ...s, photoUrl: uploadedPath, serverConfirmedAt: new Date().toISOString() }
          : s,
      ),
    }));
    if (pendingEnqueued) await dequeuePendingPhotoUpload(scanId);
    clearLocalPhotoPreview(scanId);
  } catch (err) {
    console.warn("[replaceScanPhoto] sync error:", err);
    /**
     * Don't update photoUrl on failure — the old photo (if any) is still on
     * the server and the queue will retry the new one in the background.
     * Surfacing the error lets the caller decide whether to show a toast.
     */
    if (pendingEnqueued) {
      // Kick off one more attempt in the background so a transient network
      // hiccup doesn't strand the new photo until the next app boot.
      void retryOnePendingPhotoUpload(scanId);
    }
    const message =
      err instanceof Error ? err.message : "Couldn't update the photo. Please try again.";
    throw new Error(message);
  }
}

export async function updateScanPrivacy(scanId: string, isPrivate: boolean) {
  const { currentUser, scans, setScanPrivate } = useSpotterStore.getState();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan || scan.userId !== currentUser.id) return;

  setScanPrivate(scanId, isPrivate);

  if (!isSupabaseConfigured) return;
  const db = supabase as any;
  await db.from("scans").update({ is_private: isPrivate }).eq("id", scanId).eq("user_id", currentUser.id);
}
