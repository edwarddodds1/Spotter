import { supabase } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/app";

const supabaseDb = supabase as any;

/**
 * Convention from `public.friendships`:
 *   user_id   = requester (the one who sent the request)
 *   friend_id = recipient
 *   status    = 'pending' | 'accepted' | 'declined'
 *
 * A unique pair index prevents both-direction duplicates, so we always treat
 * a friendship as a single row regardless of who initiated it.
 */

type FriendshipRow = {
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

type UserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_scans: number;
  created_at: string;
};

export type FriendshipsBundle = {
  friends: UserProfile[];
  incoming: UserProfile[];
  outgoing: UserProfile[];
};

function rowToProfile(row: UserRow): UserProfile {
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

export async function searchUsersByUsername(
  prefix: string,
  currentUserId: string,
  limit = 10,
): Promise<UserProfile[]> {
  const term = prefix.trim();
  if (term.length < 2) return [];
  const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
  const { data, error } = await supabaseDb
    .from("users")
    .select("id, username, avatar_url, total_scans, created_at")
    .ilike("username", `${escaped}%`)
    .neq("id", currentUserId)
    .order("username", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToProfile);
}

export async function fetchFriendshipsForUser(userId: string): Promise<FriendshipsBundle> {
  const { data: rows, error } = await supabaseDb
    .from("friendships")
    .select("user_id, friend_id, status, created_at")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  if (error) throw error;
  const friendships = (rows ?? []) as FriendshipRow[];
  if (friendships.length === 0) {
    return { friends: [], incoming: [], outgoing: [] };
  }

  const otherIds = new Set<string>();
  for (const f of friendships) {
    otherIds.add(f.user_id === userId ? f.friend_id : f.user_id);
  }
  const { data: userRows, error: usersError } = await supabaseDb
    .from("users")
    .select("id, username, avatar_url, total_scans, created_at")
    .in("id", Array.from(otherIds));
  if (usersError) throw usersError;
  const profileById = new Map<string, UserProfile>();
  for (const row of (userRows ?? []) as UserRow[]) {
    profileById.set(row.id, rowToProfile(row));
  }

  const friends: UserProfile[] = [];
  const incoming: UserProfile[] = [];
  const outgoing: UserProfile[] = [];
  for (const f of friendships) {
    const otherId = f.user_id === userId ? f.friend_id : f.user_id;
    const profile = profileById.get(otherId);
    if (!profile) continue;
    if (f.status === "accepted") {
      friends.push(profile);
    } else if (f.status === "pending") {
      if (f.friend_id === userId) incoming.push(profile);
      else outgoing.push(profile);
    }
  }
  friends.sort((a, b) => a.username.localeCompare(b.username));
  return { friends, incoming, outgoing };
}

export type SendFriendRequestResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; reason: "self" | "not-found" | "already" | "error"; message: string };

export async function sendFriendRequestByUsername(
  myUserId: string,
  myUsername: string,
  targetUsername: string,
): Promise<SendFriendRequestResult> {
  const target = targetUsername.trim();
  if (!target) return { ok: false, reason: "error", message: "Enter a username." };
  if (target.toLowerCase() === myUsername.trim().toLowerCase()) {
    return { ok: false, reason: "self", message: "That's you." };
  }
  const { data: user, error: userError } = await supabaseDb
    .from("users")
    .select("id, username, avatar_url, total_scans, created_at")
    .ilike("username", target)
    .maybeSingle();
  if (userError) {
    return { ok: false, reason: "error", message: userError.message };
  }
  if (!user) {
    return { ok: false, reason: "not-found", message: "No user with that username." };
  }
  const targetUser = rowToProfile(user as UserRow);
  if (targetUser.id === myUserId) {
    return { ok: false, reason: "self", message: "That's you." };
  }
  return sendFriendRequestToUser(myUserId, targetUser);
}

export async function sendFriendRequestToUser(
  myUserId: string,
  target: UserProfile,
): Promise<SendFriendRequestResult> {
  if (target.id === myUserId) {
    return { ok: false, reason: "self", message: "That's you." };
  }
  const { data: existing, error: existingError } = await supabaseDb
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(
      `and(user_id.eq.${myUserId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${myUserId})`,
    )
    .maybeSingle();
  if (existingError && existingError.code !== "PGRST116") {
    return { ok: false, reason: "error", message: existingError.message };
  }
  if (existing) {
    return { ok: false, reason: "already", message: `Status: ${existing.status}.` };
  }
  const { error: insertError } = await supabaseDb
    .from("friendships")
    .insert({ user_id: myUserId, friend_id: target.id, status: "pending" });
  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, reason: "already", message: "Request already exists." };
    }
    return { ok: false, reason: "error", message: insertError.message };
  }
  return { ok: true, profile: target };
}

/** Accept a request that was sent to me by `fromUserId`. */
export async function acceptFriendRequestFrom(
  myUserId: string,
  fromUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseDb
    .from("friendships")
    .update({ status: "accepted" })
    .eq("user_id", fromUserId)
    .eq("friend_id", myUserId)
    .eq("status", "pending");
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Hard-delete a friendship (used for decline and unfriend). */
export async function removeFriendship(
  myUserId: string,
  otherUserId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabaseDb
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${myUserId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${myUserId})`,
    );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
