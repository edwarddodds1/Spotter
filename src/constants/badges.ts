import type { BadgeType } from "@/types/app";

import { DOGDEX_TOTAL } from "@/constants/app";

export const badgeCopy: Record<BadgeType, { label: string; description: string }> = {
  first_spot: { label: "First Spot", description: "You logged your very first scan. The journey begins." },
  ten_breeds: { label: "Decade Dogs", description: "10 different breeds in your Dogdex." },
  quarter_dex: {
    label: "Quarter Dex",
    description: `A quarter of the full Dogdex (${Math.ceil(DOGDEX_TOTAL * 0.25)} breeds).`,
  },
  half_dex: {
    label: "Half Dex",
    description: `Halfway there — ${Math.ceil(DOGDEX_TOTAL * 0.5)} breeds collected.`,
  },
  full_dex: { label: "Living Pokédex", description: `Every breed in the app (${DOGDEX_TOTAL}). Legendary dedication.` },
  rare_finder: { label: "Rare Finder", description: "You’ve spotted your first rare breed in the wild." },
  legend_spotter: { label: "Legend Spotter", description: "A legendary breed is on your record." },
  featured_hunter: { label: "Featured Hunter", description: "Scanned while that breed was featured — bonus points secured." },
  century: { label: "Century Club", description: "100 scans. You’re a regular on the trails." },
  social_pup: { label: "Social Pup", description: "Added your first friend. Spotting is better together." },
  top_dog_owner: { label: "Top Dog Owner", description: "One of your dogs hit 10 community scans." },
};

/** Order shown on Profile (story arc: start → collection → rarity → grind → social). */
export const badgeDisplayOrder: BadgeType[] = [
  "first_spot",
  "ten_breeds",
  "quarter_dex",
  "half_dex",
  "full_dex",
  "rare_finder",
  "legend_spotter",
  "featured_hunter",
  "century",
  "social_pup",
  "top_dog_owner",
];

/** One-line hint for locked badges. */
export const badgeUnlockHint: Record<BadgeType, string> = {
  first_spot: "Complete any scan",
  ten_breeds: "Collect 10 different breeds",
  quarter_dex: `Collect ${Math.ceil(DOGDEX_TOTAL * 0.25)} breeds`,
  half_dex: `Collect ${Math.ceil(DOGDEX_TOTAL * 0.5)} breeds`,
  full_dex: `Collect all ${DOGDEX_TOTAL} breeds`,
  rare_finder: "Scan a rare breed",
  legend_spotter: "Scan a legendary breed",
  featured_hunter: "Scan the featured breed",
  century: "Reach 100 total scans",
  social_pup: "Add a friend",
  top_dog_owner: "Get a dog to 10 scans by others",
};
