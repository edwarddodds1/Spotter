import type { Breed } from "@/types/app";

import { getResolvedSupabaseProjectUrl } from "@/lib/supabase/client";

export function getBreedReferencePhotoUrl(breedId: string) {
  const projectUrl = getResolvedSupabaseProjectUrl();
  if (!projectUrl) {
    return null;
  }

  return `${projectUrl}/storage/v1/object/public/breed-reference/${breedId}.jpg`;
}

/** Hero image: full URL, storage path from DB, or default bucket path by breed id. */
export function resolveBreedHeroImageUri(breed: Breed): string | null {
  const base = getResolvedSupabaseProjectUrl();
  const ref = breed.referencePhotoUrl?.trim();
  if (ref) {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref;
    }
    if (base) {
      const path = ref.replace(/^\/+/, "");
      return `${base}/storage/v1/object/public/${path}`;
    }
  }
  return getBreedReferencePhotoUrl(breed.id);
}
