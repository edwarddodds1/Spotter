import { badgeMeta, type BadgeTier } from "@/constants/badges";
import type { BadgeType, BreedRarity } from "@/types/app";

export const palette = {
  ink: "#0b0b0b",
  paper: "#f7f4ed",
  amber: "#BA7517",
  card: "#151515",
  border: "#2a2a2a",
  muted: "#9e9b94",
  white: "#ffffff",
};

export const rarityColors: Record<BreedRarity, string> = {
  common: "#0f9d90",
  uncommon: "#2979ff",
  rare: "#5b21b6",
  legendary: "#c41e3a",
};

/** Dogdex hex outline: slightly deeper shade than `rarityColors` so the edge reads apart from the fill. */
export const rarityHexBorderColors: Record<BreedRarity, string> = {
  common: "#0b7f73",
  uncommon: "#1e5fcc",
  rare: "#4a1d95",
  legendary: "#9e1830",
};

/**
 * Pokemon-style badge tier metals. Each tier gives a ring (outer stroke) and a
 * shine (lighter highlight used for the inner halo / glow under the icon).
 */
export const badgeTierColors: Record<BadgeTier, { ring: string; shine: string; accent: string }> = {
  bronze: { ring: "#a55a1f", shine: "#cd7f32", accent: "#b87333" },
  silver: { ring: "#1e293b", shine: "#94a3b8", accent: "#334155" },
  gold: { ring: "#c79a18", shine: "#f3c93e", accent: "#e0ad22" },
  platinum: { ring: "#3b82a6", shine: "#7fd9ff", accent: "#4fb4dc" },
};

/**
 * Per-badge accent. Derived from the tier so the medallion ring + every
 * dot/avatar accent stays in sync with the tier ladder.
 */
export const badgeColors: Record<BadgeType, string> = Object.fromEntries(
  Object.entries(badgeMeta).map(([id, meta]) => [id, badgeTierColors[meta.tier].accent]),
) as Record<BadgeType, string>;

export const variantThresholds: Record<BreedRarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 30,
  legendary: 50,
};

/** Breed detail screen accent (aligned with common rarity green). */
export const breedProfileAccent = {
  primary: rarityColors.common,
  primaryDark: "#0b7f73",
  heroOverlay: "rgba(0,0,0,0.45)",
  heroOverlayBottom: "rgba(0,0,0,0.65)",
};
