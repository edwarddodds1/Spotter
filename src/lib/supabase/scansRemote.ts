import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { uploadScanPhoto } from "@/lib/supabase/storage";
import type { Database } from "@/lib/supabase/types";
import type { DogProfile, ScanRecord } from "@/types/app";

type ScanRow = Database["public"]["Tables"]["scans"]["Row"];
type DogProfileRow = Database["public"]["Tables"]["dog_profiles"]["Row"];

const supabaseDb = supabase as any;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createUuid(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" && (globalThis as { crypto?: Crypto }).crypto
      ? (globalThis as { crypto: Crypto }).crypto
      : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function scanToRow(scan: ScanRecord) {
  return {
    id: scan.id,
    user_id: scan.userId,
    breed_id: scan.breedId,
    photo_url: scan.photoUrl,
    dog_name: scan.dogName,
    dog_profile_id: scan.dogProfileId ?? null,
    location_lat: scan.locationLat,
    location_lng: scan.locationLng,
    location_label: scan.locationLabel,
    scanned_at: scan.scannedAt,
    is_pending_breed: scan.isPendingBreed,
    points_awarded: scan.pointsAwarded,
    matched_featured_breed: scan.matchedFeaturedBreed,
    coat_colour_id: scan.coatColourId,
    coat_colour_note: scan.coatColourNote,
    spot_comment: scan.spotComment,
    is_private: scan.isPrivate,
  };
}

async function resolvePhotoUrlForUpload(userId: string, scan: ScanRecord): Promise<string> {
  if (scan.photoUrl.startsWith("http://") || scan.photoUrl.startsWith("https://")) {
    return scan.photoUrl;
  }
  try {
    return await uploadScanPhoto(userId, scan.id, scan.photoUrl);
  } catch {
    return scan.photoUrl;
  }
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
  };
}

function rowToDogProfile(row: DogProfileRow): DogProfile {
  return {
    id: row.id,
    name: row.name,
    breedId: row.breed_id,
    ownerId: row.owner_id,
    totalScans: row.total_scans,
  };
}

/**
 * Loads the signed-in user's scans + related dog_profiles from Supabase so the
 * Dogdex stays cumulative across devices and cold starts.
 */
export async function fetchUserScansFromSupabase(userId: string): Promise<{
  scans: ScanRecord[];
  dogProfiles: DogProfile[];
} | null> {
  if (!isSupabaseConfigured || !userId) return null;

  const { data: scanRows, error: scanError } = await supabaseDb
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .order("scanned_at", { ascending: false });

  if (scanError) {
    console.warn("[fetchUserScansFromSupabase]", scanError.message);
    return null;
  }

  const scans = ((scanRows ?? []) as ScanRow[]).map(rowToScan);

  const dogProfileIds = Array.from(
    new Set(scans.map((s) => s.dogProfileId).filter((id): id is string => Boolean(id))),
  );

  let dogProfiles: DogProfile[] = [];
  if (dogProfileIds.length > 0) {
    const { data: dogRows } = await supabaseDb.from("dog_profiles").select("*").in("id", dogProfileIds);
    if (dogRows) {
      dogProfiles = (dogRows as DogProfileRow[]).map(rowToDogProfile);
    }
  }

  return { scans, dogProfiles };
}

/**
 * Pushes local-only scans to Supabase (fixes legacy non-UUID ids and failed uploads).
 * Returns the full scans array with any id/photo_url updates applied.
 */
export async function syncLocalScansToSupabase(
  userId: string,
  allScans: ScanRecord[],
): Promise<ScanRecord[]> {
  if (!isSupabaseConfigured || !userId) return allScans;

  const mine = allScans.filter((s) => s.userId === userId);
  if (mine.length === 0) return allScans;

  const idRemap = new Map<string, string>();
  let next = [...allScans];

  for (const scan of mine) {
    let id = scan.id;
    if (!UUID_RE.test(id)) {
      id = createUuid();
      idRemap.set(scan.id, id);
      next = next.map((s) => (s.id === scan.id ? { ...s, id } : s));
    }

    const rowScan = next.find((s) => s.id === id);
    if (!rowScan) continue;

    try {
      const photoUrl = await resolvePhotoUrlForUpload(userId, rowScan);
      const { error } = await supabaseDb.from("scans").upsert({
        ...scanToRow({ ...rowScan, photoUrl }),
        id,
        user_id: userId,
        photo_url: photoUrl,
      });
      if (error) {
        console.warn("[syncLocalScansToSupabase] upsert failed:", scan.id, error.message);
        continue;
      }
      if (photoUrl !== rowScan.photoUrl) {
        next = next.map((s) => (s.id === id ? { ...s, photoUrl } : s));
      }
    } catch (err) {
      console.warn("[syncLocalScansToSupabase] scan sync error:", scan.id, err);
    }
  }

  void idRemap;
  const syncedCount = next.filter((s) => s.userId === userId).length;
  await supabaseDb.from("users").update({ total_scans: syncedCount }).eq("id", userId);

  return next;
}

/** Merge remote scans with local scans for one user; remote wins on duplicate ids. */
export function mergeScansForUser(
  userId: string,
  localScans: ScanRecord[],
  remoteScans: ScanRecord[],
): ScanRecord[] {
  const remoteById = new Map(remoteScans.map((s) => [s.id, s] as const));
  const localOnly = localScans.filter((s) => s.userId === userId && !remoteById.has(s.id));
  const mergedForUser = [...remoteScans, ...localOnly].sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime(),
  );
  const others = localScans.filter((s) => s.userId !== userId);
  return [...mergedForUser, ...others];
}
