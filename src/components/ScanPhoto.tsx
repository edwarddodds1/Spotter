import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Image, Pressable, Text, View, type ImageProps } from "react-native";

import {
  getLocalPhotoPreview,
  subscribeLocalPhotoPreviews,
} from "@/lib/photoUpload/localPhotoPreviews";
import {
  isPendingPhotoUpload,
  subscribePendingPhotoUploads,
} from "@/lib/photoUpload/pendingPhotoUploads";
import { retryOnePendingPhotoUpload } from "@/lib/photoUpload/retryPendingUploads";
import {
  invalidateScansSignedUrl,
  parseScansStoragePath,
  resolveScanPhotoDisplayUrl,
} from "@/lib/supabase/scanPhotoUrl";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

type ScanPhotoProps = Omit<ImageProps, "source"> & {
  photoUrl: string;
  /** When set, uses the store's photoVersions counter for cache-busting after in-place replaces. */
  scanId?: string;
  /** Shown while the signed URL is loading or if it fails. */
  placeholderClassName?: string;
  /** Optional version key (overrides scanId-based versioning when both are passed). */
  cacheKey?: string | number;
};

/**
 * Loads scan photos from the private Supabase `scans` bucket via signed URLs.
 *
 * Design notes:
 * - We never call `setUri(null)` mid-fetch, so a previously-loaded image stays
 *   visible while the effect re-runs (cache-bust, auth-ready flip, retry).
 * - On a single image-load error we invalidate the cached signed URL and try
 *   once more; only a second consecutive error locks the placeholder.
 * - The effect re-runs when `isReady` flips so cold starts that mounted before
 *   auth restoration finishes still get a fresh attempt.
 */
const subscribeNoop = () => () => undefined;

function useLocalPreviewUri(scanId: string | undefined): string | null {
  return useSyncExternalStore(
    scanId ? subscribeLocalPhotoPreviews : subscribeNoop,
    () => (scanId ? getLocalPhotoPreview(scanId) : null),
    () => null,
  );
}

function useIsPendingUpload(scanId: string | undefined): boolean {
  return useSyncExternalStore(
    scanId ? subscribePendingPhotoUploads : subscribeNoop,
    () => (scanId ? isPendingPhotoUpload(scanId) : false),
    () => false,
  );
}

export function ScanPhoto({
  photoUrl,
  scanId,
  className,
  placeholderClassName,
  resizeMode = "cover",
  cacheKey,
  ...rest
}: ScanPhotoProps) {
  const storeVersion = useSpotterStore((state) =>
    scanId ? (state.photoVersions[scanId] ?? 0) : 0,
  );
  const effectiveCacheKey = cacheKey ?? (scanId ? storeVersion : undefined);
  const authReady = useAuthStore((state) => state.isReady);
  const previewUri = useLocalPreviewUri(scanId);
  const pendingUpload = useIsPendingUpload(scanId);

  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retriedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    if (!photoUrl || !photoUrl.trim()) {
      setUri(null);
      return () => {
        cancelled = true;
      };
    }

    void resolveScanPhotoDisplayUrl(photoUrl).then((resolved) => {
      if (cancelled) return;
      if (resolved === null) {
        if (authReady) setFailed(true);
        return;
      }
      retriedOnceRef.current = false;
      setUri(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [photoUrl, effectiveCacheKey, attempt, authReady]);

  const handleImageError = () => {
    if (retriedOnceRef.current) {
      setFailed(true);
      return;
    }
    retriedOnceRef.current = true;
    const storagePath = parseScansStoragePath(photoUrl);
    if (storagePath) invalidateScansSignedUrl(storagePath);
    setAttempt((n) => n + 1);
  };

  /**
   * Render priority:
   *  1. Real signed/CDN URL (uri) once resolved — the happy path.
   *  2. Fresh-capture in-memory preview — shown immediately after the user
   *     hits "Save", before the upload completes.
   *  3. Pending overlay — when bytes are queued for retry but no preview is
   *     available (e.g. after a page reload mid-upload).
   *  4. "Photo missing" — empty/dead `photoUrl` AND no queue entry.
   *  5. "Photo unavailable" + retry — signed-URL resolution failed against
   *     a real storage path (transient network / RLS issue).
   */
  const displayUri = uri ?? previewUri;

  if (displayUri && !failed) {
    return (
      <Image
        source={{ uri: displayUri }}
        className={className}
        resizeMode={resizeMode}
        onError={handleImageError}
        onLoad={() => {
          retriedOnceRef.current = false;
        }}
        {...rest}
      />
    );
  }

  if (pendingUpload) {
    return (
      <View
        className={`items-center justify-center ${placeholderClassName ?? className ?? ""}`}
        style={[{ backgroundColor: "#e4e4e7" }, rest.style]}
        accessibilityLabel="Photo uploading"
      >
        <ActivityIndicator size="small" color="#71717a" />
        <Text className="mt-1.5 px-2 text-center text-[10px] font-medium text-zinc-600">
          Uploading…
        </Text>
      </View>
    );
  }

  const photoIsBlankish = !photoUrl || !photoUrl.trim();
  const showRetry = failed && !photoIsBlankish;
  const handleRetryPress = () => {
    retriedOnceRef.current = false;
    const storagePath = parseScansStoragePath(photoUrl);
    if (storagePath) invalidateScansSignedUrl(storagePath);
    if (scanId) void retryOnePendingPhotoUpload(scanId);
    setAttempt((n) => n + 1);
  };

  return (
    <Pressable
      onPress={showRetry ? handleRetryPress : undefined}
      disabled={!showRetry}
      className={`items-center justify-center ${placeholderClassName ?? className ?? ""}`}
      style={[{ backgroundColor: "#e4e4e7" }, rest.style]}
      accessibilityRole={showRetry ? "button" : undefined}
      accessibilityLabel={
        showRetry
          ? "Photo unavailable, tap to retry"
          : photoIsBlankish
            ? "Photo missing"
            : undefined
      }
    >
      {showRetry ? (
        <Text className="px-2 text-center text-[10px] font-medium text-zinc-500">
          Photo unavailable{"\n"}Tap to retry
        </Text>
      ) : photoIsBlankish ? (
        <Text className="px-2 text-center text-[10px] font-medium text-zinc-500">
          Photo missing
        </Text>
      ) : null}
    </Pressable>
  );
}
