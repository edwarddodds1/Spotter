import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const SCANS_BUCKET = "scans";
const SIGNED_URL_TTL_SEC = 60 * 60;

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

/** Drop any cached signed URL for this object path so the next read fetches fresh. */
export function invalidateScansSignedUrl(objectPath: string) {
  signedUrlCache.delete(objectPath);
}

/** Drop every cached signed URL. Safe to call after explicit auth changes. */
export function invalidateAllScansSignedUrls() {
  signedUrlCache.clear();
}

/** Extract `userId/file.jpg` from a Supabase scans URL or bare storage path. */
export function parseScansStoragePath(photoUrl: string): string | null {
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    const path = trimmed.replace(/^\/+/, "");
    if (path.includes("/") && !path.includes("://")) return path;
    return null;
  }

  const patterns = [
    /\/storage\/v1\/object\/public\/scans\/(.+)$/i,
    /\/storage\/v1\/object\/sign\/scans\/([^?]+)/i,
    /\/storage\/v1\/object\/authenticated\/scans\/(.+)$/i,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

function isLocalOrExternalPhotoUrl(photoUrl: string): boolean {
  const t = photoUrl.trim();
  if (!t) return true;
  if (t.startsWith("file:") || t.startsWith("blob:") || t.startsWith("data:")) return true;
  if (!parseScansStoragePath(t) && /^https?:\/\//i.test(t)) return true;
  return false;
}

/**
 * Returns a URI the Image component can load. Private `scans` bucket objects need a
 * short-lived signed URL; public CDN / local URIs pass through unchanged.
 *
 * On sign failure for a recognized storage path we return `null` so callers can
 * distinguish "still working on it / try again" from a definitive success.
 */
export async function resolveScanPhotoDisplayUrl(photoUrl: string): Promise<string | null> {
  const trimmed = photoUrl?.trim() ?? "";
  if (!trimmed) return trimmed;
  if (isLocalOrExternalPhotoUrl(trimmed)) return trimmed;

  const objectPath = parseScansStoragePath(trimmed);
  if (!objectPath) return trimmed;
  if (!isSupabaseConfigured) return null;

  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(SCANS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    if (error) console.warn("[resolveScanPhotoDisplayUrl] sign failed", objectPath, error.message);
    return null;
  }

  signedUrlCache.set(objectPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SEC - 120) * 1000,
  });
  return data.signedUrl;
}
