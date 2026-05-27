import { fetchRecentBadgeUnlocks, recordBadgeUnlock } from "@/lib/supabase/badgeUnlocksRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { BadgeType } from "@/types/app";

let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Pull the latest 100 badge unlocks across all users so the Social feed can
 * render achievement cards alongside scans. Coalesces within 10s.
 */
export async function refreshBadgeUnlocks(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (inFlight) return inFlight;
  if (Date.now() - lastRunAt < 10_000) return;

  inFlight = (async () => {
    try {
      const result = await fetchRecentBadgeUnlocks();
      useSpotterStore.getState().setBadgeUnlocksFromServer(result);
    } catch (err) {
      console.warn("[refreshBadgeUnlocks]", err);
    } finally {
      lastRunAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Per-session memo of (userId,badge) pairs we have already persisted. */
const persistedThisSession = new Set<string>();

/**
 * Persist any badges in the local store that the server hasn't seen yet for
 * the signed-in user. Safe to call frequently — relies on the DB unique
 * constraint and an in-memory dedupe set to avoid extra writes.
 */
export async function pushLocalBadgeUnlocks(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const userId = useAuthStore.getState().session?.user?.id ?? null;
  if (!userId) return;

  const state = useSpotterStore.getState();
  const localBadges = state.badges;
  if (localBadges.length === 0) return;

  // Badges already on the server for this user (from the most recent refresh).
  const serverBadges = new Set<BadgeType>(
    state.badgeUnlocks.filter((u) => u.userId === userId).map((u) => u.badge),
  );

  const missing = localBadges.filter((b) => {
    const key = `${userId}:${b}`;
    if (serverBadges.has(b)) {
      persistedThisSession.add(key);
      return false;
    }
    return !persistedThisSession.has(key);
  });

  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (badge) => {
      try {
        await recordBadgeUnlock(userId, badge);
        persistedThisSession.add(`${userId}:${badge}`);
      } catch (err) {
        console.warn("[pushLocalBadgeUnlocks]", badge, err);
      }
    }),
  );

  // Refresh so the new unlocks show in the feed for everyone (including us).
  lastRunAt = 0;
  await refreshBadgeUnlocks();
}