import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

/**
 * Fetch the bytes behind a local capture URI and validate that they're an
 * image. Exported so the spot-save pipeline can grab bytes BEFORE the local
 * URL has a chance to expire (web `blob:` URLs are tied to the page session).
 */
export async function fetchImageBytesFromUri(
  localUri: string,
): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  const u = (localUri ?? "").trim();
  const isFetchable =
    u.startsWith("file:") ||
    u.startsWith("blob:") ||
    u.startsWith("data:") ||
    u.startsWith("content:") ||
    /^https?:\/\//i.test(u) ||
    u.startsWith("/");
  if (!isFetchable) {
    throw new Error(`[fetchImageBytesFromUri] non-fetchable URI: ${u}`);
  }
  const response = await fetch(u);
  if (!response.ok) {
    throw new Error(`[fetchImageBytesFromUri] fetch failed (${response.status}) for ${u}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(
      `[fetchImageBytesFromUri] refusing non-image content-type ${contentType}`,
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return { bytes: arrayBuffer, mimeType: contentType || "image/jpeg" };
}

/**
 * Upload pre-fetched bytes to the private `scans` bucket. Preferred entry
 * point over `uploadScanPhoto` because it removes the byte-loading concern
 * from the upload step itself — callers can hold bytes in a retry queue and
 * retry across sessions.
 */
export async function uploadScanPhotoBytes(
  userId: string,
  scanId: string,
  bytes: ArrayBuffer,
  mimeType = "image/jpeg",
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("[uploadScanPhotoBytes] Supabase is not configured.");
  }
  const path = `${userId}/${scanId}.jpg`;
  const { error } = await supabase.storage.from("scans").upload(path, bytes, {
    contentType: mimeType || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/**
 * Upload a freshly-captured scan photo to the private `scans` bucket from a
 * URI. Convenience wrapper around `fetchImageBytesFromUri` +
 * `uploadScanPhotoBytes`.
 *
 * `localUri` MUST be a fetchable URI for the actual image bytes — i.e. a
 * `file:`, `blob:`, `data:`, `content:` URI, an absolute HTTP(S) URL, or a
 * server-relative path that resolves to image bytes. Passing anything else
 * (e.g. a bare storage path like `userId/scanId.jpg`) would cause the
 * browser to resolve it relative to the current page and silently upload
 * whatever HTML / 404 the dev server returns — overwriting the real photo.
 */
export async function uploadScanPhoto(userId: string, scanId: string, localUri: string) {
  if (!isSupabaseConfigured) {
    return localUri;
  }
  const { bytes, mimeType } = await fetchImageBytesFromUri(localUri);
  return uploadScanPhotoBytes(userId, scanId, bytes, mimeType);
}

export async function uploadAvatar(userId: string, localUri: string) {
  if (!isSupabaseConfigured) {
    return localUri;
  }

  const path = `${userId}/avatar.jpg`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const base = data.publicUrl;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${Date.now()}`;
}

/** Uploads hero/header image for a breed; returns storage path for `reference_photo_url` (e.g. breed-reference/id.jpg). */
export async function uploadBreedReferenceHeader(
  breedId: string,
  localUri: string,
): Promise<{ path: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { path: null, error: new Error("Supabase is not configured.") };
  }

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const lower = localUri.toLowerCase();
  const ext = lower.includes(".png") ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const objectPath = `${breedId}.${ext}`;

  const { error } = await supabase.storage.from("breed-reference").upload(objectPath, arrayBuffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    return { path: null, error };
  }

  return { path: `breed-reference/${objectPath}`, error: null };
}
