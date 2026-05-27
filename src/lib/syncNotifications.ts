import { fetchNotificationsForUser } from "@/lib/supabase/notificationsRemote";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

let lastRunAt = 0;
let inFlight: Promise<void> | null = null;

/**
 * Pull the signed-in user's notifications and replace the store snapshot.
 * Back-to-back calls within 6s are coalesced.
 */
export async function refreshNotifications(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const userId = useAuthStore.getState().session?.user?.id ?? null;
  if (!userId) return;
  if (inFlight) return inFlight;
  if (Date.now() - lastRunAt < 6_000) return;

  inFlight = (async () => {
    try {
      const next = await fetchNotificationsForUser(userId);
      useSpotterStore.getState().setNotificationsFromServer(next);
    } catch (err) {
      console.warn("[refreshNotifications]", err);
    } finally {
      lastRunAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}
