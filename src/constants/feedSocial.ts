import type { FeedReactionKind } from "@/types/app";

export const FEED_REACTION_OPTIONS: { kind: FeedReactionKind; emoji: string; accessibilityLabel: string }[] = [
  { kind: "love", emoji: "❤️", accessibilityLabel: "Love" },
  { kind: "paw", emoji: "🐾", accessibilityLabel: "Paw" },
  { kind: "fire", emoji: "🔥", accessibilityLabel: "Fire" },
  { kind: "wow", emoji: "😍", accessibilityLabel: "Wow" },
];

export const MAX_FEED_COMMENT_LENGTH = 500;

/** Optional note on your own spot at save time (not the same as coat "Other" colour text). */
export const MAX_SPOT_COMMENT_LENGTH = 500;
