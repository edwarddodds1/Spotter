import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export async function uploadScanPhoto(userId: string, scanId: string, localUri: string) {
  if (!isSupabaseConfigured) {
    return localUri;
  }

  const path = `${userId}/${scanId}.jpg`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("scans").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  /** Store object path (private bucket); UI resolves signed URLs at display time. */
  return path;
}

export async function uploadAvatar(userId: string, localUri: string) {
  if (!isSupabaseConfigured) {
    return localUri;
  }

  const path = `${userId}/avatar.jpg`;
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("avatars").upload(path, arrayBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const base = data.publicUrl;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${Date.now()}`;
}

/** Uploads hero/header image for a breed; returns storage path for `reference_photo_url` (e.g. breed-reference/id.jpg). */
export async function uploadBreedReferenceHeader(
  breedId: string,
  localUri: string,
): Promise<{ path: string | null; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { path: null, error: new Error("Supabase is not configured.") };
  }

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const lower = localUri.toLowerCase();
  const ext = lower.includes(".png") ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const objectPath = `${breedId}.${ext}`;

  const { error } = await supabase.storage.from("breed-reference").upload(objectPath, arrayBuffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    return { path: null, error };
  }

  return { path: `breed-reference/${objectPath}`, error: null };
}
