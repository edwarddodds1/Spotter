import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const SCANS_BUCKET = "scans";
const SIGNED_URL_TTL_SEC = 60 * 60;

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

/** Drop any cached signed URL for this object path so the next read fetches fresh. */
export function invalidateScansSignedUrl(objectPath: string) {
  signedUrlCache.delete(objectPath);
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
 * On sign failure for a recognized storage path we return `""` rather than the
 * original URL — the original may be a legacy public-bucket URL that no longer
 * works on the now-private bucket, so falling back to it just paints a broken
 * image. Callers treat `""` as "show retry".
 */
export async function resolveScanPhotoDisplayUrl(photoUrl: string): Promise<string> {
  const trimmed = photoUrl?.trim() ?? "";
  if (!trimmed) return trimmed;
  if (isLocalOrExternalPhotoUrl(trimmed)) return trimmed;

  const objectPath = parseScansStoragePath(trimmed);
  if (!objectPath || !isSupabaseConfigured) return trimmed;

  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const signOnce = async () =>
    supabase.storage.from(SCANS_BUCKET).createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);

  let { data, error } = await signOnce();

  /**
   * Web can occasionally hold a stale access token until refresh resolves.
   * If signing fails once, try a best-effort refresh + one retry before we
   * report failure to the UI.
   */
  if (error || !data?.signedUrl) {
    try {
      await supabase.auth.refreshSession();
      const retried = await signOnce();
      data = retried.data;
      error = retried.error;
    } catch {
      // noop: keep original error path below
    }
  }

  if (error || !data?.signedUrl) {
    console.warn(
      "[resolveScanPhotoDisplayUrl] sign failed",
      objectPath,
      error?.message ?? "missing signed URL",
    );
    return "";
  }

  signedUrlCache.set(objectPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SEC - 120) * 1000,
  });
  return data.signedUrl;
}
