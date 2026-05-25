import { useEffect, useState } from "react";
import { Image, View, type ImageProps } from "react-native";

import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";

type ScanPhotoProps = Omit<ImageProps, "source"> & {
  photoUrl: string;
  /** Shown while the signed URL is loading or if it fails. */
  placeholderClassName?: string;
};

/**
 * Loads scan photos from the private Supabase `scans` bucket via signed URLs.
 */
export function ScanPhoto({ photoUrl, className, placeholderClassName, resizeMode = "cover", ...rest }: ScanPhotoProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUri(null);
    void resolveScanPhotoDisplayUrl(photoUrl).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  if (!uri) {
    return (
      <View
        className={placeholderClassName ?? className}
        style={[{ backgroundColor: "#e4e4e7" }, rest.style]}
      />
    );
  }

  return <Image source={{ uri }} className={className} resizeMode={resizeMode} {...rest} />;
}
