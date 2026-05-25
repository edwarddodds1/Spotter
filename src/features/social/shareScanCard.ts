import * as ImageManipulator from "expo-image-manipulator";
import * as Sharing from "expo-sharing";

import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import type { Breed, ScanRecord } from "@/types/app";

export async function shareScanCard(scan: ScanRecord, breed: Breed) {
  const sourceUri = await resolveScanPhotoDisplayUrl(scan.photoUrl);
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(manipulated.uri, {
      dialogTitle: `Share your ${breed.name} spot`,
    });
  }

  return manipulated.uri;
}
