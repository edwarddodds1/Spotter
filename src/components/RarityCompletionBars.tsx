import { useMemo } from "react";
import { Text, View } from "react-native";

import { rarityColors } from "@/constants/theme";
import type { Breed, BreedRarity, ScanRecord } from "@/types/app";

const RARITY_ORDER: BreedRarity[] = ["common", "uncommon", "rare", "legendary"];

const RARITY_LABEL: Record<BreedRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

type Counts = Record<BreedRarity, { collected: number; total: number }>;

function computeCounts(breeds: Breed[], collectedBreedIds: Set<string>): Counts {
  const counts: Counts = {
    common: { collected: 0, total: 0 },
    uncommon: { collected: 0, total: 0 },
    rare: { collected: 0, total: 0 },
    legendary: { collected: 0, total: 0 },
  };
  for (const breed of breeds) {
    const slot = counts[breed.rarity];
    if (!slot) continue;
    slot.total += 1;
    if (collectedBreedIds.has(breed.id)) slot.collected += 1;
  }
  return counts;
}

/**
 * Per-rarity completion bars. Each row shows "X / Y" plus a bar filled to
 * that rarity's collection ratio in the rarity colour.
 *
 * Accepts either a precomputed `collectedBreedIds` set, or a (scans, userId)
 * pair that we'll derive it from. Total per rarity is always the full breed
 * catalogue, so the denominators don't move with visibility.
 */
export function RarityCompletionBars({
  breeds,
  collectedBreedIds,
  scans,
  userId,
  variant = "default",
}: {
  breeds: Breed[];
  collectedBreedIds?: Set<string>;
  scans?: ScanRecord[];
  userId?: string;
  variant?: "default" | "compact";
}) {
  const derivedCollected = useMemo(() => {
    if (collectedBreedIds) return collectedBreedIds;
    if (!scans || !userId) return new Set<string>();
    const ids = new Set<string>();
    for (const scan of scans) {
      if (scan.userId !== userId) continue;
      if (scan.isPendingBreed) continue;
      if (!scan.breedId) continue;
      ids.add(scan.breedId);
    }
    return ids;
  }, [collectedBreedIds, scans, userId]);

  const counts = useMemo(() => computeCounts(breeds, derivedCollected), [breeds, derivedCollected]);

  const isCompact = variant === "compact";
  const barHeight = isCompact ? 8 : 10;
  const rowGap = isCompact ? "mb-2" : "mb-3";
  const labelSize = isCompact ? "text-[11px]" : "text-xs";

  return (
    <View>
      {RARITY_ORDER.map((rarity) => {
        const { collected, total } = counts[rarity];
        const ratio = total > 0 ? Math.min(1, collected / total) : 0;
        const widthPct = `${Math.round(ratio * 100)}%`;
        const color = rarityColors[rarity];
        const empty = total === 0;
        return (
          <View key={rarity} className={rowGap}>
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <Text className={`${labelSize} font-semibold text-black dark:text-white`}>
                  {RARITY_LABEL[rarity]}
                </Text>
              </View>
              <Text className={`${labelSize} font-medium text-zinc-500 dark:text-zinc-400`}>
                {collected} / {total || "—"}
              </Text>
            </View>
            <View
              className="overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800"
              style={{ height: barHeight }}
            >
              {!empty ? (
                <View
                  className="h-full rounded-full"
                  style={{ width: widthPct as any, backgroundColor: color }}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
