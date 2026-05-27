import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { BadgeType, BadgeUnlock, UserProfile } from "@/types/app";

const supabaseDb = supabase as any;

type BadgeUnlockRow = {
  id: string;
  user_id: string;
  badge: string;
  unlocked_at: string;
};

type UserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_scans: number;
  created_at: string;
};

function rowToUnlock(row: BadgeUnlockRow): BadgeUnlock {
  return {
    id: row.id,
    userId: row.user_id,
    badge: row.badge as BadgeType,
    unlockedAt: row.unlocked_at,
  };
}

function rowToActor(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url ?? null,
    totalScans: row.total_scans ?? 0,
    createdAt: row.created_at,
    city: "",
    country: "",
  };
}

/**
 * Fetch the latest badge unlocks across all users (newest first) plus the
 * matching user rows for the feed to render. Bounded so the request stays
 * small even as the table grows.
 */
export async function fetchRecentBadgeUnlocks(
  limit = 100,
): Promise<{ unlocks: BadgeUnlock[]; users: UserProfile[] }> {
  if (!isSupabaseConfigured) return { unlocks: [], users: [] };

  const { data: rows, error } = await supabaseDb
    .from("badge_unlocks")
    .select("id, user_id, badge, unlocked_at")
    .order("unlocked_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[fetchRecentBadgeUnlocks]", error.message);
    return { unlocks: [], users: [] };
  }

  const unlocks = ((rows ?? []) as BadgeUnlockRow[]).map(rowToUnlock);
  const userIds = Array.from(new Set(unlocks.map((u) => u.userId).filter(Boolean)));

  let users: UserProfile[] = [];
  if (userIds.length > 0) {
    const { data: userRows } = await supabaseDb
      .from("users")
      .select("id, username, avatar_url, total_scans, created_at")
      .in("id", userIds);
    if (userRows) {
      users = (userRows as UserRow[]).map(rowToActor);
    }
  }

  return { unlocks, users };
}

/**
 * Idempotently persist that `userId` has unlocked `badge`. The DB unique
 * constraint on (user_id, badge) makes re-inserts cheap no-ops.
 */
export async function recordBadgeUnlock(userId: string, badge: BadgeType): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;
  const { error } = await supabaseDb
    .from("badge_unlocks")
    .insert({ user_id: userId, badge })
    .select("id")
    .maybeSingle();
  if (error && error.code !== "23505") {
    console.warn("[recordBadgeUnlock]", badge, error.message);
  }
}