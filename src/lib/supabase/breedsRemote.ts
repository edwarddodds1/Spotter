import { breedsCatalog, RARITY_POINTS } from "@/constants/breeds";
import type { BreedStatRatings } from "@/constants/breedStatRatings";
import type { Breed, BreedRarity } from "@/types/app";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type BreedRow = Database["public"]["Tables"]["breeds"]["Row"];

const supabaseDb = supabase as any;

export type AdminBreedTextPatch = Pick<
  Breed,
  "name" | "description" | "origin" | "temperament" | "size" | "lifespan" | "referencePhotoUrl"
>;

export type AdminBreedProfilePatch = AdminBreedTextPatch & {
  funFact: string | null;
  statRatings: BreedStatRatings | null;
  rarity: BreedRarity;
};

function statRatingsFromRow(row: BreedRow): BreedStatRatings | undefined {
  const i = row.stat_intelligence;
  const e = row.stat_energy;
  const t = row.stat_trainability;
  const s = row.stat_shedding;
  const k = row.stat_kid_friendly;
  if (i == null || e == null || t == null || s == null || k == null) return undefined;
  return { intelligence: i, energy: e, trainability: t, shedding: s, kidFriendly: k };
}

function rowToBreed(row: BreedRow): Breed {
  const statRatings = statRatingsFromRow(row);
  const funFact = row.fun_fact?.trim() ? row.fun_fact.trim() : null;
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
    ...(statRatings ? { statRatings } : {}),
    ...(funFact ? { funFact } : {}),
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
  return breedsCatalog.map((c) => {
    const db = byId.get(c.id);
    if (!db) return c;
    return { ...db, subtitle: c.subtitle };
  });
}

function patchToRow(patch: AdminBreedProfilePatch) {
  const stats = patch.statRatings;
  return {
    name: patch.name.trim(),
    rarity: patch.rarity,
    points: RARITY_POINTS[patch.rarity],
    description: patch.description.trim(),
    origin: patch.origin.trim(),
    temperament: patch.temperament.trim(),
    size: patch.size.trim(),
    lifespan: patch.lifespan.trim(),
    reference_photo_url: patch.referencePhotoUrl?.trim() ? patch.referencePhotoUrl.trim() : null,
    fun_fact: patch.funFact?.trim() ? patch.funFact.trim() : null,
    stat_intelligence: stats?.intelligence ?? null,
    stat_energy: stats?.energy ?? null,
    stat_trainability: stats?.trainability ?? null,
    stat_shedding: stats?.shedding ?? null,
    stat_kid_friendly: stats?.kidFriendly ?? null,
  };
}

/**
 * Saves breed display fields. If no row exists yet (common when migrations ran but `seed.sql` did not),
 * inserts one using `sourceBreed` for id fallback; rarity sets points via `RARITY_POINTS` (requires `breeds_insert_admin_email` RLS policy).
 */
export async function updateBreedProfileRemote(
  breedId: string,
  patch: AdminBreedProfilePatch,
  sourceBreed: Breed,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured." };
  }
  const row = patchToRow(patch);

  const { data: updated, error: updateError } = await supabaseDb
    .from("breeds")
    .update(row)
    .eq("id", breedId)
    .select("id");

  if (updateError) {
    return { error: updateError.message };
  }

  if (updated?.length) {
    return { error: null };
  }

  const { error: insertError } = await supabaseDb.from("breeds").insert({
    id: sourceBreed.id,
    ...row,
  });

  if (insertError) {
    return {
      error:
        insertError.message ??
        "Could not save breed. Ensure you are signed in as admin, run `supabase/seed.sql`, or apply migration 20260510210000_breeds_admin_insert.sql.",
    };
  }

  return { error: null };
}
