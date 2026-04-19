export function getBreedReferencePhotoUrl(breedId: string) {
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!projectUrl) {
    return null;
  }

  return `${projectUrl}/storage/v1/object/public/breed-reference/${breedId}.jpg`;
}
