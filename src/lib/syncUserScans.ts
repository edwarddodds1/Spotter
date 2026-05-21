import {
  fetchUserScansFromSupabase,
  syncLocalScansToSupabase,
} from "@/lib/supabase/scansRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSpotterStore } from "@/store/useSpotterStore";

/**
 * Pull scans from Supabase, merge with local, and push any local-only rows up.
 * Safe to call on login, app foreground, and Dogdex focus.
 */
export async function pullAndSyncUserScans(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

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
