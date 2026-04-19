import { useMemo } from "react";
import { Text, View } from "react-native";

import { getCommonColoursForBreed } from "@/constants/breedCoatColours";
import type { ScanRecord } from "@/types/app";

import { CoatColourSwatch } from "./CoatColourPicker";

type Props = {
  breedId: string;
  scans: ScanRecord[];
};

export function BreedCommonColours({ breedId, scans }: Props) {
  const options = getCommonColoursForBreed(breedId);
  const collectedIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of scans) {
      if (s.coatColourId) set.add(s.coatColourId);
    }
    return set;
  }, [scans]);

  return (
    <View className="mt-5 border-t border-zinc-100 pt-5 dark:border-border">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Common colours</Text>
      <Text className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
        Circles fill in as you log scans with each coat colour.
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((opt) => {
          const got = collectedIds.has(opt.id);
          return (
            <View key={opt.id} className="items-center">
              <CoatColourSwatch option={opt} selected={got} showCollectedRing={got} />
              <Text
                className="mt-1 max-w-[4.5rem] text-center text-[10px] text-zinc-600 dark:text-zinc-400"
                numberOfLines={2}
              >
                {opt.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
