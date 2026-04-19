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

  const { data } = supabase.storage.from("scans").getPublicUrl(path);
  return data.publicUrl;
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
  return data.publicUrl;
}
