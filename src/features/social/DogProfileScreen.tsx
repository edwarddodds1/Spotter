import { useLayoutEffect, useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScanPhoto } from "@/components/ScanPhoto";
import { rarityColors } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { useSpotterStore } from "@/store/useSpotterStore";

type Props = NativeStackScreenProps<RootStackParamList, "DogProfile">;

export function DogProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const breeds = useSpotterStore((state) => state.breeds);
  const allScans = useSpotterStore((state) => state.scans);
  const dog = useMemo(
    () => dogProfiles.find((item) => item.id === route.params.dogProfileId),
    [dogProfiles, route.params.dogProfileId],
  );
  const breed = useMemo(
    () => breeds.find((item) => item.id === dog?.breedId),
    [breeds, dog?.breedId],
  );
  const scans = useMemo(
    () => allScans.filter((scan) => scan.dogProfileId === dog?.id),
    [allScans, dog?.id],
  );

  const rarityBg = breed ? rarityColors[breed.rarity] : undefined;

  useLayoutEffect(() => {
    if (!breed || !rarityBg) return;
    navigation.setOptions({
      headerStyle: { backgroundColor: rarityBg },
      headerTintColor: "#ffffff",
      headerTitleStyle: { color: "#ffffff", fontWeight: "700" },
      headerShadowVisible: false,
    });
  }, [breed, navigation, rarityBg]);

  if (!dog || !breed || !rarityBg) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <StatusBar style="auto" />
        <Text className="text-black dark:text-white">Dog profile not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: rarityBg }}>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 28 + insets.bottom,
        }}
      >
        <Text className="text-3xl font-bold text-white">{dog.name}</Text>
        <Text className="mt-2 text-base font-medium text-white/90">{breed.name}</Text>
        <Text className="mt-1 text-sm text-white/75">Seen {dog.totalScans} times by Spotter users</Text>

        <View className="mt-5 flex-row flex-wrap justify-between">
          {scans.map((scan) => (
            <ScanPhoto
              key={scan.id}
              scanId={scan.id}
              photoUrl={scan.photoUrl}
              className="mb-3 h-32 w-[48%] rounded-3xl border-2 border-white/35 bg-black/10"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
