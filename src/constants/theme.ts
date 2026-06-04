import { badgeMeta, type BadgeTier } from "@/constants/badges";
import type { BadgeType, BreedRarity } from "@/types/app";

/**
 * Single source of truth for brand / surface colors. These keys MUST stay in
 * sync with the equivalent `colors` entries in `tailwind.config.js`, because
 * NativeWind reads from Tailwind for class-based styles while RN inline
 * `style={{ ... }}` reads from this palette.
 *
 * Brand accent (`amber`) is moss green — the key name is preserved so the
 * existing `bg-amber`, `text-amber`, etc. usages cascade automatically.
 * Dark surface (`ink`) is a very dark grey, not pure black, so the UI reads
 * softer and supports subtle borders / shadows.
 */
export const palette = {
  ink: "#171717",
  paper: "#f7f4ed",
  amber: "#4a7c4a",
  card: "#1f1f1f",
  border: "#2e2e2e",
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

/**
 * Leaderboard medal colors (gold / silver / bronze) for ranks 1, 2, 3.
 *
 * Silver gets a brighter shade in dark mode because the canonical metallic
 * grey (`#a3a3a3`) reads as muddy against the very-dark-grey ink surface;
 * `#e2e8f0` (slate-200) keeps the metal feel while staying legible. Gold and
 * bronze are tuned to remain saturated in both modes.
 */
export const medalColorsLight: Record<1 | 2 | 3, string> = {
  1: "#f5b301",
  2: "#a3a3a3",
  3: "#b87333",
};

export const medalColorsDark: Record<1 | 2 | 3, string> = {
  1: "#facc15",
  2: "#e2e8f0",
  3: "#d4a373",
};

export function medalColorForRank(rank: 1 | 2 | 3, isDark: boolean): string {
  return (isDark ? medalColorsDark : medalColorsLight)[rank];
}
