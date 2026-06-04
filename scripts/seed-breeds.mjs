/**
 * Seed `public.breeds` from the local TypeScript catalog.
 *
 * Required env (in .env or shell):
 *   SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/seed-breeds.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function loadDotEnv() {
  try {
    const text = await fs.readFile(path.join(repoRoot, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* optional */
  }
}
await loadDotEnv();

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const RARITY_POINTS = { common: 1, uncommon: 3, rare: 7, legendary: 15 };

/** Parse breeds from the TS file using a simple regex (avoids running the TS via Node). */
async function loadBreeds() {
  const src = await fs.readFile(path.join(repoRoot, "src/constants/breeds.ts"), "utf8");
  const start = src.indexOf("export const breedsCatalog: Breed[] = [");
  if (start < 0) throw new Error("Could not find breedsCatalog in breeds.ts");
  const block = src.slice(start);

  const objRe = /\{[\s\S]*?\n\s\s\},/g;
  const out = [];
  for (const m of block.match(objRe) ?? []) {
    const get = (key) => {
      const re = new RegExp(`${key}:\\s*"([^"]*)"`);
      return m.match(re)?.[1] ?? null;
    };
    const id = get("id");
    if (!id) continue;
    out.push({
      id,
      name: get("name") ?? id,
      rarity: get("rarity") ?? "common",
      subtitle: get("subtitle"),
      description: get("description") ?? "",
      origin: get("origin") ?? "",
      temperament: get("temperament") ?? "",
      size: get("size") ?? "",
      lifespan: get("lifespan") ?? "",
    });
  }
  return out;
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const breeds = await loadBreeds();
console.log(`Seeding ${breeds.length} breed(s) into public.breeds…`);

const rows = breeds.map((b) => ({
  id: b.id,
  name: b.name,
  rarity: b.rarity,
  points: RARITY_POINTS[b.rarity] ?? 1,
  description: b.description,
  origin: b.origin,
  temperament: b.temperament,
  size: b.size,
  lifespan: b.lifespan,
  reference_photo_url: null,
  fun_fact: null,
  stat_intelligence: null,
  stat_energy: null,
  stat_trainability: null,
  stat_shedding: null,
  stat_kid_friendly: null,
}));

const { error } = await admin.from("breeds").upsert(rows, { onConflict: "id" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}

const { count } = await admin.from("breeds").select("*", { count: "exact", head: true });
console.log(`Done. public.breeds now has ${count} row(s).`);
