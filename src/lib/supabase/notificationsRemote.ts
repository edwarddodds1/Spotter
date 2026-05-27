import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { AppNotification, NotificationKind, UserProfile } from "@/types/app";

const supabaseDb = supabase as any;

type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_scans: number;
  created_at: string;
};

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
 * Fetch up to `limit` of the recipient's notifications (newest first) plus
 * the actor profiles in a single follow-up query. RLS gates access to the
 * caller's own rows.
 */
export async function fetchNotificationsForUser(
  userId: string,
  limit = 40,
): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) return [];

  const { data: rows, error } = await supabaseDb
    .from("notifications")
    .select("id, user_id, kind, actor_user_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[fetchNotificationsForUser]", error.message);
    return [];
  }

  const notifications = (rows ?? []) as NotificationRow[];
  if (notifications.length === 0) return [];

  const actorIds = Array.from(
    new Set(notifications.map((n) => n.actor_user_id).filter((id): id is string => Boolean(id))),
  );

  let actorMap = new Map<string, UserProfile>();
  if (actorIds.length > 0) {
    const { data: actorRows } = await supabaseDb
      .from("users")
      .select("id, username, avatar_url, total_scans, created_at")
      .in("id", actorIds);
    for (const r of (actorRows ?? []) as UserRow[]) {
      actorMap.set(r.id, rowToActor(r));
    }
  }

  return notifications.map<AppNotification>((n) => ({
    id: n.id,
    userId: n.user_id,
    kind: n.kind,
    actor: n.actor_user_id ? actorMap.get(n.actor_user_id) ?? null : null,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

/** Mark every unread notification for the user as read in one round trip. */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  const { error } = await supabaseDb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) {
    console.warn("[markAllNotificationsRead]", error.message);
    return false;
  }
  return true;
}
