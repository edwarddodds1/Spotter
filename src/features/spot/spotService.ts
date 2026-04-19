import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadScanPhoto } from "@/lib/supabase/storage";
import { useSpotterStore } from "@/store/useSpotterStore";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export async function saveSpot(input: {
  userId: string;
  breedId: string | null;
  photoUri: string;
  dogName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
  coatColourId?: string | null;
  coatColourNote?: string | null;
  spotComment?: string | null;
  isPrivate?: boolean;
}) {
  const db = supabase as any;
  const result = useSpotterStore.getState().completeScan({
    breedId: input.breedId,
    photoUrl: input.photoUri,
    dogName: input.dogName,
    locationLat: input.locationLat,
    locationLng: input.locationLng,
    locationLabel: input.locationLabel,
    coatColourId: input.coatColourId,
    coatColourNote: input.coatColourNote,
    spotComment: input.spotComment,
    isPrivate: input.isPrivate ?? false,
  });

  if (!isSupabaseConfigured) {
    return result;
  }

  const uploadedUrl = await uploadScanPhoto(input.userId, result.scan.id, input.photoUri);

  let dogProfileId = result.dogProfile?.id ?? null;
  const trimmedName = input.dogName?.trim();

  if (input.breedId && trimmedName) {
    const normalized = normalizeName(trimmedName);
    const { data: existingDog } = await db
      .from("dog_profiles")
      .select("id,total_scans")
      .eq("breed_id", input.breedId)
      .eq("normalized_name", normalized)
      .maybeSingle();

    if (existingDog) {
      dogProfileId = existingDog.id;
      await db
        .from("dog_profiles")
        .update({ total_scans: existingDog.total_scans + 1 })
        .eq("id", existingDog.id);
    } else {
      const { data: createdDog } = await db
        .from("dog_profiles")
        .insert({
          id: result.dogProfile?.id ?? undefined,
          name: trimmedName,
          normalized_name: normalized,
          breed_id: input.breedId,
          owner_id: null,
          total_scans: 1,
        })
        .select("id")
        .single();
      dogProfileId = createdDog?.id ?? dogProfileId;
    }
  }

  await db.from("scans").upsert({
    id: result.scan.id,
    user_id: input.userId,
    breed_id: input.breedId,
    photo_url: uploadedUrl,
    dog_name: trimmedName ?? null,
    dog_profile_id: dogProfileId,
    location_lat: input.locationLat ?? null,
    location_lng: input.locationLng ?? null,
    location_label: result.scan.locationLabel,
    scanned_at: result.scan.scannedAt,
    is_pending_breed: !input.breedId,
    points_awarded: result.scan.pointsAwarded,
    matched_featured_breed: result.scan.matchedFeaturedBreed,
    coat_colour_id: result.scan.coatColourId,
    coat_colour_note: result.scan.coatColourNote,
    spot_comment: result.scan.spotComment,
    is_private: result.scan.isPrivate,
  });

  await db
    .from("users")
    .update({ total_scans: useSpotterStore.getState().currentUser.totalScans })
    .eq("id", input.userId);

  return result;
}

export async function deleteSpot(scanId: string) {
  const { currentUser, scans, deleteScan } = useSpotterStore.getState();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan || scan.userId !== currentUser.id) return;

  deleteScan(scanId);

  if (!isSupabaseConfigured) return;
  const db = supabase as any;
  await db.from("scans").delete().eq("id", scanId).eq("user_id", currentUser.id);
  await db.from("users").update({ total_scans: useSpotterStore.getState().currentUser.totalScans }).eq("id", currentUser.id);
}

export async function updateScanPrivacy(scanId: string, isPrivate: boolean) {
  const { currentUser, scans, setScanPrivate } = useSpotterStore.getState();
  const scan = scans.find((s) => s.id === scanId);
  if (!scan || scan.userId !== currentUser.id) return;

  setScanPrivate(scanId, isPrivate);

  if (!isSupabaseConfigured) return;
  const db = supabase as any;
  await db.from("scans").update({ is_private: isPrivate }).eq("id", scanId).eq("user_id", currentUser.id);
}
