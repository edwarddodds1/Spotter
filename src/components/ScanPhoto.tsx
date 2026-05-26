import { useEffect, useState } from "react";
import { Image, Pressable, Text, View, type ImageProps } from "react-native";

import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import { useSpotterStore } from "@/store/useSpotterStore";

type ScanPhotoProps = Omit<ImageProps, "source"> & {
  photoUrl: string;
  /** When set, uses the store's photoVersions counter for cache-busting after in-place replaces. */
  scanId?: string;
  /** Shown while the signed URL is loading or if it fails. */
  placeholderClassName?: string;
  /**
   * Optional version key (overrides scanId-based versioning when both are passed).
   */
  cacheKey?: string | number;
};

/**
 * Loads scan photos from the private Supabase `scans` bucket via signed URLs.
 */
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

  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setUri(null);
    const needsSignedUrl =
      !photoUrl.startsWith("http://") &&
      !photoUrl.startsWith("https://") &&
      !photoUrl.startsWith("file://") &&
      !photoUrl.startsWith("data:");
    void resolveScanPhotoDisplayUrl(photoUrl).then((resolved) => {
      if (cancelled) return;
      if (!resolved) {
        setFailed(true);
        return;
      }
      if (needsSignedUrl && resolved === photoUrl) {
        setFailed(true);
        return;
      }
      setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, effectiveCacheKey, attempt]);

  if (failed || !uri) {
    const showRetry = failed;
    return (
      <Pressable
        onPress={showRetry ? () => setAttempt((n) => n + 1) : undefined}
        disabled={!showRetry}
        className={`items-center justify-center ${placeholderClassName ?? className ?? ""}`}
        style={[{ backgroundColor: "#e4e4e7" }, rest.style]}
        accessibilityRole={showRetry ? "button" : undefined}
        accessibilityLabel={showRetry ? "Photo unavailable, tap to retry" : undefined}
      >
        {showRetry ? (
          <Text className="px-2 text-center text-[10px] font-medium text-zinc-500">
            Photo unavailable{"\n"}Tap to retry
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Image
      source={{ uri }}
      className={className}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
