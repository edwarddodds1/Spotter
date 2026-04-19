import { Text, View } from "react-native";

import type { Breed, ScanRecord } from "@/types/app";

export function ProfileScanMap({
  scans,
  breeds,
}: {
  scans: ScanRecord[];
  breeds: Breed[];
}) {
  return (
    <View
      style={{ height: 220, width: "100%", borderRadius: 28 }}
      className="items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950"
    >
      <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Map preview is unavailable on web. Open iOS/Android to view scan pins.
      </Text>
      <Text className="mt-2 text-center text-xs text-zinc-500">
        {scans.length} scans, {breeds.length} breeds loaded.
      </Text>
    </View>
  );
}
