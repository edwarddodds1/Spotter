import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Fuse from "fuse.js";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BreedSpriteThumb } from "@/components/BreedSpriteThumb";
import { RarityBadge } from "@/components/RarityBadge";
import { ScanPhoto } from "@/components/ScanPhoto";
import { confirmPendingScanBreed } from "@/features/spot/spotService";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PendingScanDetail">;

export function PendingScanDetailScreen({ navigation, route }: Props) {
  const allScans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const recentBreedIds = useSpotterStore((state) => state.recentBreedIds);
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const scan = useMemo(
    () => allScans.find((item) => item.id === route.params.scanId),
    [allScans, route.params.scanId],
  );

  const fuse = useMemo(
    () => new Fuse(breeds, { keys: ["name", "origin", "temperament"], threshold: 0.35 }),
    [breeds],
  );

  const filteredBreeds = query.trim()
    ? fuse.search(query.trim()).map((r) => r.item)
    : breeds;

  const recentBreeds = recentBreedIds
    .map((id) => breeds.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (!scan) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <Text className="text-black dark:text-white">Pending scan not found.</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!selectedBreedId || saving) return;
    setSaving(true);
    try {
      const breedName = breeds.find((b) => b.id === selectedBreedId)?.name ?? "breed";
      const result = await confirmPendingScanBreed(scan.id, selectedBreedId);
      const title = result.isFirstBreed ? `New breed unlocked!` : "Breed assigned";
      const body = result.isFirstBreed
        ? `You added ${breedName} to your Dogdex. It's now visible on Social.`
        : `${breedName} added to your collection. It's now visible on Social.`;
      Alert.alert(title, body);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const renderBreedRow = (breed: (typeof breeds)[number]) => {
    const isSelected = selectedBreedId === breed.id;
    return (
      <Pressable
        key={breed.id}
        onPress={() => setSelectedBreedId(breed.id)}
        className={`mb-3 rounded-3xl border px-4 py-4 ${
          isSelected
            ? "border-amber bg-amber/10 dark:bg-amber/20"
            : "border-zinc-200 bg-white dark:border-border dark:bg-card"
        }`}
      >
        <View className="flex-row items-center gap-4">
          <BreedSpriteThumb breedId={breed.id} />
          <View className="flex-1">
            <Text className="font-semibold text-black dark:text-white">{breed.name}</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{breed.origin}</Text>
          </View>
          <RarityBadge rarity={breed.rarity} />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <FlatList
        className="px-4 pt-8"
        data={filteredBreeds}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text className="text-3xl font-bold text-black dark:text-white">Tag this scan</Text>
            <ScanPhoto photoUrl={scan.photoUrl} className="mt-4 h-64 w-full rounded-3xl" />
            <Text className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
              Pick the breed now and keep the original scan date, image, and coordinates.
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              placeholder="Search breeds"
              placeholderTextColor="#71717a"
              autoCorrect={false}
              autoCapitalize="none"
              className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
            />

            {!query.trim() && recentBreeds.length ? (
              <View className="mt-5">
                <Text className="mb-3 text-xs font-semibold uppercase tracking-[1.2px] text-zinc-500">
                  Recent picks
                </Text>
                {recentBreeds.map((breed) => renderBreedRow(breed))}
                <Text className="mb-1 mt-2 text-xs font-semibold uppercase tracking-[1.2px] text-zinc-500">
                  All breeds
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => {
          const isFirstOfRarity =
            index === 0 || filteredBreeds[index - 1]?.rarity !== item.rarity;
          return (
            <View>
              {isFirstOfRarity ? (
                <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-[1.2px] text-zinc-500">
                  {item.rarity}
                </Text>
              ) : null}
              {renderBreedRow(item)}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No breeds match “{query.trim()}”.
          </Text>
        }
      />

      <View className="absolute inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pb-8 pt-3 dark:border-border dark:bg-ink/95">
        <Pressable
          disabled={!selectedBreedId || saving}
          className="rounded-2xl bg-amber px-4 py-4 disabled:opacity-40"
          onPress={() => void submit()}
        >
          <Text className="text-center font-semibold text-white">
            {saving
              ? "Saving..."
              : selectedBreedId
                ? `Save as ${breeds.find((b) => b.id === selectedBreedId)?.name ?? "selected breed"}`
                : "Pick a breed to save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
