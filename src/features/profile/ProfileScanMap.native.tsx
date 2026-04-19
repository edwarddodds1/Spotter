import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { View } from "react-native";

import { BreedSpriteThumb } from "@/components/BreedSpriteThumb";
import { palette } from "@/constants/theme";
import type { Breed, ScanRecord } from "@/types/app";

/** Anchor at bottom centre: breed box sits above the GPS point; dot marks the exact coordinate. */
const MARKER_ANCHOR = { x: 0.5, y: 1 } as const;

export function ProfileScanMap({
  scans,
  breeds,
}: {
  scans: ScanRecord[];
  breeds: Breed[];
}) {
  return (
    <MapView
      style={{ height: 220, width: "100%", borderRadius: 28 }}
      initialRegion={{
        latitude: scans.find((scan) => scan.locationLat)?.locationLat ?? -33.8688,
        longitude: scans.find((scan) => scan.locationLng)?.locationLng ?? 151.2093,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {scans
        .filter((scan) => scan.locationLat && scan.locationLng)
        .map((scan) => {
          const breedName = breeds.find((breed) => breed.id === scan.breedId)?.name ?? "Pending scan";
          const when = new Date(scan.scannedAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const description = [scan.locationLabel, when].filter(Boolean).join(" · ");
          return (
            <Marker
              key={scan.id}
              coordinate={{
                latitude: scan.locationLat!,
                longitude: scan.locationLng!,
              }}
              anchor={MARKER_ANCHOR}
              title={breedName}
              description={description || undefined}
              tracksViewChanges={false}
            >
              <View className="items-center">
                <View
                  className="overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md dark:border-zinc-200"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    elevation: 4,
                  }}
                >
                  {scan.breedId ? (
                    <BreedSpriteThumb breedId={scan.breedId} />
                  ) : (
                    <View className="h-[72px] w-[72px] items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                      <MaterialCommunityIcons name="dog" size={36} color={palette.muted} />
                    </View>
                  )}
                </View>
                <View
                  className="mt-[-2px] h-2.5 w-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: palette.amber }}
                />
              </View>
            </Marker>
          );
        })}
    </MapView>
  );
}