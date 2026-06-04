import type { MaterialCommunityIcons } from "@expo/vector-icons";

import { DOGDEX_TOTAL } from "@/constants/app";
import type { BadgeType } from "@/types/app";

export type BadgeCategory = "discovery" | "collection" | "streak" | "social";
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

/**
 * Full metadata for one badge. The category groups it on the Profile screen;
 * the tier picks the medallion ring colour (Pokemon-style metallic ladder);
 * the icon is the inner glyph rendered inside the medallion.
 */
export interface BadgeMeta {
  label: string;
  description: string;
  /** One-line copy describing how to earn it. Shown on locked tiles and tooltips. */
  requirement: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "discovery",
  "collection",
  "streak",
  "social",
];

export const badgeCategoryLabel: Record<BadgeCategory, string> = {
  discovery: "Discovery",
  collection: "Collection",
  streak: "Streaks",
  social: "Social",
};

export const badgeCategoryBlurb: Record<BadgeCategory, string> = {
  discovery: "Total scans, however common.",
  collection: "Unique breeds in your Dogdex.",
  streak: "Consecutive days with a scan.",
  social: "Friends, rivalries, and reactions.",
};

/**
 * Per-badge metadata. Order inside a category mirrors the tier ladder
 * (bronze → silver → gold → platinum) which is how Profile renders them.
 */
export const badgeMeta: Record<BadgeType, BadgeMeta> = {
  // Discovery
  puppy_scout: {
    label: "Puppy Scout",
    description: "Five scans into the journey.",
    requirement: "Scan 5 dogs",
    category: "discovery",
    tier: "bronze",
    icon: "binoculars",
  },
  park_rover: {
    label: "Park Rover",
    description: "A regular on the trails.",
    requirement: "Scan 25 dogs",
    category: "discovery",
    tier: "silver",
    icon: "binoculars",
  },
  breed_hunter: {
    label: "Breed Hunter",
    description: "Serious spotter status.",
    requirement: "Scan 100 dogs",
    category: "discovery",
    tier: "gold",
    icon: "binoculars",
  },
  master_spotter: {
    label: "Master Spotter",
    description: "Few rival your eye for dogs.",
    requirement: "Scan 300 dogs",
    category: "discovery",
    tier: "platinum",
    icon: "binoculars",
  },

  // Collection
  common_collector: {
    label: "Common Collector",
    description: "Five breeds in your Dogdex.",
    requirement: "Collect 5 unique breeds",
    category: "collection",
    tier: "bronze",
    icon: "paw",
  },
  kennel_expert: {
    label: "Kennel Expert",
    description: "Ten breeds and counting.",
    requirement: "Collect 10 breeds",
    category: "collection",
    tier: "silver",
    icon: "paw",
  },
  dog_encyclopedia: {
    label: "Dog Encyclopaedia",
    description: "Twenty-five breeds in the book.",
    requirement: "Collect 25 breeds",
    category: "collection",
    tier: "gold",
    icon: "paw",
  },
  legendary_collector: {
    label: "Legendary Collector",
    description: "Every breed in the app.",
    requirement: "Collect every breed",
    category: "collection",
    tier: "platinum",
    icon: "paw",
  },

  // Streaks
  daily_walker: {
    label: "Daily Walker",
    description: "Three days in a row.",
    requirement: "3-day streak",
    category: "streak",
    tier: "bronze",
    icon: "fire",
  },
  consistent_collector: {
    label: "Consistent Collector",
    description: "A week straight.",
    requirement: "7-day streak",
    category: "streak",
    tier: "silver",
    icon: "fire",
  },
  dog_obsessed: {
    label: "Dog Obsessed",
    description: "Thirty days, no breaks.",
    requirement: "30-day streak",
    category: "streak",
    tier: "gold",
    icon: "fire",
  },
  off_the_leash: {
    label: "Off The Leash",
    description: "A hundred straight days.",
    requirement: "100-day streak",
    category: "streak",
    tier: "platinum",
    icon: "fire",
  },

  // Social
  pack_member: {
    label: "Pack Member",
    description: "Built a small pack.",
    requirement: "Add 3 friends",
    category: "social",
    tier: "bronze",
    icon: "account-multiple-outline",
  },
  dog_squad: {
    label: "Dog Squad",
    description: "A proper squad.",
    requirement: "Add 10 friends",
    category: "social",
    tier: "silver",
    icon: "account-group",
  },
  rival_spotter: {
    label: "Spotter Champ",
    description: "Took home a league season.",
    requirement: "Win a league",
    category: "social",
    tier: "gold",
    icon: "trophy-variant",
  },
  community_favourite: {
    label: "Fan Favourite",
    description: "Twenty-five likes on your spots.",
    requirement: "Receive 25 likes total",
    category: "social",
    tier: "platinum",
    icon: "heart",
  },
};

/**
 * Order shown on Profile: walk each category bronze → platinum, categories in
 * Discovery → Collection → Streaks → Social order.
 */
export const badgeDisplayOrder: BadgeType[] = [
  "puppy_scout",
  "park_rover",
  "breed_hunter",
  "master_spotter",
  "common_collector",
  "kennel_expert",
  "dog_encyclopedia",
  "legendary_collector",
  "daily_walker",
  "consistent_collector",
  "dog_obsessed",
  "off_the_leash",
  "pack_member",
  "dog_squad",
  "rival_spotter",
  "community_favourite",
];

export const KNOWN_BADGE_IDS: ReadonlySet<BadgeType> = new Set<BadgeType>(badgeDisplayOrder);

export function isKnownBadge(value: unknown): value is BadgeType {
  return typeof value === "string" && KNOWN_BADGE_IDS.has(value as BadgeType);
}

/**
 * Back-compat shim: a handful of callers and badge-unlock feed cards reach for
 * `badgeCopy[badge]` directly. Derive from `badgeMeta` so there is a single
 * source of truth.
 */
export const badgeCopy: Record<BadgeType, { label: string; description: string }> = Object.fromEntries(
  Object.entries(badgeMeta).map(([id, meta]) => [id, { label: meta.label, description: meta.description }]),
) as Record<BadgeType, { label: string; description: string }>;

/** Back-compat shim used by older locked-tile hints. */
export const badgeUnlockHint: Record<BadgeType, string> = Object.fromEntries(
  Object.entries(badgeMeta).map(([id, meta]) => [id, meta.requirement]),
) as Record<BadgeType, string>;

export function badgesByCategory(): Record<BadgeCategory, BadgeType[]> {
  const grouped: Record<BadgeCategory, BadgeType[]> = {
    discovery: [],
    collection: [],
    streak: [],
    social: [],
  };
  for (const id of badgeDisplayOrder) grouped[badgeMeta[id].category].push(id);
  return grouped;
}

/** Thresholds mirror `recomputeBadges` in the store — keep in sync. */
type BadgeThreshold =
  | { metric: "scans"; value: number }
  | { metric: "breeds"; value: number }
  | { metric: "streak"; value: number }
  | { metric: "friends"; value: number }
  | { metric: "league_win" }
  | { metric: "likes"; value: number };

const badgeThreshold: Record<BadgeType, BadgeThreshold> = {
  puppy_scout: { metric: "scans", value: 5 },
  park_rover: { metric: "scans", value: 25 },
  breed_hunter: { metric: "scans", value: 100 },
  master_spotter: { metric: "scans", value: 300 },
  common_collector: { metric: "breeds", value: 5 },
  kennel_expert: { metric: "breeds", value: 10 },
  dog_encyclopedia: { metric: "breeds", value: 25 },
  legendary_collector: { metric: "breeds", value: DOGDEX_TOTAL },
  daily_walker: { metric: "streak", value: 3 },
  consistent_collector: { metric: "streak", value: 7 },
  dog_obsessed: { metric: "streak", value: 30 },
  off_the_leash: { metric: "streak", value: 100 },
  pack_member: { metric: "friends", value: 3 },
  dog_squad: { metric: "friends", value: 10 },
  rival_spotter: { metric: "league_win" },
  community_favourite: { metric: "likes", value: 25 },
};

export interface BadgeProgressStats {
  totalScans: number;
  distinctBreeds: number;
  longestStreakDays: number;
  friendsCount: number;
  /** True when the user has an ended league (pilot win condition). */
  hasEndedLeague: boolean;
  likesReceived: number;
}

/**
 * Longest run of consecutive local calendar days with at least one scan.
 * Duplicated from the store helper so Profile can show streak progress
 * without importing Zustand internals.
 */
export function computeLongestScanStreak(scanIsoDates: string[]): number {
  if (scanIsoDates.length === 0) return 0;
  const days = new Set<number>();
  for (const iso of scanIsoDates) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    days.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  }
  if (days.size === 0) return 0;
  const sorted = Array.from(days).sort((a, b) => a - b);
  const oneDay = 24 * 60 * 60 * 1000;
  let best = 1;
  let curr = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((sorted[i] - sorted[i - 1]) / oneDay);
    if (diff === 1) {
      curr += 1;
      if (curr > best) best = curr;
    } else if (diff > 1) {
      curr = 1;
    }
  }
  return best;
}

/**
 * Short hint for the Profile achievements header: how much is left before
 * the next unearned badge in this category. Returns `null` when every badge
 * in the category is already unlocked.
 */
export function nextBadgeHintForCategory(
  category: BadgeCategory,
  unlocked: Set<BadgeType>,
  stats: BadgeProgressStats,
): string | null {
  const ids = badgesByCategory()[category];
  const nextId = ids.find((id) => !unlocked.has(id));
  if (!nextId) return null;

  const th = badgeThreshold[nextId];
  const nextLabel = badgeMeta[nextId].label;

  if (th.metric === "league_win") {
    return stats.hasEndedLeague ? `Almost there · ${nextLabel}` : `Win a league · ${nextLabel}`;
  }

  let current = 0;
  let unit = "";
  if (th.metric === "scans") {
    current = stats.totalScans;
    unit = "scan";
  } else if (th.metric === "breeds") {
    current = stats.distinctBreeds;
    unit = "breed";
  } else if (th.metric === "streak") {
    current = stats.longestStreakDays;
    unit = "day";
  } else if (th.metric === "friends") {
    current = stats.friendsCount;
    unit = "friend";
  } else if (th.metric === "likes") {
    current = stats.likesReceived;
    unit = "like";
  }

  const remaining = Math.max(0, th.value - current);
  if (remaining <= 0) {
    return `Almost there · ${nextLabel}`;
  }

  const plural = remaining === 1 ? unit : `${unit}s`;
  return `${remaining} more ${plural}`;
}
