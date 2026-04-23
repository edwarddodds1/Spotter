import { useMemo } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "DogProfile">;

export function DogProfileScreen({ route }: Props) {
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

  if (!dog || !breed) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <Text className="text-black dark:text-white">Dog profile not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <Text className="text-3xl font-bold text-black dark:text-white">{dog.name}</Text>
      <Text className="mt-2 text-base text-zinc-300">{breed.name}</Text>
      <Text className="mt-1 text-sm text-zinc-500">Seen {dog.totalScans} times by Spotter users</Text>

      <View className="mt-5 flex-row flex-wrap justify-between">
        {scans.map((scan) => (
          <Image key={scan.id} source={{ uri: scan.photoUrl }} className="mb-3 h-32 w-[48%] rounded-3xl" />
        ))}
      </View>
    </ScrollView>
  );
}
