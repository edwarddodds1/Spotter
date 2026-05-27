import { supabase } from "@/lib/supabase/client";
import type { ScanRecord, UserProfile } from "@/types/app";
import type { Database } from "@/lib/supabase/types";

const supabaseDb = supabase as any;

type UserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_scans: number;
  created_at: string;
};

type ScanRow = Database["public"]["Tables"]["scans"]["Row"];

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

function rowToScan(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    userId: row.user_id,
    breedId: row.breed_id,
    photoUrl: row.photo_url,
    dogName: row.dog_name,
    dogProfileId: row.dog_profile_id,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    locationLabel: row.location_label,
    scannedAt: row.scanned_at,
    isPendingBreed: row.is_pending_breed,
    pointsAwarded: row.points_awarded,
    matchedFeaturedBreed: row.matched_featured_breed,
    coatColourId: row.coat_colour_id,
    coatColourNote: row.coat_colour_note,
    spotComment: row.spot_comment,
    isPrivate: row.is_private,
    serverConfirmedAt: new Date().toISOString(),
  };
}

export type UserProfileBundle = {
  profile: UserProfile;
  scans: ScanRecord[];
  breedsCollected: number;
};

/**
 * Fetch a user's public profile plus the non-private scans the caller is
 * allowed to read. RLS (scans_select_owner_or_friends) takes care of who can
 * see what — non-friends will see zero rows; friends and self see the
 * non-private set.
 */
export async function fetchUserProfileBundle(
  userId: string,
  limit = 24,
): Promise<UserProfileBundle | null> {
  const { data: userRow, error: userError } = await supabaseDb
    .from("users")
    .select("id, username, avatar_url, total_scans, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (userError) {
    console.warn("[fetchUserProfileBundle] user", userError.message);
    return null;
  }
  if (!userRow) return null;

  const profile = rowToProfile(userRow as UserRow);

  const { data: scanRows } = await supabaseDb
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_private", false)
    .eq("is_pending_breed", false)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  const scans = ((scanRows ?? []) as ScanRow[]).map(rowToScan);
  const breedsCollected = new Set(
    scans.map((s) => s.breedId).filter((id): id is string => Boolean(id)),
  ).size;

  return { profile, scans, breedsCollected };
}
