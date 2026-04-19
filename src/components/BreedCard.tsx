import { Image, Pressable, Text, View } from "react-native";

import { RarityBadge } from "@/components/RarityBadge";
import type { Breed } from "@/types/app";

export function BreedCard({
  breed,
  unlocked,
  photoUrl,
  onPress,
}: {
  breed: Breed;
  unlocked: boolean;
  photoUrl?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="mb-3 flex-1 rounded-3xl border border-zinc-200 bg-white p-2 dark:border-border dark:bg-card"
    >
      <View className="h-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
        {unlocked && photoUrl ? (
          <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <Text className="text-3xl text-zinc-500">?</Text>
        )}
      </View>
      <View className="mt-3 gap-2">
        <RarityBadge rarity={breed.rarity} />
        <Text className="text-sm font-semibold text-black dark:text-white">{unlocked ? breed.name : "???"}</Text>
      </View>
    </Pressable>
  );
}
