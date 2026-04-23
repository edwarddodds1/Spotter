import { useMemo, type ReactNode } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Animated from "react-native-reanimated";

import { FeaturedTodayCard } from "@/components/FeaturedTodayCard";
import { HexBreedTile } from "@/components/HexBreedTile";
import { DOGDEX_TOTAL } from "@/constants/app";
import { buildDogdexBreedOrder, rarityOrder } from "@/constants/breeds";
import { rarityColors } from "@/constants/theme";
import { selectCollectedBreedIds, selectRareFindCount, useSpotterStore } from "@/store/useSpotterStore";

const GRID_COLUMNS = 3;

export function DogdexScreen() {
  const navigation = useNavigation<any>();
  const breeds = useSpotterStore((state) => state.breeds);
  const scans = useSpotterStore((state) => state.scans);
  const featuredBreedId = useSpotterStore((state) => state.featuredBreedId);
  const collectedIds = useMemo(() => selectCollectedBreedIds(scans), [scans]);
  const pendingScans = scans.filter((scan) => scan.isPendingBreed);
  const rareFinds = selectRareFindCount(scans, breeds);
  const collectedCount = collectedIds.size;
  const progressPct = Math.min(100, (collectedCount / DOGDEX_TOTAL) * 100);
  const featuredBreed = useMemo(() => breeds.find((b) => b.id === featuredBreedId) ?? null, [breeds, featuredBreedId]);
  const dogdexOrder = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);

  return (
    <Animated.ScrollView
      className="flex-1 bg-zinc-50 px-4 pt-14 dark:bg-ink"
    >
      <Text className="text-4xl font-black text-black dark:text-white">Dogdex</Text>
      <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {collectedCount} of {DOGDEX_TOTAL} breeds found · tap any tile for info
      </Text>

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <View className="h-full rounded-full bg-amber" style={{ width: `${progressPct}%` }} />
      </View>

      <View className="mt-4 flex-row gap-2">
        <StatCard label="Scans" value={String(scans.filter((s) => !s.isPendingBreed).length)} />
        <StatCard label="Breeds" value={String(collectedCount)} />
        <StatCard label="Rare+" value={String(rareFinds)} />
      </View>

      {featuredBreed ? (
        <RevealOnScroll>
          <FeaturedTodayCard
            breed={featuredBreed}
            onOpenBreedSheet={() => navigation.navigate("BreedDetail", { breedId: featuredBreed.id })}
          />
        </RevealOnScroll>
      ) : null}

      {rarityOrder.map((rarity) => {
        const data = dogdexOrder.filter((breed) => breed.rarity === rarity);
        const padded = [...data];
        while (padded.length % GRID_COLUMNS !== 0) {
          padded.push(null as unknown as (typeof data)[number]);
        }
        const accent = rarityColors[rarity];

        return (
          <RevealOnScroll key={rarity} className="mt-8">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
              <Text className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-600 dark:text-zinc-400">
                {rarity}
              </Text>
              <View className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </View>
            <FlatList
              scrollEnabled={false}
              data={padded}
              numColumns={GRID_COLUMNS}
              keyExtractor={(item, index) => (item ? item.id : `pad-${rarity}-${index}`)}
              renderItem={({ item, index }) => {
                if (!item) {
                  return <View className="mb-5" style={{ width: `${100 / GRID_COLUMNS}%` }} />;
                }

                const unlocked = collectedIds.has(item.id);
                const rowIndex = Math.floor(index / GRID_COLUMNS);
                return (
                  <HexBreedTile
                    breed={item}
                    unlocked={unlocked}
                    columns={GRID_COLUMNS}
                    animationDelayMs={rowIndex * 80}
                    onPress={() => navigation.navigate("BreedDetail", { breedId: item.id })}
                  />
                );
              }}
            />
          </RevealOnScroll>
        );
      })}

      {pendingScans.length ? (
        <RevealOnScroll className="mt-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-black dark:text-white">Untagged scans</Text>
            <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{pendingScans.length} waiting</Text>
          </View>
          {pendingScans.map((scan) => (
            <Pressable
              key={scan.id}
              className="mb-3 rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-4 dark:border-zinc-600 dark:bg-card"
              onPress={() => navigation.navigate("PendingScanDetail", { scanId: scan.id })}
            >
              <Text className="font-semibold text-black dark:text-white">Assign a breed</Text>
              <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Retag this scan without losing the photo or location.
              </Text>
            </Pressable>
          ))}
        </RevealOnScroll>
      ) : null}

      <View className="h-20" />
    </Animated.ScrollView>
  );
}

function RevealOnScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-border dark:bg-card">
      <Text className="text-xl font-bold text-black dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
    </View>
  );
}
