import { fetchPublicScansFromSupabase } from "@/lib/supabase/scansRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSpotterStore } from "@/store/useSpotterStore";

let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Fetch the latest public scans (any author, non-private, non-pending) and
 * merge them additively into the local store so the Public feed shows
 * everyone's spots. Back-to-back calls within 10s are coalesced.
 */
export async function refreshPublicScans(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (inFlight) return inFlight;
  if (Date.now() - lastRunAt < 10_000) return;

  inFlight = (async () => {
    try {
      const remote = await fetchPublicScansFromSupabase(80);
      if (!remote) return;
      useSpotterStore.getState().applyPublicScansFromRemote({
        scans: remote.scans,
        dogProfiles: remote.dogProfiles,
        users: remote.users.map((u) => ({ ...u, city: "", country: "" })),
      });
    } catch (err) {
      console.warn("[refreshPublicScans]", err);
    } finally {
      lastRunAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}
