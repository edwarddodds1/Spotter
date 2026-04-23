import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getStartOfCurrentWeek } from "@/lib/utils/dates";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TopDogs">;

export function TopDogsScreen({ navigation }: Props) {
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const scans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const dogs = useMemo(() => {
    const weekStart = getStartOfCurrentWeek();
    const weeklyCounts = new Map<string, number>();

    scans.forEach((scan) => {
      if (!scan.dogProfileId) return;
      if (new Date(scan.scannedAt) < weekStart) return;
      weeklyCounts.set(scan.dogProfileId, (weeklyCounts.get(scan.dogProfileId) ?? 0) + 1);
    });

    return [...dogProfiles]
      .map((dog) => ({
        ...dog,
        weeklyScans: weeklyCounts.get(dog.id) ?? 0,
      }))
      .sort((a, b) => (b.weeklyScans === a.weeklyScans ? b.totalScans - a.totalScans : b.weeklyScans - a.weeklyScans));
  }, [dogProfiles, scans]);

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <Text className="text-3xl font-bold text-black dark:text-white">Top Dogs</Text>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Dogs ranked by this week&apos;s scans across all users.</Text>
      <View className="mt-6">
        {dogs.map((dog, index) => {
          const breed = breeds.find((item) => item.id === dog.breedId);
          return (
            <Pressable
              key={dog.id}
              onPress={() => navigation.navigate("DogProfile", { dogProfileId: dog.id })}
              className="mb-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card"
            >
              <Text className="text-lg font-semibold text-black dark:text-white">
                {index + 1}. {dog.name}
              </Text>
              <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {breed?.name} · {dog.weeklyScans} this week · {dog.totalScans} all-time
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
