import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import Fuse from "fuse.js";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BreedSpriteThumb } from "@/components/BreedSpriteThumb";
import { RarityBadge } from "@/components/RarityBadge";
import { rarityOrder } from "@/constants/breeds";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "BreedSelector">;

export function BreedSelectorScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const breeds = useSpotterStore((state) => state.breeds);
  const recentBreedIds = useSpotterStore((state) => state.recentBreedIds);
  const addRecentBreed = useSpotterStore((state) => state.addRecentBreed);
  const setSpotDraft = useSpotterStore((state) => state.setSpotDraft);
  const spotDraft = useSpotterStore((state) => state.spotDraft);

  const fuse = useMemo(
    () =>
      new Fuse(breeds, {
        keys: ["name", "origin", "temperament"],
        threshold: 0.35,
      }),
    [breeds],
  );

  const filteredBreeds = query.trim() ? fuse.search(query.trim()).map((result) => result.item) : breeds;
  const recentBreeds = recentBreedIds.map((id) => breeds.find((breed) => breed.id === id)).filter(Boolean);

  return (
    <View className="flex-1 bg-white px-4 pt-14 dark:bg-ink">
      <Text className="text-3xl font-bold text-black dark:text-white">Identify the breed</Text>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Search across all 50 breeds or log it as pending for later.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search breeds"
        placeholderTextColor="#71717a"
        className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
      />

      {spotDraft.photoUri ? (
        <Image source={{ uri: spotDraft.photoUri }} className="mt-4 h-40 w-full rounded-3xl" resizeMode="cover" />
      ) : null}

      <FlatList
        className="mt-5"
        data={filteredBreeds}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          recentBreeds.length ? (
            <View className="mb-4">
              <Text className="mb-3 text-sm font-semibold uppercase tracking-[1.2px] text-zinc-500">Recent picks</Text>
              {recentBreeds.map((breed) => (
                <Pressable
                  key={breed!.id}
                  onPress={() => {
                    addRecentBreed(breed!.id);
                    setSpotDraft({ selectedBreedId: breed!.id, coatColourId: null, coatColourNote: null, spotComment: null });
                    navigation.navigate("DogNaming");
                  }}
                  className="mb-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <BreedSpriteThumb breedId={breed!.id} />
                    <Text className="min-w-0 flex-1 font-semibold text-black dark:text-white">{breed!.name}</Text>
                    <RarityBadge rarity={breed!.rarity} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const showHeader = index === 0 || filteredBreeds[index - 1]?.rarity !== item.rarity;
          return (
            <View>
              {showHeader ? (
                <Text className="mb-3 mt-2 text-sm font-semibold uppercase tracking-[1.2px] text-zinc-500">
                  {query.trim() ? item.rarity.toUpperCase() : rarityOrder.find((rarity) => rarity === item.rarity)?.toUpperCase()}
                </Text>
              ) : null}
              <Pressable
                onPress={() => {
                  addRecentBreed(item.id);
                  setSpotDraft({ selectedBreedId: item.id, coatColourId: null, coatColourNote: null, spotComment: null });
                  navigation.navigate("DogNaming");
                }}
                className="mb-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card"
              >
                <View className="flex-row items-center gap-4">
                  <BreedSpriteThumb breedId={item.id} />
                  <View className="flex-1">
                    <Text className="font-semibold text-black dark:text-white">{item.name}</Text>
                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{item.origin}</Text>
                  </View>
                  <RarityBadge rarity={item.rarity} />
                </View>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          <Pressable
            className="mb-10 mt-2 rounded-3xl border border-dashed border-amber bg-white px-4 py-4 dark:bg-card"
            onPress={() => {
              setSpotDraft({ selectedBreedId: null, coatColourId: null, coatColourNote: null, spotComment: null });
              navigation.navigate("DogNaming");
            }}
          >
            <Text className="font-semibold text-black dark:text-white">Not sure yet</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Save the scan now and tag the breed later from Dogdex.</Text>
          </Pressable>
        }
      />
    </View>
  );
}
