import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

function fallbackUsername(user: User): string {
  const metadataUsername = user.user_metadata?.username;
  if (typeof metadataUsername === "string" && metadataUsername.trim()) {
    return metadataUsername.trim();
  }
  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) return emailPrefix;
  return `spotter_${user.id.slice(0, 8)}`;
}

/**
 * Keeps `public.users` in sync with auth users for client-side flows.
 * This is best-effort and should never block successful sign-in.
 */
export async function ensureUserProfile(user: User): Promise<void> {
  const db = supabase as any;
  const payload = {
    id: user.id,
    username: fallbackUsername(user),
    avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
  };
  const { error } = await db.from("users").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

