import { Text, View } from "react-native";

import { rarityColors } from "@/constants/theme";
import type { BreedRarity } from "@/types/app";

export function RarityBadge({ rarity }: { rarity: BreedRarity }) {
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: rarityColors[rarity] }}
    >
      <Text className="text-[10px] font-semibold uppercase tracking-[1.2px] text-white">
        {rarity}
      </Text>
    </View>
  );
}
