import { getResolvedSupabaseProjectUrl } from "@/lib/supabase/client";

export function getBreedReferencePhotoUrl(breedId: string) {
  const projectUrl = getResolvedSupabaseProjectUrl();
  if (!projectUrl) {
    return null;
  }

  return `${projectUrl}/storage/v1/object/public/breed-reference/${breedId}.jpg`;
}
