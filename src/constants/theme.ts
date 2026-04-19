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

export const badgeColors: Record<BadgeType, string> = {
  first_spot: palette.amber,
  ten_breeds: "#0f9d90",
  quarter_dex: "#2979ff",
  half_dex: "#5b21b6",
  full_dex: "#c41e3a",
  rare_finder: "#5b21b6",
  legend_spotter: "#c41e3a",
  featured_hunter: "#BA7517",
  century: "#f97316",
  social_pup: "#ec4899",
  top_dog_owner: "#22c55e",
};

export const variantThresholds: Record<BreedRarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 30,
  legendary: 50,
};
