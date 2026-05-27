import { fetchFriendsScansFromSupabase } from "@/lib/supabase/scansRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSpotterStore } from "@/store/useSpotterStore";

let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Fetch the latest non-private scans for the current user's accepted friends
 * and merge them into the local store. Cheap to call repeatedly — back-to-back
 * calls within 8s are coalesced.
 */
export async function refreshFriendsScans(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (inFlight) return inFlight;
  if (Date.now() - lastRunAt < 8_000) return;

  const friends = useSpotterStore.getState().friends;
  const friendUserIds = friends.map((f) => f.id);

  inFlight = (async () => {
    try {
      const remote = await fetchFriendsScansFromSupabase(friendUserIds);
      if (!remote) return;
      useSpotterStore.getState().applyFriendsScansFromRemote({
        friendUserIds,
        scans: remote.scans,
        dogProfiles: remote.dogProfiles,
      });
    } catch (err) {
      console.warn("[refreshFriendsScans]", err);
    } finally {
      lastRunAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}
