import { create } from "zustand";

import {
  DOGDEX_TOTAL,
  FEATURED_MULTIPLIER,
  MAX_JOURNAL_DOG_FIELD_LENGTH,
  MAX_SCAN_LOCATION_LABEL_LENGTH,
  RECENT_BREED_LIMIT,
} from "@/constants/app";
import { badgeCopy, badgeDisplayOrder, isKnownBadge } from "@/constants/badges";
import { COAT_OTHER_ID } from "@/constants/breedCoatColours";
import { breedsCatalog, RARITY_POINTS } from "@/constants/breeds";
import { variantThresholds } from "@/constants/theme";
import { endsAtForDuration, generateUniqueInviteCode } from "@/constants/leagues";
import type {
  AppNotification,
  BadgeType,
  BadgeUnlock,
  Breed,
  CreateLeagueInput,
  DogProfile,
  FeedComment,
  FeedReaction,
  FeedReactionKind,
  JournalDog,
  JournalDogSex,
  League,
  ScanRecord,
  UserProfile,
} from "@/types/app";
import { MAX_FEED_COMMENT_LENGTH, MAX_SPOT_COMMENT_LENGTH } from "@/constants/feedSocial";
import { fetchBreedsFromSupabase } from "@/lib/supabase/breedsRemote";
import { mergeScansForUser } from "@/lib/supabase/scansRemote";

interface SpotDraft {
  photoUri: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationLabel: string | null;
  selectedBreedId: string | null;
  coatColourId: string | null;
  coatColourNote: string | null;
  spotComment: string | null;
  /** When true, saved scan is not shown on Social feed */
  isPrivate?: boolean;
}

/** Built-in demo / friend rows — not real user progress. */
export const DEMO_SEED_SCAN_IDS = new Set([
  "scan-1",
  "scan-2",
  "scan-3",
  "scan-friend-mel",
  "scan-friend-bris",
]);

const SYSTEM_USER_IDS = new Set(["demo-user", "friend-1", "friend-2"]);

function stripDemoSeedScans(scans: ScanRecord[]): ScanRecord[] {
  return scans.filter((s) => !DEMO_SEED_SCAN_IDS.has(s.id));
}

/**
 * Attach local spots to the signed-in account when they were saved under a prior
 * auth id, demo-user, or another orphaned user id on this device.
 */
function claimScansForSignedInUser(
  scans: ScanRecord[],
  nextUserId: string,
  previousLinkedAuthUserId: string | null,
): ScanRecord[] {
  let next = scans.map((s) => (s.userId === "demo-user" ? { ...s, userId: nextUserId } : s));

  if (previousLinkedAuthUserId && previousLinkedAuthUserId !== nextUserId) {
    next = next.map((s) =>
      s.userId === previousLinkedAuthUserId ? { ...s, userId: nextUserId } : s,
    );
  }

  return stripDemoSeedScans(next);
}

export interface SpotterState {
  themeMode: "light" | "dark";
  currentUser: UserProfile;
  /** Last Supabase auth user id — used to reclaim spots after account/device changes. */
  linkedAuthUserId: string | null;
  breeds: Breed[];
  scans: ScanRecord[];
  dogProfiles: DogProfile[];
  /** Dogs you own — Profile journal questionnaire. */
  journalDogs: JournalDog[];
  recentBreedIds: string[];
  featuredBreedId: string;
  featuredBreedDateKey: string;
  badges: BadgeType[];
  friends: UserProfile[];
  /** Friend requests sent TO me, still pending my accept/decline. */
  pendingFriendRequests: UserProfile[];
  /** Friend requests I have sent, still awaiting the other side's accept. */
  outgoingFriendRequests: UserProfile[];
  /**
   * Public-feed authors who aren't the current user or a friend. Hydrated by
   * `applyPublicScansFromRemote` so the feed can render usernames/avatars
   * without per-row lookups.
   */
  knownUsers: UserProfile[];
  /** Most recent in-app notifications for the signed-in user (server source of truth). */
  notifications: AppNotification[];
  /** Recent badge unlocks across all users — used to render achievements in the Social feed. */
  badgeUnlocks: BadgeUnlock[];
  leagues: League[];
  feedReactions: FeedReaction[];
  feedComments: FeedComment[];
  weeklyPoints: number;
  /** Bumped when a scan photo is replaced in-place so ScanPhoto reloads signed URLs. */
  photoVersions: Record<string, number>;
  spotDraft: SpotDraft;
  setSpotDraft: (draft: Partial<SpotDraft>) => void;
  clearSpotDraft: () => void;
  addRecentBreed: (breedId: string) => void;
  refreshFeaturedBreedForToday: () => void;
  /** Merge `public.breeds` from Supabase over the local catalog (authenticated fetch). */
  refreshBreedsFromRemote: () => Promise<void>;
  completeScan: (input: {
    breedId: string | null;
    photoUrl: string;
    dogName?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationLabel?: string | null;
    coatColourId?: string | null;
    coatColourNote?: string | null;
    spotComment?: string | null;
    isPrivate?: boolean;
  }) => { scan: ScanRecord; isFirstBreed: boolean; variantUnlocked: boolean; dogProfile?: DogProfile | null };
  deleteScan: (scanId: string) => void;
  setScanPrivate: (scanId: string, isPrivate: boolean) => void;
  assignPendingBreed: (
    scanId: string,
    breedId: string,
    options?: { coatColourId?: string | null; coatColourNote?: string | null },
  ) => {
    isFirstBreed: boolean;
    updatedScan: ScanRecord | null;
    matchedFeatured: boolean;
  };
  /**
   * Mark a pending scan as resolved without identifying the breed (user chose
   * "Other / Unknown"). The scan stays in the user's history but no longer
   * blocks the Untagged section and doesn't unlock any Dogdex tile.
   */
  resolvePendingScanAsOther: (scanId: string) => ScanRecord | null;
  /**
   * Patch editable non-breed fields on one of the current user's scans
   * (location, comment, privacy, coat colour). Returns the updated record so
   * the caller can persist it to Supabase.
   */
  updateScanDetails: (
    scanId: string,
    fields: {
      locationLabel?: string | null;
      spotComment?: string | null;
      isPrivate?: boolean;
      coatColourId?: string | null;
      coatColourNote?: string | null;
    },
  ) => ScanRecord | null;
  /**
   * Merge scans + dog_profiles fetched from Supabase into local state.
   * Remote rows for the given `userId` overwrite local copies by `id`; any local
   * scan still belonging to the user that is not present remotely is dropped
   * (treated as deleted on another device). Scans for other users are preserved.
   */
  hydrateUserScansFromRemote: (input: {
    userId: string;
    scans: ScanRecord[];
    dogProfiles: DogProfile[];
  }) => void;
  /** Replace scans after remote sync; recomputes badges and totalScans for the signed-in user. */
  applyScansAfterSync: (scans: ScanRecord[]) => void;
  /**
   * Replace scans owned by accepted friends with a fresh server snapshot.
   * Scans for the signed-in user and any other unrelated users are untouched.
   * Dog profiles are merged in by id.
   */
  applyFriendsScansFromRemote: (input: {
    friendUserIds: string[];
    scans: ScanRecord[];
    dogProfiles: DogProfile[];
  }) => void;
  /**
   * Additively merge a server snapshot of public-feed scans + the public
   * profiles of their authors. Existing rows (self / friends / already cached
   * public) are upserted by id; nothing is dropped. Author profiles for
   * non-self / non-friend users are written into `knownUsers`.
   */
  applyPublicScansFromRemote: (input: {
    scans: ScanRecord[];
    dogProfiles: DogProfile[];
    users: UserProfile[];
  }) => void;
  bumpPhotoVersion: (scanId: string) => void;
  /** Load built-in demo friends, leagues, and sample scans (demo mode only). */
  loadDemoSeed: () => void;
  setAvatar: (avatarUrl: string) => void;
  setCurrentUserIdentity: (input: {
    id: string;
    username?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    country?: string | null;
  }) => void;
  setUsername: (username: string) => void;
  setUserLocation: (city: string, country: string) => void;
  addLeagueFriendRequest: (username: string) => void;
  /**
   * Replace local friend / incoming / outgoing lists with the latest bundle
   * fetched from Supabase. Used by `loadFriendships`.
   */
  setFriendshipsFromServer: (bundle: {
    friends: UserProfile[];
    incoming: UserProfile[];
    outgoing: UserProfile[];
  }) => void;
  /** Optimistic add to outgoing list after a successful sendFriendRequest. */
  addOutgoingFriendRequest: (profile: UserProfile) => void;
  /** Remove an incoming request by the requester's user id (after accept or decline). */
  removeIncomingRequestById: (fromUserId: string) => void;
  /** Remove an outgoing request by the recipient's user id (after cancel/decline). */
  removeOutgoingRequestById: (toUserId: string) => void;
  /** Promote a pending request from the requester to an accepted friend. */
  promoteIncomingRequestToFriend: (fromUserId: string) => void;
  /** Remove a friend from the accepted list (after a successful unfriend). */
  removeFriendById: (otherUserId: string) => void;
  /** Replace the in-app notifications list with the latest server snapshot. */
  setNotificationsFromServer: (notifications: AppNotification[]) => void;
  /** Mark every notification as read locally (after server confirmation). */
  markAllNotificationsRead: () => void;
  /**
   * Replace the badge-unlocks feed source with the latest server snapshot.
   * Also merges any user rows from the same query into `knownUsers` so the
   * feed can render avatars/usernames without per-row lookups.
   */
  setBadgeUnlocksFromServer: (input: { unlocks: BadgeUnlock[]; users: UserProfile[] }) => void;
  createLeague: (input: CreateLeagueInput) => void;
  /**
   * Pilot demo: send `league_invite` notifications. In a multi-user build
   * these land in each `friendUserId`'s notifications; locally we mirror them
   * into the current user's own list so the inviter can preview the flow.
   */
  inviteFriendsToLeague: (input: {
    leagueId: string;
    leagueName: string;
    friendUserIds: string[];
  }) => void;
  /** Pilot: dismiss a `league_invite` notification once the user accepts. */
  acceptLeagueInvite: (notificationId: string) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleFeedReaction: (scanId: string, kind: FeedReactionKind) => void;
  addFeedComment: (scanId: string, body: string) => void;
  removeFeedComment: (commentId: string) => void;
  addJournalDog: (input: {
    name: string;
    photoUrl?: string | null;
    breedId: string;
    sex: JournalDogSex;
    ageOrBirthNote?: string | null;
    coatDescription?: string | null;
    personalityNotes?: string | null;
  }) => void;
  updateJournalDog: (
    id: string,
    patch: Partial<{
      name: string;
      photoUrl: string | null;
      breedId: string;
      sex: JournalDogSex;
      ageOrBirthNote: string | null;
      coatDescription: string | null;
      personalityNotes: string | null;
    }>,
  ) => void;
  removeJournalDog: (id: string) => void;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Stable UUID v4 — used for ids stored in Supabase (`scans.id`, `dog_profiles.id`). */
function createUuid(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" && (globalThis as { crypto?: Crypto }).crypto
      ? (globalThis as { crypto: Crypto }).crypto
      : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function getDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getFeaturedPoolForDate(breeds: Breed[], date = new Date()): Breed[] {
  const dateKey = getDateKey(date);
  const baseSeed = dateKey.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const commonBreeds = breeds.filter((breed) => breed.rarity === "common");
  const uncommonBreeds = breeds.filter((breed) => breed.rarity === "uncommon");
  const rareBreeds = breeds.filter((breed) => breed.rarity === "rare");

  const rarityRoll = seededRandom(baseSeed);
  return rarityRoll < 0.45
    ? commonBreeds
    : rarityRoll < 0.9
      ? uncommonBreeds
      : rareBreeds.length > 0
        ? rareBreeds
        : uncommonBreeds.length > 0
          ? uncommonBreeds
          : commonBreeds;
}

function pickFeaturedBreedIdForDate(breeds: Breed[], date = new Date()): string {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const baseSeed = dateKey.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selectedPool = getFeaturedPoolForDate(breeds, date);

  const indexSeed = baseSeed * 9973 + 37;
  const selectedIndex = Math.floor(seededRandom(indexSeed) * selectedPool.length);
  return selectedPool[selectedIndex]?.id ?? breeds[0]?.id ?? "cavoodle";
}

function pickFeaturedBreedIdForTodayNoRepeat(breeds: Breed[], date = new Date()): string {
  if (breeds.length === 0) return "cavoodle";
  const todayId = pickFeaturedBreedIdForDate(breeds, date);
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayId = pickFeaturedBreedIdForDate(breeds, yesterday);
  if (todayId !== yesterdayId) return todayId;

  const todayPool = getFeaturedPoolForDate(breeds, date);
  const fallbackPool = todayPool.length > 1 ? todayPool : breeds;
  const idx = fallbackPool.findIndex((breed) => breed.id === todayId);
  if (idx === -1) return fallbackPool[0]?.id ?? todayId;
  return fallbackPool[(idx + 1) % fallbackPool.length]?.id ?? todayId;
}

/**
 * Longest run of consecutive *local* calendar days that contain at least one
 * non-pending scan. Used to drive the streak badge tier. Permanent — we don't
 * decay the badge once a streak is reached.
 */
function computeLongestStreak(scanIsoDates: string[]): number {
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
 * Single source of truth for which badges a user has earned. Re-runs on
 * every scan / friend / reaction change. The result is unioned with the
 * caller's previous list so badges are "sticky" — once earned, always
 * shown (matters for weekly-reset conditions like Rival Spotter).
 */
function recomputeBadges(input: {
  previous: BadgeType[];
  scans: ScanRecord[];
  breeds: Breed[];
  userId: string;
  friendsCount: number;
  leagues: League[];
  feedReactions: FeedReaction[];
}): BadgeType[] {
  const { previous, scans, userId, friendsCount, leagues, feedReactions } = input;

  const userScans = scans.filter((s) => s.userId === userId && !s.isPendingBreed);
  const totalScans = userScans.length;
  const distinctBreeds = new Set(
    userScans
      .map((s) => s.breedId)
      .filter((id): id is string => Boolean(id)),
  );
  const distinctCount = distinctBreeds.size;
  const longestStreak = computeLongestStreak(userScans.map((s) => s.scannedAt));

  const myScanIds = new Set(
    scans.filter((s) => s.userId === userId).map((s) => s.id),
  );
  const likesReceived = feedReactions.filter((r) => myScanIds.has(r.scanId)).length;

  const earned = new Set<BadgeType>();
  // Discovery
  if (totalScans >= 5) earned.add("puppy_scout");
  if (totalScans >= 25) earned.add("park_rover");
  if (totalScans >= 100) earned.add("breed_hunter");
  if (totalScans >= 300) earned.add("master_spotter");
  // Collection
  if (distinctCount >= 5) earned.add("common_collector");
  if (distinctCount >= 10) earned.add("kennel_expert");
  if (distinctCount >= 25) earned.add("dog_encyclopedia");
  if (distinctCount >= DOGDEX_TOTAL) earned.add("legendary_collector");
  // Streaks
  if (longestStreak >= 3) earned.add("daily_walker");
  if (longestStreak >= 7) earned.add("consistent_collector");
  if (longestStreak >= 30) earned.add("dog_obsessed");
  if (longestStreak >= 100) earned.add("off_the_leash");
  // Social
  if (friendsCount >= 3) earned.add("pack_member");
  if (friendsCount >= 10) earned.add("dog_squad");
  /**
   * "Spotter Champ" — win a league. Pilot leagues keep the signed-in user
   * on top of the mock leaderboard, so a league that has reached its
   * `endsAt` counts as a win. Once earned the badge is sticky via the
   * previous-union below, so it survives a league disappearing later.
   */
  const now = Date.now();
  if (
    leagues.some((league) => {
      if (!league.endsAt) return false;
      const ended = Date.parse(league.endsAt);
      return Number.isFinite(ended) && ended <= now;
    })
  ) {
    earned.add("rival_spotter");
  }
  if (likesReceived >= 25) earned.add("community_favourite");

  const merged = new Set<BadgeType>();
  for (const id of previous) if (isKnownBadge(id)) merged.add(id);
  for (const id of earned) merged.add(id);
  return Array.from(merged);
}

const starterUser: UserProfile = {
  id: "demo-user",
  username: "spotter.sam",
  avatarUrl: null,
  totalScans: 7,
  createdAt: "2026-04-01T08:00:00.000Z",
  city: "Sydney",
  country: "Australia",
};

const starterFriends: UserProfile[] = [
  {
    id: "friend-1",
    username: "mochi.mum",
    avatarUrl: null,
    totalScans: 21,
    createdAt: "2026-04-02T08:00:00.000Z",
    city: "Melbourne",
    country: "Australia",
  },
  {
    id: "friend-2",
    username: "park.patrol",
    avatarUrl: null,
    totalScans: 15,
    createdAt: "2026-04-05T08:00:00.000Z",
    city: "Brisbane",
    country: "Australia",
  },
];

const starterPendingFriendRequests: UserProfile[] = [];

const starterScans: ScanRecord[] = [
  {
    id: "scan-1",
    userId: starterUser.id,
    breedId: "cavoodle",
    photoUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80",
    dogName: "Mochi",
    dogProfileId: "dog-1",
    locationLat: -33.8707,
    locationLng: 151.208,
    locationLabel: "Sydney, New South Wales, Australia",
    scannedAt: "2026-04-15T06:00:00.000Z",
    isPendingBreed: false,
    pointsAwarded: 3,
    matchedFeaturedBreed: true,
    coatColourId: "apricot",
    coatColourNote: null,
    spotComment: null,
    isPrivate: false,
  },
  {
    id: "scan-2",
    userId: starterUser.id,
    breedId: "border-collie",
    photoUrl: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=600&q=80",
    dogName: null,
    dogProfileId: null,
    locationLat: -33.872,
    locationLng: 151.211,
    locationLabel: "Sydney, New South Wales, Australia",
    scannedAt: "2026-04-14T06:00:00.000Z",
    isPendingBreed: false,
    pointsAwarded: 1,
    matchedFeaturedBreed: false,
    coatColourId: null,
    coatColourNote: null,
    spotComment: null,
    isPrivate: false,
  },
  {
    id: "scan-3",
    userId: starterUser.id,
    breedId: null,
    photoUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80",
    dogName: null,
    dogProfileId: null,
    locationLat: -33.865,
    locationLng: 151.215,
    locationLabel: "Sydney, New South Wales, Australia",
    scannedAt: "2026-04-13T06:00:00.000Z",
    isPendingBreed: true,
    pointsAwarded: 0,
    matchedFeaturedBreed: false,
    coatColourId: null,
    coatColourNote: null,
    spotComment: null,
    isPrivate: false,
  },
  {
    id: "scan-friend-mel",
    userId: "friend-1",
    breedId: "golden-retriever",
    photoUrl: "https://images.unsplash.com/photo-1633722715463-ad30fc994ce8?auto=format&fit=crop&w=600&q=80",
    dogName: "Sunny",
    dogProfileId: null,
    locationLat: -37.8136,
    locationLng: 144.9631,
    locationLabel: "Melbourne, Victoria, Australia",
    scannedAt: "2026-04-16T08:30:00.000Z",
    isPendingBreed: false,
    pointsAwarded: 1,
    matchedFeaturedBreed: false,
    coatColourId: null,
    coatColourNote: null,
    spotComment: "Met at the riverside path — so gentle with kids.",
    isPrivate: false,
  },
  {
    id: "scan-friend-bris",
    userId: "friend-2",
    breedId: "labrador-retriever",
    photoUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80",
    dogName: null,
    dogProfileId: null,
    locationLat: -27.4698,
    locationLng: 153.0251,
    locationLabel: "Brisbane, Queensland, Australia",
    scannedAt: "2026-04-16T05:15:00.000Z",
    isPendingBreed: false,
    pointsAwarded: 1,
    matchedFeaturedBreed: false,
    coatColourId: null,
    coatColourNote: null,
    spotComment: null,
    isPrivate: false,
  },
];

const starterDogProfiles: DogProfile[] = [
  { id: "dog-1", name: "Mochi", breedId: "cavoodle", ownerId: "friend-1", totalScans: 3 },
  { id: "dog-2", name: "Luna", breedId: "border-collie", ownerId: null, totalScans: 2 },
];

const starterFeedReactions: FeedReaction[] = [
  { id: "react-demo-1", scanId: "scan-1", userId: "friend-1", kind: "love" },
  { id: "react-demo-2", scanId: "scan-1", userId: "friend-2", kind: "paw" },
];

const starterFeedComments: FeedComment[] = [
  {
    id: "comment-demo-1",
    scanId: "scan-1",
    userId: "friend-1",
    body: "What a sweet cavoodle!",
    createdAt: "2026-04-15T07:00:00.000Z",
  },
];

function deriveRecentBreedIdsFromScans(userId: string, scans: ScanRecord[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scans) {
    if (s.userId !== userId || !s.breedId) continue;
    if (seen.has(s.breedId)) continue;
    seen.add(s.breedId);
    out.push(s.breedId);
    if (out.length >= RECENT_BREED_LIMIT) break;
  }
  return out;
}

function scrubDogProfilesForUser(userId: string, scans: ScanRecord[], existing: DogProfile[]): DogProfile[] {
  const linkedIds = new Set(
    scans.filter((s) => s.userId === userId && s.dogProfileId).map((s) => s.dogProfileId as string),
  );
  return existing.filter((d) => d.ownerId === userId || linkedIds.has(d.id));
}

/** Empty progress for signed-out / fresh installs — no fake friends, leagues, or demo scans. */
const emptyShellUser: UserProfile = {
  id: "guest",
  username: "",
  avatarUrl: null,
  totalScans: 0,
  createdAt: new Date().toISOString(),
  city: "",
  country: "",
};

export const useSpotterStore = create<SpotterState>()(
  (set, get) => ({
  themeMode: "light",
  currentUser: emptyShellUser,
  linkedAuthUserId: null,
  breeds: breedsCatalog,
  scans: [],
  dogProfiles: [],
  journalDogs: [],
  recentBreedIds: [],
  featuredBreedId: pickFeaturedBreedIdForTodayNoRepeat(breedsCatalog),
  featuredBreedDateKey: getDateKey(),
  badges: [],
  friends: [],
  pendingFriendRequests: [],
  outgoingFriendRequests: [],
  knownUsers: [],
  notifications: [],
  badgeUnlocks: [],
  leagues: [],
  feedReactions: [],
  feedComments: [],
  weeklyPoints: 0,
  photoVersions: {},
  spotDraft: {
    photoUri: null,
    locationLat: null,
    locationLng: null,
    locationLabel: null,
    selectedBreedId: null,
    coatColourId: null,
    coatColourNote: null,
    spotComment: null,
    isPrivate: false,
  },
  setSpotDraft: (draft) =>
    set((state) => ({
      spotDraft: {
        ...state.spotDraft,
        ...draft,
      },
    })),
  clearSpotDraft: () =>
    set({
      spotDraft: {
        photoUri: null,
        locationLat: null,
        locationLng: null,
        locationLabel: null,
        selectedBreedId: null,
        coatColourId: null,
        coatColourNote: null,
        spotComment: null,
        isPrivate: false,
      },
    }),
  addRecentBreed: (breedId) =>
    set((state) => ({
      recentBreedIds: [breedId, ...state.recentBreedIds.filter((id) => id !== breedId)].slice(0, RECENT_BREED_LIMIT),
    })),
    refreshFeaturedBreedForToday: () =>
    set((state) => {
      const todayKey = getDateKey();
      if (state.featuredBreedDateKey === todayKey) return state;
      return {
        featuredBreedId: pickFeaturedBreedIdForTodayNoRepeat(state.breeds, new Date()),
        featuredBreedDateKey: todayKey,
      };
    }),
  refreshBreedsFromRemote: async () => {
    const next = await fetchBreedsFromSupabase();
    if (!next) return;
    set({ breeds: next });
  },
  completeScan: ({
    breedId,
    photoUrl,
    dogName,
    locationLat,
    locationLng,
    locationLabel,
    coatColourId,
    coatColourNote,
    spotComment,
    isPrivate,
  }) => {
    const state = get();
    const breed = breedId ? state.breeds.find((item) => item.id === breedId) : null;
    const matchedFeaturedBreed = Boolean(breed && breed.id === state.featuredBreedId);
    const basePoints = breed ? RARITY_POINTS[breed.rarity] : 0;
    const totalPoints = matchedFeaturedBreed ? basePoints * FEATURED_MULTIPLIER : basePoints;
    const now = new Date().toISOString();
    const existingBreedScans = breedId
      ? state.scans.filter((scan) => scan.userId === state.currentUser.id && scan.breedId === breedId).length
      : 0;
    const isFirstBreed = Boolean(breedId && existingBreedScans === 0);

    let dogProfile: DogProfile | null = null;
    if (breedId && dogName?.trim()) {
      const normalizedName = normalizeName(dogName);
      dogProfile =
        state.dogProfiles.find(
          (item) => item.breedId === breedId && normalizeName(item.name) === normalizedName,
        ) ?? null;
      if (dogProfile) {
        dogProfile = { ...dogProfile, totalScans: dogProfile.totalScans + 1 };
      } else {
        dogProfile = {
          id: createUuid(),
          name: dogName.trim(),
          breedId,
          ownerId: null,
          totalScans: 1,
        };
      }
    }

    const trimmedNote = coatColourNote?.trim() ? coatColourNote.trim() : null;
    const rawComment = spotComment?.trim() ?? "";
    const trimmedSpotComment = rawComment ? rawComment.slice(0, MAX_SPOT_COMMENT_LENGTH) : null;
    const rawPlace = locationLabel?.trim() ?? "";
    const trimmedLocationLabel = rawPlace ? rawPlace.slice(0, MAX_SCAN_LOCATION_LABEL_LENGTH) : null;
    const scan: ScanRecord = {
      id: createUuid(),
      userId: state.currentUser.id,
      breedId,
      photoUrl,
      dogName: dogName?.trim() ? dogName.trim() : null,
      dogProfileId: dogProfile?.id ?? null,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      locationLabel: trimmedLocationLabel,
      scannedAt: now,
      isPendingBreed: !breedId,
      pointsAwarded: totalPoints,
      matchedFeaturedBreed,
      coatColourId: coatColourId ?? null,
      coatColourNote: coatColourId === COAT_OTHER_ID ? trimmedNote : null,
      spotComment: trimmedSpotComment,
      isPrivate: Boolean(isPrivate),
    };

    const allScans = [scan, ...state.scans];
    const breedScanCount = breedId
      ? allScans.filter((item) => item.userId === state.currentUser.id && item.breedId === breedId).length
      : 0;
    const variantUnlocked = Boolean(breed && breedScanCount >= variantThresholds[breed.rarity]);
    const badges = recomputeBadges({
      previous: state.badges,
      scans: allScans,
      breeds: state.breeds,
      userId: state.currentUser.id,
      friendsCount: state.friends.length,
      leagues: state.leagues,
      feedReactions: state.feedReactions,
    });

    set((current) => ({
      scans: [scan, ...current.scans],
      dogProfiles: dogProfile
        ? current.dogProfiles.some((item) => item.id === dogProfile?.id)
          ? current.dogProfiles.map((item) => (item.id === dogProfile?.id ? dogProfile! : item))
          : [dogProfile, ...current.dogProfiles]
        : current.dogProfiles,
      badges,
      weeklyPoints: current.weeklyPoints + totalPoints,
      recentBreedIds: breedId
        ? [breedId, ...current.recentBreedIds.filter((id) => id !== breedId)].slice(0, RECENT_BREED_LIMIT)
        : current.recentBreedIds,
      currentUser: {
        ...current.currentUser,
        totalScans: current.currentUser.totalScans + 1,
      },
    }));

    return { scan, isFirstBreed, variantUnlocked, dogProfile };
  },
  deleteScan: (scanId) => {
    const state = get();
    const scan = state.scans.find((s) => s.id === scanId);
    if (!scan || scan.userId !== state.currentUser.id) return;

    const nextScans = state.scans.filter((s) => s.id !== scanId);
    const points = scan.pointsAwarded;
    let nextDogProfiles = state.dogProfiles;
    if (scan.dogProfileId) {
      nextDogProfiles = state.dogProfiles.map((d) =>
        d.id === scan.dogProfileId ? { ...d, totalScans: Math.max(0, d.totalScans - 1) } : d,
      );
    }
    const nextWeekly = Math.max(0, state.weeklyPoints - points);
    const badges = recomputeBadges({
      previous: state.badges,
      scans: nextScans,
      breeds: state.breeds,
      userId: state.currentUser.id,
      friendsCount: state.friends.length,
      leagues: state.leagues,
      feedReactions: state.feedReactions,
    });

    set({
      scans: nextScans,
      weeklyPoints: nextWeekly,
      currentUser: {
        ...state.currentUser,
        totalScans: Math.max(0, state.currentUser.totalScans - 1),
      },
      dogProfiles: nextDogProfiles,
      badges,
      feedReactions: state.feedReactions.filter((r) => r.scanId !== scanId),
      feedComments: state.feedComments.filter((c) => c.scanId !== scanId),
    });
  },
  setScanPrivate: (scanId, isPrivate) =>
    set((st) => {
      const scan = st.scans.find((s) => s.id === scanId);
      if (!scan || scan.userId !== st.currentUser.id) return st;
      return {
        scans: st.scans.map((s) => (s.id === scanId ? { ...s, isPrivate } : s)),
      };
    }),
  assignPendingBreed: (scanId, breedId, options) => {
    let result: {
      isFirstBreed: boolean;
      updatedScan: ScanRecord | null;
      matchedFeatured: boolean;
    } = { isFirstBreed: false, updatedScan: null, matchedFeatured: false };
    set((state) => {
      const scan = state.scans.find((s) => s.id === scanId);
      const breed = state.breeds.find((b) => b.id === breedId);
      if (!scan || !breed || scan.userId !== state.currentUser.id) return {};
      const matchedFeatured = breed.id === state.featuredBreedId;
      const base = RARITY_POINTS[breed.rarity];
      const nextAwarded = matchedFeatured ? base * FEATURED_MULTIPLIER : base;
      const delta = nextAwarded - scan.pointsAwarded;
      /** First time this user gets a confirmed (non-pending) scan for this breed. */
      const alreadyHas = state.scans.some(
        (s) =>
          s.userId === state.currentUser.id &&
          s.breedId === breedId &&
          !s.isPendingBreed &&
          s.id !== scanId,
      );
      const isFirstBreed = !alreadyHas;

      const hasCoatOverride = options !== undefined && "coatColourId" in options;
      const nextCoatId = hasCoatOverride ? options?.coatColourId ?? null : scan.coatColourId;
      const trimmedNote = options?.coatColourNote?.trim() ? options.coatColourNote.trim() : null;
      const nextCoatNote =
        nextCoatId === COAT_OTHER_ID
          ? hasCoatOverride
            ? trimmedNote
            : scan.coatColourNote
          : null;

      const updatedScan: ScanRecord = {
        ...scan,
        breedId,
        isPendingBreed: false,
        matchedFeaturedBreed: matchedFeatured,
        pointsAwarded: nextAwarded,
        coatColourId: nextCoatId,
        coatColourNote: nextCoatNote,
      };
      const nextScans = state.scans.map((s) => (s.id === scanId ? updatedScan : s));
      const nextWeekly = state.weeklyPoints + delta;
      const badges = recomputeBadges({
        previous: state.badges,
        scans: nextScans,
        breeds: state.breeds,
        userId: state.currentUser.id,
        friendsCount: state.friends.length,
        leagues: state.leagues,
        feedReactions: state.feedReactions,
      });
      result = { isFirstBreed, updatedScan, matchedFeatured };
      return {
        scans: nextScans,
        recentBreedIds: [breedId, ...state.recentBreedIds.filter((id) => id !== breedId)].slice(0, RECENT_BREED_LIMIT),
        weeklyPoints: nextWeekly,
        badges,
      };
    });
    return result;
  },
  updateScanDetails: (scanId, fields) => {
    let updated: ScanRecord | null = null;
    set((state) => {
      const scan = state.scans.find((s) => s.id === scanId);
      if (!scan || scan.userId !== state.currentUser.id) return {};

      const nextLocationLabel =
        "locationLabel" in fields
          ? fields.locationLabel?.trim()
            ? fields.locationLabel.trim().slice(0, MAX_SCAN_LOCATION_LABEL_LENGTH)
            : null
          : scan.locationLabel;

      const nextSpotComment =
        "spotComment" in fields
          ? fields.spotComment?.trim()
            ? fields.spotComment.trim().slice(0, MAX_SPOT_COMMENT_LENGTH)
            : null
          : scan.spotComment;

      const nextIsPrivate =
        "isPrivate" in fields && fields.isPrivate !== undefined ? fields.isPrivate : scan.isPrivate;

      const hasCoatOverride = "coatColourId" in fields;
      const nextCoatId = hasCoatOverride ? fields.coatColourId ?? null : scan.coatColourId;
      const trimmedNote = fields.coatColourNote?.trim() ? fields.coatColourNote.trim() : null;
      const nextCoatNote =
        nextCoatId === COAT_OTHER_ID
          ? hasCoatOverride
            ? trimmedNote
            : scan.coatColourNote
          : null;

      updated = {
        ...scan,
        locationLabel: nextLocationLabel,
        spotComment: nextSpotComment,
        isPrivate: nextIsPrivate,
        coatColourId: nextCoatId,
        coatColourNote: nextCoatNote,
      };
      const nextScans = state.scans.map((s) => (s.id === scanId ? updated! : s));
      return { scans: nextScans };
    });
    return updated;
  },
  resolvePendingScanAsOther: (scanId) => {
    let updated: ScanRecord | null = null;
    set((state) => {
      const scan = state.scans.find((s) => s.id === scanId);
      if (!scan || scan.userId !== state.currentUser.id) return {};
      const delta = -scan.pointsAwarded;
      updated = {
        ...scan,
        breedId: null,
        isPendingBreed: false,
        matchedFeaturedBreed: false,
        pointsAwarded: 0,
        coatColourId: null,
        coatColourNote: null,
      };
      const nextScans = state.scans.map((s) => (s.id === scanId ? updated! : s));
      const nextWeekly = state.weeklyPoints + delta;
      const badges = recomputeBadges({
        previous: state.badges,
        scans: nextScans,
        breeds: state.breeds,
        userId: state.currentUser.id,
        friendsCount: state.friends.length,
        leagues: state.leagues,
        feedReactions: state.feedReactions,
      });
      return {
        scans: nextScans,
        weeklyPoints: nextWeekly,
        badges,
      };
    });
    return updated;
  },
  hydrateUserScansFromRemote: ({ userId, scans: remoteScans, dogProfiles: remoteDogs }) =>
    set((state) => {
      const localCountBefore = state.scans.filter((s) => s.userId === userId).length;
      const nextScans = mergeScansForUser(userId, state.scans, remoteScans);
      const localCountAfter = nextScans.filter((s) => s.userId === userId).length;

      if (localCountBefore > 0 && localCountAfter === 0) {
        console.warn("[hydrateUserScansFromRemote] refused to wipe local scans for user", userId);
        return state;
      }

      const dogIds = new Set(state.dogProfiles.map((d) => d.id));
      const newDogs = remoteDogs.filter((d) => !dogIds.has(d.id));
      const mergedDogs = state.dogProfiles
        .map((d) => remoteDogs.find((r) => r.id === d.id) ?? d)
        .concat(newDogs);

      const userScanCount = nextScans.filter((s) => s.userId === userId).length;
      const badges = recomputeBadges({
        previous: state.badges,
        scans: nextScans,
        breeds: state.breeds,
        userId,
        friendsCount: state.friends.length,
        leagues: state.leagues,
        feedReactions: state.feedReactions,
      });

      const nextCurrentUser =
        state.currentUser.id === userId
          ? { ...state.currentUser, totalScans: Math.max(state.currentUser.totalScans, userScanCount) }
          : state.currentUser;

      return {
        scans: nextScans,
        dogProfiles: mergedDogs,
        badges,
        currentUser: nextCurrentUser,
      };
    }),
  applyScansAfterSync: (scans) =>
    set((state) => {
      const userId = state.currentUser.id;
      const userScanCount = scans.filter((s) => s.userId === userId).length;
      const badges = recomputeBadges({
        previous: state.badges,
        scans,
        breeds: state.breeds,
        userId,
        friendsCount: state.friends.length,
        leagues: state.leagues,
        feedReactions: state.feedReactions,
      });
      return {
        scans,
        badges,
        currentUser: { ...state.currentUser, totalScans: userScanCount },
      };
    }),
  applyPublicScansFromRemote: ({ scans, dogProfiles, users }) =>
    set((state) => {
      const byId = new Map(state.scans.map((s) => [s.id, s] as const));
      for (const incoming of scans) {
        byId.set(incoming.id, incoming);
      }
      const nextScans = Array.from(byId.values()).sort(
        (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
      );

      const dogProfileMap = new Map(state.dogProfiles.map((d) => [d.id, d] as const));
      for (const dog of dogProfiles) dogProfileMap.set(dog.id, dog);

      const friendIds = new Set(state.friends.map((f) => f.id));
      const knownById = new Map(state.knownUsers.map((u) => [u.id, u] as const));
      for (const author of users) {
        if (!author?.id) continue;
        if (author.id === state.currentUser.id) continue;
        if (friendIds.has(author.id)) continue;
        const existing = knownById.get(author.id);
        knownById.set(author.id, {
          ...(existing ?? { city: "", country: "" }),
          ...author,
        });
      }

      return {
        scans: nextScans,
        dogProfiles: Array.from(dogProfileMap.values()),
        knownUsers: Array.from(knownById.values()),
      };
    }),
  applyFriendsScansFromRemote: ({ friendUserIds, scans, dogProfiles }) =>
    set((state) => {
      const friendIdSet = new Set(friendUserIds);
      const remoteIds = new Set(scans.map((s) => s.id));
      const keptLocal = state.scans.filter((s) => {
        if (!friendIdSet.has(s.userId)) return true;
        return !remoteIds.has(s.id) && !s.serverConfirmedAt;
      });
      const remoteFriendScans = scans.filter((s) => friendIdSet.has(s.userId));
      const nextScans = [
        ...keptLocal.filter((s) => !friendIdSet.has(s.userId)),
        ...remoteFriendScans,
        ...keptLocal.filter((s) => friendIdSet.has(s.userId)),
      ].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

      const existingDogProfiles = new Map(state.dogProfiles.map((d) => [d.id, d] as const));
      for (const dog of dogProfiles) existingDogProfiles.set(dog.id, dog);

      return {
        scans: nextScans,
        dogProfiles: Array.from(existingDogProfiles.values()),
      };
    }),
  bumpPhotoVersion: (scanId) =>
    set((state) => ({
      photoVersions: {
        ...state.photoVersions,
        [scanId]: (state.photoVersions[scanId] ?? 0) + 1,
      },
    })),
  loadDemoSeed: () =>
    set({
      currentUser: starterUser,
      scans: starterScans,
      dogProfiles: starterDogProfiles,
      recentBreedIds: ["cavoodle", "border-collie", "golden-retriever"],
      badges: ["puppy_scout", "common_collector", "daily_walker"],
      friends: starterFriends,
      pendingFriendRequests: starterPendingFriendRequests,
      outgoingFriendRequests: [],
      leagues: [
        {
          id: "league-1",
          name: "Park Pals",
          createdBy: starterUser.id,
          createdAt: "2026-04-07T08:00:00.000Z",
          inviteCode: "PARKPLS1",
          maxMembers: 20,
          endsAt: null,
          memberCount: 3,
        },
      ],
      feedReactions: starterFeedReactions,
      feedComments: starterFeedComments,
      weeklyPoints: 4,
      linkedAuthUserId: null,
    }),
  setAvatar: (avatarUrl) =>
    set((state) => ({
      currentUser: {
        ...state.currentUser,
        avatarUrl,
      },
    })),
  setCurrentUserIdentity: (input) =>
    set((state) => {
      const nextId = input.id;
      const isRealAuth = nextId !== "demo-user" && !nextId.startsWith("friend-");

      const previousLinked = state.linkedAuthUserId ?? state.currentUser.id;
      const scans = isRealAuth
        ? claimScansForSignedInUser(state.scans, nextId, previousLinked)
        : state.scans;

      const journalDogs = state.journalDogs.map((d) =>
        d.userId === "demo-user" || d.userId === previousLinked ? { ...d, userId: nextId } : d,
      );

      const userScanCount = scans.filter((s) => s.userId === nextId && !s.isPendingBreed).length;

      const hadDemoLeak =
        state.currentUser.id === "demo-user" ||
        state.currentUser.id === "guest" ||
        state.friends.some((f) => SYSTEM_USER_IDS.has(f.id)) ||
        state.leagues.some((l) => l.inviteCode === "PARKPLS1" || l.id === "league-1") ||
        state.scans.some((s) => DEMO_SEED_SCAN_IDS.has(s.id));

      const scrubSocial = isRealAuth && hadDemoLeak;

      const weeklyPoints = isRealAuth
        ? scans.filter((s) => s.userId === nextId).reduce((sum, s) => sum + s.pointsAwarded, 0)
        : state.weeklyPoints;

      const nextFriends = scrubSocial ? [] : state.friends;
      const nextReactions = scrubSocial ? [] : state.feedReactions;
      const badgesPrevious = scrubSocial
        ? []
        : state.badges.filter((b) => isKnownBadge(b));
      const badges = isRealAuth
        ? recomputeBadges({
            previous: badgesPrevious,
            scans,
            breeds: state.breeds,
            userId: nextId,
            friendsCount: nextFriends.length,
            leagues: scrubSocial ? [] : state.leagues,
            feedReactions: nextReactions,
          })
        : state.badges.filter((b) => isKnownBadge(b));

      return {
        scans,
        journalDogs,
        badges,
        linkedAuthUserId: isRealAuth ? nextId : state.linkedAuthUserId,
        friends: scrubSocial ? [] : state.friends,
        pendingFriendRequests: scrubSocial ? [] : state.pendingFriendRequests,
        outgoingFriendRequests: scrubSocial ? [] : state.outgoingFriendRequests,
        knownUsers: scrubSocial ? [] : state.knownUsers,
        notifications: scrubSocial ? [] : state.notifications,
        badgeUnlocks: scrubSocial ? [] : state.badgeUnlocks,
        leagues: scrubSocial ? [] : state.leagues,
        feedReactions: scrubSocial ? [] : state.feedReactions,
        feedComments: scrubSocial ? [] : state.feedComments,
        weeklyPoints: scrubSocial ? weeklyPoints : state.weeklyPoints,
        recentBreedIds: scrubSocial
          ? deriveRecentBreedIdsFromScans(nextId, scans)
          : state.recentBreedIds,
        dogProfiles: scrubSocial
          ? scrubDogProfilesForUser(nextId, scans, state.dogProfiles)
          : state.dogProfiles,
        currentUser: {
          ...state.currentUser,
          id: nextId,
          username: input.username?.trim() ? input.username.trim() : state.currentUser.username,
          avatarUrl: input.avatarUrl ?? state.currentUser.avatarUrl,
          city: input.city?.trim() ?? state.currentUser.city,
          country: input.country?.trim() ?? state.currentUser.country,
          totalScans: isRealAuth ? Math.max(state.currentUser.totalScans, userScanCount) : state.currentUser.totalScans,
        },
      };
    }),
  setUsername: (username) =>
    set((state) => {
      const next = username.trim();
      if (!next) return state;
      return {
        currentUser: {
          ...state.currentUser,
          username: next,
        },
      };
    }),
  setUserLocation: (city, country) =>
    set((state) => ({
      currentUser: {
        ...state.currentUser,
        city: city.trim(),
        country: country.trim(),
      },
    })),
  setFriendshipsFromServer: ({ friends, incoming, outgoing }) =>
    set((state) => ({
      friends,
      pendingFriendRequests: incoming,
      outgoingFriendRequests: outgoing,
      badges: recomputeBadges({
        previous: state.badges,
        scans: state.scans,
        breeds: state.breeds,
        userId: state.currentUser.id,
        friendsCount: friends.length,
        leagues: state.leagues,
        feedReactions: state.feedReactions,
      }),
    })),
  addOutgoingFriendRequest: (profile) =>
    set((state) =>
      state.outgoingFriendRequests.some((p) => p.id === profile.id)
        ? state
        : { outgoingFriendRequests: [profile, ...state.outgoingFriendRequests] },
    ),
  removeIncomingRequestById: (fromUserId) =>
    set((state) => ({
      pendingFriendRequests: state.pendingFriendRequests.filter((p) => p.id !== fromUserId),
    })),
  removeOutgoingRequestById: (toUserId) =>
    set((state) => ({
      outgoingFriendRequests: state.outgoingFriendRequests.filter((p) => p.id !== toUserId),
    })),
  promoteIncomingRequestToFriend: (fromUserId) =>
    set((state) => {
      const requester = state.pendingFriendRequests.find((p) => p.id === fromUserId);
      if (!requester) return state;
      if (state.friends.some((f) => f.id === fromUserId)) {
        return {
          pendingFriendRequests: state.pendingFriendRequests.filter((p) => p.id !== fromUserId),
        };
      }
      const nextFriends = [...state.friends, requester];
      return {
        pendingFriendRequests: state.pendingFriendRequests.filter((p) => p.id !== fromUserId),
        friends: nextFriends,
        badges: recomputeBadges({
          previous: state.badges,
          scans: state.scans,
          breeds: state.breeds,
          userId: state.currentUser.id,
          friendsCount: nextFriends.length,
          leagues: state.leagues,
          feedReactions: state.feedReactions,
        }),
      };
    }),
  removeFriendById: (otherUserId) =>
    set((state) => {
      const nextFriends = state.friends.filter((f) => f.id !== otherUserId);
      return {
        friends: nextFriends,
        badges: recomputeBadges({
          previous: state.badges,
          scans: state.scans,
          breeds: state.breeds,
          userId: state.currentUser.id,
          friendsCount: nextFriends.length,
          leagues: state.leagues,
          feedReactions: state.feedReactions,
        }),
      };
    }),
  setNotificationsFromServer: (serverNotifications) =>
    set((state) => {
      const localLeagueInvites = state.notifications.filter(
        (n) => n.kind === "league_invite" && n.userId === state.currentUser.id,
      );
      const byId = new Map(serverNotifications.map((n) => [n.id, n] as const));
      for (const inv of localLeagueInvites) {
        if (!byId.has(inv.id)) byId.set(inv.id, inv);
      }
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return { notifications: merged };
    }),
  markAllNotificationsRead: () =>
    set((state) => {
      if (state.notifications.every((n) => n.readAt !== null)) return state;
      const now = new Date().toISOString();
      return {
        notifications: state.notifications.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      };
    }),
  setBadgeUnlocksFromServer: ({ unlocks, users }) =>
    set((state) => {
      const friendIds = new Set(state.friends.map((f) => f.id));
      const knownById = new Map(state.knownUsers.map((u) => [u.id, u] as const));
      for (const author of users) {
        if (!author?.id) continue;
        if (author.id === state.currentUser.id) continue;
        if (friendIds.has(author.id)) continue;
        const existing = knownById.get(author.id);
        knownById.set(author.id, { ...(existing ?? { city: "", country: "" }), ...author });
      }
      /**
       * Filter unlocks down to badge IDs the current client knows how to
       * render so stale rows from a retired badge taxonomy never paint a
       * "ghost" card on the feed.
       */
      const safeUnlocks = unlocks.filter((u) => isKnownBadge(u.badge));
      return {
        badgeUnlocks: safeUnlocks,
        knownUsers: Array.from(knownById.values()),
      };
    }),
  addLeagueFriendRequest: (username) =>
    set((state) => {
      const trimmed = username.trim();
      if (!trimmed) return state;
      const normalized = trimmed.toLowerCase();
      if (normalized === state.currentUser.username.trim().toLowerCase()) return state;
      if (state.friends.some((f) => f.username.trim().toLowerCase() === normalized)) return state;
      if (state.pendingFriendRequests.some((f) => f.username.trim().toLowerCase() === normalized)) return state;
      return {
        pendingFriendRequests: [
          {
            id: createId("friend-request"),
            username: trimmed,
            avatarUrl: null,
            totalScans: 0,
            createdAt: new Date().toISOString(),
            city: "",
            country: "",
          },
          ...state.pendingFriendRequests,
        ],
      };
    }),
  inviteFriendsToLeague: ({ leagueId, leagueName, friendUserIds }) =>
    set((state) => {
      const cleaned = Array.from(new Set(friendUserIds)).filter((id) => id && id !== state.currentUser.id);
      if (cleaned.length === 0) return state;
      const friendById = new Map(state.friends.map((f) => [f.id, f] as const));
      const nowIso = new Date().toISOString();
      const inviter = state.currentUser;
      /**
       * Pilot: each selected friend gets an inbound `league_invite` notification
       * (actor = inviter). On a single signed-in device we also mirror one
       * sample inbound invite so the creator can walk through Accept in
       * Notifications without switching accounts.
       */
      const newNotifications: AppNotification[] = [];
      for (const friendId of cleaned) {
        const friend = friendById.get(friendId);
        if (!friend) continue;
        newNotifications.push({
          id: createId("league-invite"),
          userId: friendId,
          kind: "league_invite",
          actor: inviter,
          readAt: null,
          createdAt: nowIso,
          context: { leagueId, leagueName },
        });
      }
      const previewFriend = cleaned.map((id) => friendById.get(id)).find(Boolean);
      if (previewFriend) {
        newNotifications.push({
          id: createId("league-invite-preview"),
          userId: state.currentUser.id,
          kind: "league_invite",
          actor: inviter,
          readAt: null,
          createdAt: nowIso,
          context: { leagueId, leagueName },
        });
      }
      if (newNotifications.length === 0) return state;
      return {
        notifications: [...newNotifications, ...state.notifications],
      };
    }),
  acceptLeagueInvite: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== notificationId),
    })),
  createLeague: (input) => {
    const name = input.name.trim();
    if (!name) return;
    set((state) => {
      const maxMembers = Math.max(2, Math.min(500, Math.floor(input.maxMembers) || 10));
      const inviteCode = generateUniqueInviteCode(state.leagues.map((l) => l.inviteCode));
      const endsAt = endsAtForDuration(input.duration, input.customDays);
      const league: League = {
        id: createId("league"),
        name,
        createdBy: state.currentUser.id,
        createdAt: new Date().toISOString(),
        inviteCode,
        maxMembers,
        endsAt,
        memberCount: 1,
      };
      const nextLeagues = [league, ...state.leagues];
      return {
        leagues: nextLeagues,
        badges: recomputeBadges({
          previous: state.badges,
          scans: state.scans,
          breeds: state.breeds,
          userId: state.currentUser.id,
          friendsCount: state.friends.length,
          leagues: nextLeagues,
          feedReactions: state.feedReactions,
        }),
      };
    });
  },
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleFeedReaction: (scanId, kind) =>
    set((state) => {
      const uid = state.currentUser.id;
      const existing = state.feedReactions.find((r) => r.scanId === scanId && r.userId === uid);
      if (existing?.kind === kind) {
        return {
          feedReactions: state.feedReactions.filter((r) => r.id !== existing.id),
        };
      }
      if (existing) {
        return {
          feedReactions: state.feedReactions.map((r) => (r.id === existing.id ? { ...r, kind } : r)),
        };
      }
      return {
        feedReactions: [
          ...state.feedReactions,
          { id: createId("react"), scanId, userId: uid, kind },
        ],
      };
    }),
  addFeedComment: (scanId, body) => {
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > MAX_FEED_COMMENT_LENGTH) return;
    set((state) => ({
      feedComments: [
        ...state.feedComments,
        {
          id: createId("comment"),
          scanId,
          userId: state.currentUser.id,
          body: trimmed,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },
  removeFeedComment: (commentId) =>
    set((state) => {
      const comment = state.feedComments.find((c) => c.id === commentId);
      if (!comment || comment.userId !== state.currentUser.id) return state;
      return {
        feedComments: state.feedComments.filter((c) => c.id !== commentId),
      };
    }),
  addJournalDog: (input) => {
    const name = input.name.trim();
    if (!name || !input.breedId) return;
    const now = new Date().toISOString();
    const clip = (v: string | null | undefined) =>
      v?.trim() ? v.trim().slice(0, MAX_JOURNAL_DOG_FIELD_LENGTH) : null;
    const dog: JournalDog = {
      id: createId("journal-dog"),
      userId: get().currentUser.id,
      name,
      photoUrl: input.photoUrl?.trim() || null,
      breedId: input.breedId,
      sex: input.sex,
      ageOrBirthNote: clip(input.ageOrBirthNote),
      coatDescription: clip(input.coatDescription),
      personalityNotes: clip(input.personalityNotes),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ journalDogs: [dog, ...s.journalDogs] }));
  },
  updateJournalDog: (id, patch) =>
    set((state) => {
      const dog = state.journalDogs.find((d) => d.id === id && d.userId === state.currentUser.id);
      if (!dog) return state;
      const clip = (v: string | null | undefined) =>
        v !== null && v !== undefined && v.trim() ? v.trim().slice(0, MAX_JOURNAL_DOG_FIELD_LENGTH) : null;
      const next: JournalDog = {
        ...dog,
        name: patch.name !== undefined ? (patch.name.trim() || dog.name) : dog.name,
        photoUrl: patch.photoUrl !== undefined ? patch.photoUrl?.trim() || null : dog.photoUrl,
        breedId: patch.breedId ?? dog.breedId,
        sex: patch.sex ?? dog.sex,
        ageOrBirthNote: patch.ageOrBirthNote !== undefined ? clip(patch.ageOrBirthNote) : dog.ageOrBirthNote,
        coatDescription: patch.coatDescription !== undefined ? clip(patch.coatDescription) : dog.coatDescription,
        personalityNotes: patch.personalityNotes !== undefined ? clip(patch.personalityNotes) : dog.personalityNotes,
        updatedAt: new Date().toISOString(),
      };
      return { journalDogs: state.journalDogs.map((d) => (d.id === id ? next : d)) };
    }),
  removeJournalDog: (id) =>
    set((state) => ({
      journalDogs: state.journalDogs.filter((d) => !(d.id === id && d.userId === state.currentUser.id)),
    })),
  }),
);

let hydrationPromise: Promise<void> = Promise.resolve();

/** Bootstrap layer calls this to register its restore promise. */
export function _registerSpotterStoreHydration(promise: Promise<void>) {
  hydrationPromise = promise;
}

/**
 * Resolves once local persistence has had a chance to restore. On web this is
 * effectively instantaneous (synchronous read in the bootstrap layer); on
 * native it awaits the AsyncStorage read.
 */
export function waitForSpotterStoreHydration(): Promise<void> {
  return hydrationPromise;
}

export function selectCollectedBreedIds(scans: ScanRecord[], userId: string) {
  return new Set(
    scans
      .filter((scan) => scan.userId === userId && scan.breedId && !scan.isPendingBreed)
      .map((scan) => scan.breedId as string),
  );
}

export function selectRareFindCount(scans: ScanRecord[], breeds: Breed[], userId: string) {
  const rareIds = new Set(breeds.filter((breed) => breed.rarity === "rare" || breed.rarity === "legendary").map((breed) => breed.id));
  return scans.filter((scan) => scan.userId === userId && scan.breedId && rareIds.has(scan.breedId)).length;
}

export function selectNextBadges(badges: BadgeType[]) {
  return badgeDisplayOrder
    .filter((badge) => !badges.includes(badge))
    .slice(0, 3)
    .map((badge) => ({ badge, ...badgeCopy[badge] }));
}
