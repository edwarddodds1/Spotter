import {
  fetchUserScansFromSupabase,
  syncLocalScansToSupabase,
} from "@/lib/supabase/scansRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSpotterStore } from "@/store/useSpotterStore";

let syncInFlight: Promise<void> | null = null;
let syncQueuedUserId: string | null = null;

/**
 * Pull scans from Supabase, merge with local, and push any local-only rows up.
 * Safe to call on login, app foreground, and Dogdex focus.
 *
 * Concurrent calls for the same user collapse into one in-flight run; a different
 * user id queued while a sync runs will trigger one follow-up sync when the first finishes.
 */
export async function pullAndSyncUserScans(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  if (syncInFlight) {
    syncQueuedUserId = userId;
    return syncInFlight;
  }

  syncInFlight = runPullAndSync(userId).finally(() => {
    syncInFlight = null;
    const queued = syncQueuedUserId;
    syncQueuedUserId = null;
    if (queued && queued !== userId) {
      void pullAndSyncUserScans(queued);
    } else if (queued === userId) {
      void pullAndSyncUserScans(userId);
    }
  });

  return syncInFlight;
}

async function runPullAndSync(userId: string): Promise<void> {
  const { hydrateUserScansFromRemote, applyScansAfterSync } = useSpotterStore.getState();

  const remote = await fetchUserScansFromSupabase(userId);
  if (remote) {
    hydrateUserScansFromRemote({
      userId,
      scans: remote.scans,
      dogProfiles: remote.dogProfiles,
    });
  }

  const syncedScans = await syncLocalScansToSupabase(userId, useSpotterStore.getState().scans);
  applyScansAfterSync(syncedScans);

  const remoteAfterSync = await fetchUserScansFromSupabase(userId);
  if (remoteAfterSync) {
    hydrateUserScansFromRemote({
      userId,
      scans: remoteAfterSync.scans,
      dogProfiles: remoteAfterSync.dogProfiles,
    });
  }
}
