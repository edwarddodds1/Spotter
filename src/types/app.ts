import type { LeagueDurationPreset } from "@/constants/leagues";

export type BreedRarity = "common" | "uncommon" | "rare" | "legendary";

export type BadgeType =
  | "first_spot"
  | "ten_breeds"
  | "quarter_dex"
  | "half_dex"
  | "full_dex"
  | "rare_finder"
  | "legend_spotter"
  | "featured_hunter"
  | "century"
  | "social_pup"
  | "top_dog_owner";

export type FriendshipStatus = "pending" | "accepted" | "declined";

/** Coat colour option for a breed or generic spot flow (`id` stable for scan storage). */
export interface CoatColourOption {
  id: string;
  label: string;
  hex: string;
  /** Secondary colour for multi-colour swatches. */
  secondaryHex?: string;
  /** Visual style for multi-colour chips. */
  pattern?: "split" | "spots";
}

export interface Breed {
  id: string;
  name: string;
  rarity: BreedRarity;
  points: number;
  description: string;
  origin: string;
  temperament: string;
  size: string;
  lifespan: string;
  referencePhotoUrl: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  totalScans: number;
  createdAt: string;
  /** Home city (profile). */
  city: string;
  /** Home country (profile). */
  country: string;
}

export interface DogProfile {
  id: string;
  name: string;
  breedId: string;
  ownerId: string | null;
  totalScans: number;
}

export type JournalDogSex = "male" | "female" | "unknown";

/** User-owned dog listed in Profile journal (not tied to community DogProfile scans). */
export interface JournalDog {
  id: string;
  userId: string;
  name: string;
  breedId: string;
  sex: JournalDogSex;
  ageOrBirthNote: string | null;
  coatDescription: string | null;
  personalityNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanRecord {
  id: string;
  userId: string;
  breedId: string | null;
  photoUrl: string;
  dogName: string | null;
  dogProfileId?: string | null;
  locationLat: number | null;
  locationLng: number | null;
  /** Human-readable spot place (reverse-geocoded city/area; user can edit before save). */
  locationLabel: string | null;
  scannedAt: string;
  isPendingBreed: boolean;
  pointsAwarded: number;
  matchedFeaturedBreed: boolean;
  /** From `getCommonColoursForBreed` / generic palette; `other` + optional `coatColourNote`. */
  coatColourId: string | null;
  coatColourNote: string | null;
  /** Optional personal note about this spot (any coat colour). */
  spotComment: string | null;
  /** When true, hidden from the Social feed (still counts for your Dogdex / stats). */
  isPrivate: boolean;
}

export type CreateLeagueInput = {
  name: string;
  maxMembers: number;
  duration: LeagueDurationPreset;
  customDays?: number;
};

export interface League {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  /** Shareable code for deep links / manual entry. */
  inviteCode: string;
  maxMembers: number;
  /** When the league season ends; null = no fixed end. */
  endsAt: string | null;
  /** Demo/local count of members (creator counts as one). */
  memberCount: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  weeklyPoints: number;
  badges: BadgeType[];
  rank: number;
}

export interface SocialFeedItem {
  scan: ScanRecord;
  user: UserProfile;
  breed: Breed;
  dogProfile?: DogProfile | null;
  seenCount: number;
}

/** Quick reactions on a spot in the social feed (one per user per scan, changeable). */
export type FeedReactionKind = "love" | "paw" | "fire" | "wow";

export interface FeedReaction {
  id: string;
  scanId: string;
  userId: string;
  kind: FeedReactionKind;
}

export interface FeedComment {
  id: string;
  scanId: string;
  userId: string;
  body: string;
  createdAt: string;
}
