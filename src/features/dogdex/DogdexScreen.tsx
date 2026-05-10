import { useMemo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useLayoutWindowDimensions } from "@/context/WebPreviewDimensionsContext";
import { useNavigation } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";

import { FeaturedTodayCard } from "@/components/FeaturedTodayCard";
import { HEX_TILE_WIDTH, HexBreedTile } from "@/components/HexBreedTile";
import { DOGDEX_TOTAL } from "@/constants/app";
import { buildDogdexBreedOrder, rarityOrder } from "@/constants/breeds";
import { rarityColors } from "@/constants/theme";
import { selectCollectedBreedIds, selectRareFindCount, useSpotterStore } from "@/store/useSpotterStore";

const GRID_COLUMNS = 3;

function chunkRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

export function DogdexScreen() {
  const navigation = useNavigation<any>();
  const { width } = useLayoutWindowDimensions();
  const breeds = useSpotterStore((state) => state.breeds);
  const scans = useSpotterStore((state) => state.scans);
  const currentUserId = useSpotterStore((state) => state.currentUser.id);
  const featuredBreedId = useSpotterStore((state) => state.featuredBreedId);
  const collectedIds = useMemo(() => selectCollectedBreedIds(scans, currentUserId), [scans, currentUserId]);
  const pendingScans = scans.filter((scan) => scan.userId === currentUserId && scan.isPendingBreed);
  const rareFinds = selectRareFindCount(scans, breeds, currentUserId);
  const collectedCount = collectedIds.size;
  const progressPct = Math.min(100, (collectedCount / DOGDEX_TOTAL) * 100);
  const featuredBreed = useMemo(() => breeds.find((b) => b.id === featuredBreedId) ?? null, [breeds, featuredBreedId]);
  const dogdexOrder = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);

  const horizontalPadding = width < 360 ? 12 : 16;

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 pt-8 dark:bg-ink"
      style={{ paddingHorizontal: horizontalPadding }}
      contentContainerStyle={{ paddingBottom: 96 }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      alwaysBounceVertical
      bounces
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
    >
      <Text className="text-4xl font-black text-black dark:text-white">Dogdex</Text>
      <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {collectedCount} of {DOGDEX_TOTAL} breeds found · tap any tile for info
      </Text>

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <View className="h-full rounded-full bg-amber" style={{ width: `${progressPct}%` }} />
      </View>

      <View className="mt-4 flex-row gap-2">
        <StatCard
          label="Scans"
          value={String(scans.filter((s) => s.userId === currentUserId && !s.isPendingBreed).length)}
        />
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
            {chunkRows(padded, GRID_COLUMNS).map((row, rowIndex) => (
              <View key={`${rarity}-row-${rowIndex}`} className="flex-row justify-evenly">
                {row.map((item, colIndex) => {
                  if (!item) {
                    return (
                      <View
                        key={`${rarity}-pad-${rowIndex}-${colIndex}`}
                        className="mb-5"
                        style={{ width: HEX_TILE_WIDTH }}
                      />
                    );
                  }
                  const unlocked = collectedIds.has(item.id);
                  return (
                    <HexBreedTile
                      key={item.id}
                      breed={item}
                      unlocked={unlocked}
                      animationDelayMs={rowIndex * 80}
                      onPress={() => navigation.navigate("BreedDetail", { breedId: item.id })}
                    />
                  );
                })}
              </View>
            ))}
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

    </ScrollView>
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
