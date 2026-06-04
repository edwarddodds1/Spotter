import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";

import { badgeMeta } from "@/constants/badges";
import { badgeTierColors, palette } from "@/constants/theme";
import type { BadgeType } from "@/types/app";

const LOCKED_RING = "#a3a3a3";
const LOCKED_SHINE = "#d4d4d8";

/**
 * The round, metallic-ringed badge medallion only — no label / requirement
 * text underneath. Shared between the Profile achievements grid (BadgeTile)
 * and the Social feed "earned the X badge" card so they read as the same
 * collectible.
 */
export function BadgeMedallion({
  badge,
  unlocked,
  size = 64,
}: {
  badge: BadgeType;
  unlocked: boolean;
  /** Outer circle diameter in px. Inner shine scales proportionally. */
  size?: number;
}) {
  const meta = badgeMeta[badge];
  if (!meta) return null;

  const tier = badgeTierColors[meta.tier];
  const ring = unlocked ? tier.ring : LOCKED_RING;
  const shine = unlocked ? tier.shine : LOCKED_SHINE;
  const iconColor = unlocked ? tier.ring : "#71717a";

  const INNER = Math.round(size * 0.75);
  const ICON = Math.round(size * 0.4);
  const LOCK = Math.max(16, Math.round(size * 0.34));
  const LOCK_ICON = Math.max(10, Math.round(LOCK * 0.55));
  const BORDER = size >= 48 ? 3 : 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: unlocked ? `${tier.accent}1f` : "rgba(120,120,120,0.10)",
        borderWidth: BORDER,
        borderColor: ring,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: unlocked ? tier.ring : "transparent",
        shadowOpacity: unlocked ? 0.35 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: unlocked ? 3 : 0,
      }}
    >
      <View
        style={{
          width: INNER,
          height: INNER,
          borderRadius: INNER / 2,
          backgroundColor: unlocked ? `${shine}33` : "rgba(120,120,120,0.10)",
          borderWidth: 1,
          borderColor: unlocked ? shine : "rgba(120,120,120,0.25)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={meta.icon} size={ICON} color={iconColor} />
      </View>
      {!unlocked ? (
        <View
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: LOCK,
            height: LOCK,
            borderRadius: LOCK / 2,
            backgroundColor: palette.ink,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#ffffff",
          }}
        >
          <MaterialCommunityIcons name="lock-outline" size={LOCK_ICON} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}
