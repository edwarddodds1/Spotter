import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { isKnownBadge } from "@/constants/badges";
import type { BadgeType, League, ScanRecord, UserProfile } from "@/types/app";
import type { SpotterState } from "@/store/useSpotterStore";
import { _registerSpotterStoreHydration, useSpotterStore } from "@/store/useSpotterStore";

const STORAGE_KEY = "spotter-store.v4";

const DEMO_FRIEND_IDS = new Set(["friend-1", "friend-2"]);
const DEMO_LEAGUE_IDS = new Set(["league-1"]);

type Persisted = Partial<
  Pick<
    SpotterState,
    | "themeMode"
    | "currentUser"
    | "linkedAuthUserId"
    | "scans"
    | "dogProfiles"
    | "journalDogs"
    | "recentBreedIds"
    | "badges"
    | "friends"
    | "pendingFriendRequests"
    | "outgoingFriendRequests"
    | "leagues"
    | "feedReactions"
    | "feedComments"
    | "weeklyPoints"
  >
>;

function pickPersistedSlice(state: SpotterState): Persisted {
  return {
    themeMode: state.themeMode,
    currentUser: state.currentUser,
    linkedAuthUserId: state.linkedAuthUserId,
    scans: state.scans,
    dogProfiles: state.dogProfiles,
    journalDogs: state.journalDogs,
    recentBreedIds: state.recentBreedIds,
    badges: state.badges,
    friends: state.friends,
    pendingFriendRequests: state.pendingFriendRequests,
    outgoingFriendRequests: state.outgoingFriendRequests,
    leagues: state.leagues,
    feedReactions: state.feedReactions,
    feedComments: state.feedComments,
    weeklyPoints: state.weeklyPoints,
  };
}

function applyPersistedSlice(persisted: Persisted) {
  try {
    if (!persisted || typeof persisted !== "object") return;
    const safeArr = <T,>(value: unknown, fallback: T[]): T[] =>
      Array.isArray(value) ? (value as T[]) : fallback;
    const linkedId =
      typeof persisted.linkedAuthUserId === "string" ? persisted.linkedAuthUserId : null;
    const isRealPersistedUser =
      Boolean(linkedId && linkedId !== "demo-user" && !linkedId.startsWith("friend-"));

    useSpotterStore.setState((current) => {
      const friends = safeArr<UserProfile>(persisted.friends, current.friends);
      const leagues = safeArr<League>(persisted.leagues, current.leagues);
      const rawScans = safeArr<ScanRecord>(persisted.scans, current.scans);
      /**
       * Hydration sanitization for photoUrls that can NEVER be a valid value
       * to render or to push to the server:
       *
       * 1. `{userId}/{scan.id}.jpg` (no scheme) — historical corruption from
       *    a sync bug. Clear it; `pullAndSyncUserScans` will restore the
       *    real path from the server.
       * 2. `blob:` / `data:` URIs — only valid for the document that
       *    created them, so they're dead after a page reload. The pending
       *    photo-upload queue still has the bytes if the user closed the
       *    tab mid-upload; if not, the photo is unrecoverable and the UI
       *    should show "Photo missing" rather than a permanently broken
       *    `<Image>`.
       * 3. `file:` / `content:` URIs — native filesystem references that
       *    may or may not still be valid; we keep them on native (where
       *    they typically survive), but clear them on web (where they
       *    never can be).
       */
      const sanitizePhotoUrl = (s: ScanRecord): ScanRecord => {
        const url = typeof s.photoUrl === "string" ? s.photoUrl.trim() : "";
        if (!url) return s;
        if (url === `${s.userId}/${s.id}.jpg`) return { ...s, photoUrl: "" };
        if (url.startsWith("blob:") || url.startsWith("data:")) {
          return { ...s, photoUrl: "" };
        }
        if (
          Platform.OS === "web" &&
          (url.startsWith("file:") || url.startsWith("content:"))
        ) {
          return { ...s, photoUrl: "" };
        }
        return s;
      };
      const scans = rawScans.map(sanitizePhotoUrl);
      const demoScanIds = new Set([
        "scan-1",
        "scan-2",
        "scan-3",
        "scan-friend-mel",
        "scan-friend-bris",
      ]);

      return {
      themeMode:
        persisted.themeMode === "dark" || persisted.themeMode === "light"
          ? persisted.themeMode
          : current.themeMode,
      currentUser:
        persisted.currentUser && typeof persisted.currentUser === "object"
          ? persisted.currentUser
          : current.currentUser,
      linkedAuthUserId:
        typeof persisted.linkedAuthUserId === "string" || persisted.linkedAuthUserId === null
          ? persisted.linkedAuthUserId
          : current.linkedAuthUserId,
      scans: isRealPersistedUser ? scans.filter((s) => !demoScanIds.has(s.id)) : scans,
      dogProfiles: safeArr(persisted.dogProfiles, current.dogProfiles),
      journalDogs: safeArr(persisted.journalDogs, current.journalDogs),
      recentBreedIds: safeArr(persisted.recentBreedIds, current.recentBreedIds),
      /**
       * Drop any badge IDs from a retired taxonomy so legacy local storage
       * (e.g. `first_spot`, `top_dog_owner`) doesn't poison the new
       * medallion grid or feed cards.
       */
      badges: safeArr<BadgeType>(persisted.badges, current.badges).filter((b) => isKnownBadge(b)),
      friends: isRealPersistedUser ? friends.filter((f) => !DEMO_FRIEND_IDS.has(f.id)) : friends,
      pendingFriendRequests: safeArr(
        persisted.pendingFriendRequests,
        current.pendingFriendRequests,
      ),
      outgoingFriendRequests: safeArr(
        persisted.outgoingFriendRequests,
        current.outgoingFriendRequests,
      ),
      leagues: isRealPersistedUser ? leagues.filter((l) => !DEMO_LEAGUE_IDS.has(l.id)) : leagues,
      feedReactions: safeArr(persisted.feedReactions, current.feedReactions),
      feedComments: safeArr(persisted.feedComments, current.feedComments),
      weeklyPoints:
        typeof persisted.weeklyPoints === "number" ? persisted.weeklyPoints : current.weeklyPoints,
      };
    });
  } catch (err) {
    console.warn("[spotterPersistence] applyPersistedSlice failed:", err);
  }
}

function readSync(): Persisted | null {
  if (Platform.OS !== "web") return null;
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch (err) {
    console.warn("[spotterPersistence] readSync failed; ignoring cached state:", err);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    return null;
  }
}

async function readAsync(): Promise<Persisted | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch (err) {
    console.warn("[spotterPersistence] readAsync failed; ignoring cached state:", err);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    return null;
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void writeNow();
  }, 300);
}

async function writeNow() {
  try {
    const slice = pickPersistedSlice(useSpotterStore.getState());
    const serialized = JSON.stringify(slice);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch (err) {
        console.warn("[spotterPersistence] localStorage.setItem failed:", err);
      }
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn("[spotterPersistence] writeNow failed:", err);
  }
}

let bootstrapped = false;
let hydrationDone: Promise<void> | null = null;

/**
 * Wires up local persistence: restores the persisted slice (sync on web,
 * async on native) and subscribes to store changes to write a debounced
 * copy back. Safe to call multiple times; safe under SSR.
 */
export function bootstrapSpotterPersistence(): Promise<void> {
  if (bootstrapped && hydrationDone) return hydrationDone;
  bootstrapped = true;

  hydrationDone = (async () => {
    /* Async work below; resolves once restore is applied and subscribe is wired. */
    try {
      if (Platform.OS === "web") {
        const fromWeb = readSync();
        if (fromWeb) applyPersistedSlice(fromWeb);
      } else {
        const fromNative = await readAsync();
        if (fromNative) applyPersistedSlice(fromNative);
      }
    } catch (err) {
      console.warn("[spotterPersistence] hydration failed:", err);
    }

    try {
      useSpotterStore.subscribe(() => scheduleWrite());
    } catch (err) {
      console.warn("[spotterPersistence] subscribe failed:", err);
    }
  })();

  _registerSpotterStoreHydration(hydrationDone);
  return hydrationDone;
}

/** Wipe the persisted blob (used by the error-boundary "reset" button). */
export function clearPersistedSpotterState() {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem("spotter-store");
      return;
    }
    void AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("[spotterPersistence] clear failed:", err);
  }
}
