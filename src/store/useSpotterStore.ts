import { create } from "zustand";

import {
  DOGDEX_TOTAL,
  FEATURED_MULTIPLIER,
  MAX_JOURNAL_DOG_FIELD_LENGTH,
  MAX_SCAN_LOCATION_LABEL_LENGTH,
  RECENT_BREED_LIMIT,
} from "@/constants/app";
import { badgeCopy, badgeDisplayOrder } from "@/constants/badges";
import { COAT_OTHER_ID } from "@/constants/breedCoatColours";
import { breedsCatalog, RARITY_POINTS } from "@/constants/breeds";
import { variantThresholds } from "@/constants/theme";
import { endsAtForDuration, generateUniqueInviteCode } from "@/constants/leagues";
import type {
  BadgeType,
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

interface SpotterState {
  themeMode: "light" | "dark";
  currentUser: UserProfile;
  breeds: Breed[];
  scans: ScanRecord[];
  dogProfiles: DogProfile[];
  /** Dogs you own — Profile journal questionnaire. */
  journalDogs: JournalDog[];
  recentBreedIds: string[];
  featuredBreedId: string;
  badges: BadgeType[];
  friends: UserProfile[];
  leagues: League[];
  feedReactions: FeedReaction[];
  feedComments: FeedComment[];
  weeklyPoints: number;
  spotDraft: SpotDraft;
  setSpotDraft: (draft: Partial<SpotDraft>) => void;
  clearSpotDraft: () => void;
  addRecentBreed: (breedId: string) => void;
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
  assignPendingBreed: (scanId: string, breedId: string) => void;
  setAvatar: (avatarUrl: string) => void;
  setUsername: (username: string) => void;
  setUserLocation: (city: string, country: string) => void;
  addFriend: (username: string) => void;
  createLeague: (input: CreateLeagueInput) => void;
  setThemeMode: (mode: "light" | "dark") => void;
  toggleFeedReaction: (scanId: string, kind: FeedReactionKind) => void;
  addFeedComment: (scanId: string, body: string) => void;
  removeFeedComment: (commentId: string) => void;
  addJournalDog: (input: {
    name: string;
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

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function recomputeScanBadges(scans: ScanRecord[], breeds: Breed[], userId: string): BadgeType[] {
  const userScans = scans.filter((s) => s.userId === userId);
  const withBreed = userScans.filter((s) => s.breedId && !s.isPendingBreed);
  const distinctBreeds = new Set(withBreed.map((s) => s.breedId as string));
  const distinctCount = distinctBreeds.size;
  const breedById = new Map(breeds.map((b) => [b.id, b]));

  const next = new Set<BadgeType>();
  if (userScans.length >= 1) next.add("first_spot");
  if (distinctCount >= 10) next.add("ten_breeds");
  if (distinctCount >= Math.ceil(DOGDEX_TOTAL * 0.25)) next.add("quarter_dex");
  if (distinctCount >= Math.ceil(DOGDEX_TOTAL * 0.5)) next.add("half_dex");
  if (distinctCount >= DOGDEX_TOTAL) next.add("full_dex");
  if (userScans.length >= 100) next.add("century");
  if (userScans.some((s) => s.matchedFeaturedBreed)) next.add("featured_hunter");
  for (const s of withBreed) {
    const br = s.breedId ? breedById.get(s.breedId) : undefined;
    if (br?.rarity === "rare") next.add("rare_finder");
    if (br?.rarity === "legendary") next.add("legend_spotter");
  }
  return Array.from(next);
}

function mergeSocialBadges(scanBadges: BadgeType[], friendsCount: number, hadTopDogOwner: boolean): BadgeType[] {
  const s = new Set(scanBadges);
  if (friendsCount >= 1) s.add("social_pup");
  if (hadTopDogOwner) s.add("top_dog_owner");
  return Array.from(s);
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

export const useSpotterStore = create<SpotterState>((set, get) => ({
  themeMode: "light",
  currentUser: starterUser,
  breeds: breedsCatalog,
  scans: starterScans,
  dogProfiles: starterDogProfiles,
  journalDogs: [],
  recentBreedIds: ["cavoodle", "border-collie", "golden-retriever"],
  featuredBreedId: "cavoodle",
  badges: ["first_spot", "featured_hunter", "ten_breeds"],
  friends: starterFriends,
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
          id: createId("dog"),
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
      id: createId("scan"),
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
    const distinctBreeds = new Set(allScans.filter((item) => item.breedId).map((item) => item.breedId)).size;
    const nextBadges = new Set(state.badges);

    if (allScans.length >= 1) nextBadges.add("first_spot");
    if (matchedFeaturedBreed) nextBadges.add("featured_hunter");
    if (distinctBreeds >= 10) nextBadges.add("ten_breeds");
    if (distinctBreeds >= Math.ceil(DOGDEX_TOTAL * 0.25)) nextBadges.add("quarter_dex");
    if (distinctBreeds >= Math.ceil(DOGDEX_TOTAL * 0.5)) nextBadges.add("half_dex");
    if (distinctBreeds >= DOGDEX_TOTAL) nextBadges.add("full_dex");
    if (allScans.length >= 100) nextBadges.add("century");
    if (breed?.rarity === "rare") nextBadges.add("rare_finder");
    if (breed?.rarity === "legendary") nextBadges.add("legend_spotter");

    set((current) => ({
      scans: [scan, ...current.scans],
      dogProfiles: dogProfile
        ? current.dogProfiles.some((item) => item.id === dogProfile?.id)
          ? current.dogProfiles.map((item) => (item.id === dogProfile?.id ? dogProfile! : item))
          : [dogProfile, ...current.dogProfiles]
        : current.dogProfiles,
      badges: Array.from(nextBadges),
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
    const scanBadges = recomputeScanBadges(nextScans, state.breeds, state.currentUser.id);
    const hadTopDogOwner = state.badges.includes("top_dog_owner");
    const badges = mergeSocialBadges(scanBadges, state.friends.length, hadTopDogOwner);

    set({
      scans: nextScans,
      weeklyPoints: Math.max(0, state.weeklyPoints - points),
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
  assignPendingBreed: (scanId, breedId) =>
    set((state) => {
      const scan = state.scans.find((s) => s.id === scanId);
      const breed = state.breeds.find((b) => b.id === breedId);
      if (!scan || !breed) return {};
      const matchedFeatured = breed.id === state.featuredBreedId;
      const base = RARITY_POINTS[breed.rarity];
      const nextAwarded = matchedFeatured ? base * FEATURED_MULTIPLIER : base;
      const delta = nextAwarded - scan.pointsAwarded;
      return {
        scans: state.scans.map((s) =>
          s.id === scanId
            ? {
                ...s,
                breedId,
                isPendingBreed: false,
                matchedFeaturedBreed: matchedFeatured,
                pointsAwarded: nextAwarded,
              }
            : s,
        ),
        recentBreedIds: [breedId, ...state.recentBreedIds.filter((id) => id !== breedId)].slice(0, RECENT_BREED_LIMIT),
        weeklyPoints: state.weeklyPoints + delta,
      };
    }),
  setAvatar: (avatarUrl) =>
    set((state) => ({
      currentUser: {
        ...state.currentUser,
        avatarUrl,
      },
    })),
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
  addFriend: (username) =>
    set((state) => ({
      friends: [
        ...state.friends,
        {
          id: createId("friend"),
          username,
          avatarUrl: null,
          totalScans: 0,
          createdAt: new Date().toISOString(),
          city: "",
          country: "",
        },
      ],
      badges: state.badges.includes("social_pup") ? state.badges : [...state.badges, "social_pup"],
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
      return {
        leagues: [league, ...state.leagues],
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
}));

export function selectCollectedBreedIds(scans: ScanRecord[]) {
  return new Set(scans.filter((scan) => scan.breedId && !scan.isPendingBreed).map((scan) => scan.breedId as string));
}

export function selectRareFindCount(scans: ScanRecord[], breeds: Breed[]) {
  const rareIds = new Set(breeds.filter((breed) => breed.rarity === "rare" || breed.rarity === "legendary").map((breed) => breed.id));
  return scans.filter((scan) => scan.breedId && rareIds.has(scan.breedId)).length;
}

export function selectNextBadges(badges: BadgeType[]) {
  return badgeDisplayOrder
    .filter((badge) => !badges.includes(badge))
    .slice(0, 3)
    .map((badge) => ({ badge, ...badgeCopy[badge] }));
}
