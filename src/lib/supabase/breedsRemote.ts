import { breedsCatalog } from "@/constants/breeds";
import type { Breed } from "@/types/app";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type BreedRow = Database["public"]["Tables"]["breeds"]["Row"];

const supabaseDb = supabase as any;

export type AdminBreedTextPatch = Pick<
  Breed,
  "name" | "description" | "origin" | "temperament" | "size" | "lifespan" | "referencePhotoUrl"
>;

function rowToBreed(row: BreedRow): Breed {
  return {
    id: row.id,
    name: row.name,
    rarity: row.rarity,
    points: row.points,
    description: row.description,
    origin: row.origin,
    temperament: row.temperament,
    size: row.size,
    lifespan: row.lifespan,
    referencePhotoUrl: row.reference_photo_url,
  };
}

/**
 * Load breeds from Supabase and merge onto the local catalog (DB wins per id when a row exists).
 * Returns null if Supabase is not configured or the request fails.
 */
export async function fetchBreedsFromSupabase(): Promise<Breed[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabaseDb.from("breeds").select("*");
  if (error || !data?.length) return null;
  const byId = new Map<string, Breed>((data as BreedRow[]).map((r) => [r.id, rowToBreed(r)]));
  return breedsCatalog.map((c) => byId.get(c.id) ?? c);
}

export async function updateBreedProfileRemote(
  breedId: string,
  patch: AdminBreedTextPatch,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured." };
  }
  const { error } = await supabaseDb
    .from("breeds")
    .update({
      name: patch.name.trim(),
      description: patch.description.trim(),
      origin: patch.origin.trim(),
      temperament: patch.temperament.trim(),
      size: patch.size.trim(),
      lifespan: patch.lifespan.trim(),
      reference_photo_url: patch.referencePhotoUrl?.trim() ? patch.referencePhotoUrl.trim() : null,
    })
    .eq("id", breedId);
  return { error: error?.message ?? null };
}
