import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useLayoutWindowDimensions } from "@/context/WebPreviewDimensionsContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ScrollView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { FeaturedTodayCard } from "@/components/FeaturedTodayCard";
import { HEX_TILE_WIDTH, HexBreedTile } from "@/components/HexBreedTile";
import { DOGDEX_TOTAL } from "@/constants/app";
import { buildDogdexBreedOrder, rarityOrder } from "@/constants/breeds";
import { rarityColors } from "@/constants/theme";
import { pullAndSyncUserScans } from "@/lib/syncUserScans";
import { deleteSpot } from "@/features/spot/spotService";
import { useAuthStore } from "@/store/useAuthStore";
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rareFinds = selectRareFindCount(scans, breeds, currentUserId);
  const collectedCount = collectedIds.size;
  const progressPct = Math.min(100, (collectedCount / DOGDEX_TOTAL) * 100);
  const featuredBreed = useMemo(() => breeds.find((b) => b.id === featuredBreedId) ?? null, [breeds, featuredBreedId]);
  const dogdexOrder = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);

  const horizontalPadding = width < 360 ? 12 : 16;

  useFocusEffect(
    useCallback(() => {
      const userId = useAuthStore.getState().session?.user?.id;
      if (!userId) return;
      void pullAndSyncUserScans(userId);
    }, []),
  );

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
            <View
              key={scan.id}
              className="relative mb-3 rounded-3xl border border-dashed border-zinc-300 bg-white dark:border-zinc-600 dark:bg-card"
            >
              <Pressable
                className="rounded-3xl px-4 py-4 pr-14"
                onPress={() => navigation.navigate("PendingScanDetail", { scanId: scan.id })}
              >
                <Text className="font-semibold text-black dark:text-white">Assign a breed</Text>
                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Retag this scan without losing the photo or location.
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPendingDeleteId(scan.id)}
                hitSlop={10}
                className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
                accessibilityRole="button"
                accessibilityLabel="Delete pending scan"
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
              </Pressable>
            </View>
          ))}
        </RevealOnScroll>
      ) : null}

      <Modal
        transparent
        visible={deleteError !== null}
        animationType="fade"
        onRequestClose={() => setDeleteError(null)}
      >
        <Pressable
          onPress={() => setDeleteError(null)}
          className="flex-1 items-center justify-center bg-black/55 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
          >
            <Text className="text-lg font-bold text-black dark:text-white">Delete failed</Text>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{deleteError}</Text>
            <View className="mt-5 flex-row justify-end">
              <Pressable
                onPress={() => setDeleteError(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-black dark:text-white">OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={pendingDeleteId !== null}
        animationType="fade"
        onRequestClose={() => setPendingDeleteId(null)}
      >
        <Pressable
          onPress={() => setPendingDeleteId(null)}
          className="flex-1 items-center justify-center bg-black/55 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
          >
            <Text className="text-lg font-bold text-black dark:text-white">Delete this scan?</Text>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This permanently removes the photo and pending scan. This cannot be undone.
            </Text>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setPendingDeleteId(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-black dark:text-white">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const id = pendingDeleteId;
                  setPendingDeleteId(null);
                  if (!id) return;
                  void deleteSpot(id).catch((err) => {
                    console.warn("[DogdexScreen] delete pending scan failed", err);
                    const message =
                      err instanceof Error
                        ? err.message
                        : "Couldn't delete the scan. Please try again.";
                    setDeleteError(message);
                  });
                }}
                className="rounded-full bg-red-600 px-4 py-2"
              >
                <Text className="text-sm font-semibold text-white">Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
