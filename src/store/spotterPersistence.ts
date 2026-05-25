import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { SpotterState } from "@/store/useSpotterStore";
import { _registerSpotterStoreHydration, useSpotterStore } from "@/store/useSpotterStore";

const STORAGE_KEY = "spotter-store.v3";

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
    useSpotterStore.setState((current) => ({
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
      scans: safeArr(persisted.scans, current.scans),
      dogProfiles: safeArr(persisted.dogProfiles, current.dogProfiles),
      journalDogs: safeArr(persisted.journalDogs, current.journalDogs),
      recentBreedIds: safeArr(persisted.recentBreedIds, current.recentBreedIds),
      badges: safeArr(persisted.badges, current.badges),
      friends: safeArr(persisted.friends, current.friends),
      pendingFriendRequests: safeArr(persisted.pendingFriendRequests, current.pendingFriendRequests),
      leagues: safeArr(persisted.leagues, current.leagues),
      feedReactions: safeArr(persisted.feedReactions, current.feedReactions),
      feedComments: safeArr(persisted.feedComments, current.feedComments),
      weeklyPoints:
        typeof persisted.weeklyPoints === "number" ? persisted.weeklyPoints : current.weeklyPoints,
    }));
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
