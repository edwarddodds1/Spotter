import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { badgeCopy, badgeUnlockHint } from "@/constants/badges";
import { badgeColors } from "@/constants/theme";
import type { BadgeType } from "@/types/app";

const BADGE_ICONS: Record<BadgeType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  first_spot: "camera-outline",
  ten_breeds: "dog-side",
  quarter_dex: "star-four-points-outline",
  half_dex: "star-four-points",
  full_dex: "trophy-variant",
  rare_finder: "diamond-stone",
  legend_spotter: "crown",
  featured_hunter: "lightning-bolt",
  century: "flag-checkered",
  social_pup: "account-heart-outline",
  top_dog_owner: "medal-outline",
};

export function BadgeTile({ badge, unlocked }: { badge: BadgeType; unlocked: boolean }) {
  const accent = badgeColors[badge];
  const copy = badgeCopy[badge];
  const icon = BADGE_ICONS[badge];

  return (
    <View
      className={`overflow-hidden rounded-2xl border p-3 ${
        unlocked ? "border-zinc-200/80 bg-white dark:border-border dark:bg-zinc-900/50" : "border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40"
      }`}
      style={
        unlocked
          ? {
              shadowColor: accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 3,
            }
          : undefined
      }
    >
      <View className="flex-row items-start gap-3">
        <View
          className="items-center justify-center rounded-2xl"
          style={{
            width: 48,
            height: 48,
            backgroundColor: unlocked ? `${accent}22` : "rgba(120,120,120,0.12)",
            borderWidth: unlocked ? 2 : 1,
            borderColor: unlocked ? accent : "rgba(120,120,120,0.25)",
          }}
        >
          <MaterialCommunityIcons name={icon} size={26} color={unlocked ? accent : "#71717a"} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={`flex-1 text-sm font-bold ${unlocked ? "text-black dark:text-white" : "text-zinc-500 dark:text-zinc-500"}`}
              numberOfLines={1}
            >
              {copy.label}
            </Text>
            {!unlocked ? (
              <MaterialCommunityIcons name="lock-outline" size={16} color="#71717a" />
            ) : null}
          </View>
          <Text
            className={`mt-1 text-xs leading-4 ${unlocked ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-500 dark:text-zinc-500"}`}
            numberOfLines={unlocked ? 3 : 2}
          >
            {unlocked ? copy.description : badgeUnlockHint[badge]}
          </Text>
        </View>
      </View>
    </View>
  );
}
