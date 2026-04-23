import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RarityBadge } from "@/components/RarityBadge";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PendingScanDetail">;

export function PendingScanDetailScreen({ navigation, route }: Props) {
  const allScans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const assignPendingBreed = useSpotterStore((state) => state.assignPendingBreed);
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null);
  const scan = useMemo(
    () => allScans.find((item) => item.id === route.params.scanId),
    [allScans, route.params.scanId],
  );

  if (!scan) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <Text className="text-black dark:text-white">Pending scan not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <Text className="text-3xl font-bold text-black dark:text-white">Tag this scan</Text>
      <Image source={{ uri: scan.photoUrl }} className="mt-4 h-64 w-full rounded-3xl" />
      <Text className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">Pick the breed now and keep the original scan date, image, and coordinates.</Text>
      <View className="mt-5 gap-3">
        {breeds.slice(0, 12).map((breed) => (
          <Pressable
            key={breed.id}
            onPress={() => setSelectedBreedId(breed.id)}
            className={`rounded-3xl border px-4 py-4 ${selectedBreedId === breed.id ? "border-amber bg-zinc-100 dark:bg-zinc-900" : "border-zinc-200 bg-white dark:border-border dark:bg-card"}`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-black dark:text-white">{breed.name}</Text>
              <RarityBadge rarity={breed.rarity} />
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={!selectedBreedId}
        className="mb-10 mt-6 rounded-2xl bg-amber px-4 py-4 disabled:opacity-40"
        onPress={() => {
          if (!selectedBreedId) return;
          assignPendingBreed(scan.id, selectedBreedId);
          Alert.alert("Breed assigned", "This scan now counts toward your Dogdex progress.");
          navigation.goBack();
        }}
      >
        <Text className="text-center font-semibold text-white">Save breed</Text>
      </Pressable>
    </ScrollView>
  );
}
