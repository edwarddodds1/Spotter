import { Text, View } from "react-native";

import { BadgeMedallion } from "@/components/BadgeMedallion";
import { badgeMeta } from "@/constants/badges";
import type { BadgeType } from "@/types/app";

/**
 * A Profile-grid badge tile: medallion centered above the label and the
 * one-line requirement copy. The medallion itself lives in `BadgeMedallion`
 * so the Social feed achievement card can render the exact same artwork.
 */
export function BadgeTile({ badge, unlocked }: { badge: BadgeType; unlocked: boolean }) {
  const meta = badgeMeta[badge];
  if (!meta) return null;

  return (
    <View className="items-center">
      <BadgeMedallion badge={badge} unlocked={unlocked} size={64} />
      <Text
        className={`mt-2 text-center text-[11px] font-bold ${unlocked ? "text-black dark:text-white" : "text-zinc-500 dark:text-zinc-500"}`}
        numberOfLines={1}
      >
        {meta.label}
      </Text>
      <Text
        className={`mt-0.5 text-center text-[10px] leading-3 ${unlocked ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500"}`}
        numberOfLines={2}
      >
        {meta.requirement}
      </Text>
    </View>
  );
}
