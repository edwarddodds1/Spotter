import * as ImageManipulator from "expo-image-manipulator";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import type { Breed, ScanRecord } from "@/types/app";

export type ShareScanCardResult =
  | { ok: true; method: "native" | "web-share" | "download" }
  | { ok: false; reason: string };

export async function shareScanCard(scan: ScanRecord, breed: Breed): Promise<ShareScanCardResult> {
  const sourceUri = await resolveScanPhotoDisplayUrl(scan.photoUrl);
  if (!sourceUri) return { ok: false, reason: "Could not load the photo for sharing." };
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (Platform.OS === "web" && typeof document !== "undefined") {
    try {
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      const fileName = `spotter-${breed.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      if (typeof navigator !== "undefined" && navigator.share) {
        const canShareFiles =
          typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({
            files: [file],
            title: `My ${breed.name} spot`,
            text: `Spotted a ${breed.name} on Spotter`,
          });
          return { ok: true, method: "web-share" };
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      return { ok: true, method: "download" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Could not share this spot on web.";
      return { ok: false, reason };
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(manipulated.uri, {
      dialogTitle: `Share your ${breed.name} spot`,
    });
    return { ok: true, method: "native" };
  }

  return { ok: false, reason: "Sharing is not available on this device." };
}
