/**
 * Fetch a public thumbnail URL for each breed from the Wikipedia REST API and
 * print a JSON map of `{ breedId: directUrl }`.
 *
 * Output is intended to be fed into a single SQL UPDATE so that
 * `public.breeds.reference_photo_url` points at a valid hero image even when
 * the `breed-reference` Storage bucket is empty.
 *
 * Usage:
 *   node scripts/fetch-breed-thumbnails.mjs > scripts/breed-thumbnails.json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const UA = "Spotter-BreedThumbFetcher/1.0 (+https://spotter.app)";

async function loadBreeds() {
  const src = await fs.readFile(path.join(repoRoot, "src/constants/breeds.ts"), "utf8");
  const breeds = [];
  const blockRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(src))) {
    breeds.push({ id: m[1], name: m[2] });
  }
  return breeds;
}

/** Candidate Wikipedia article titles to try, most specific first. */
function candidateTitles(name) {
  const cleanedName = name.replace(/\s*\(.*?\)\s*/g, "").trim();
  const titles = [
    cleanedName,
    `${cleanedName} (dog)`,
    `${cleanedName} (dog breed)`,
    `${cleanedName} dog`,
  ];
  return Array.from(new Set(titles));
}

async function fetchSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, "_"),
  )}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, accept: "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

async function findThumbnail(name) {
  for (const title of candidateTitles(name)) {
    try {
      const data = await fetchSummary(title);
      if (!data) continue;
      const thumb = data.originalimage?.source ?? data.thumbnail?.source ?? null;
      if (thumb) {
        return {
          title: data.title,
          url: thumb,
          page: data.content_urls?.desktop?.page ?? null,
        };
      }
    } catch {
      /* keep trying */
    }
  }
  return null;
}

const breeds = await loadBreeds();
const out = {};
for (const breed of breeds) {
  const hit = await findThumbnail(breed.name);
  out[breed.id] = hit;
  await new Promise((r) => setTimeout(r, 120));
  process.stderr.write(`${breed.id}: ${hit?.url ? "ok" : "MISS"}\n`);
}
process.stdout.write(JSON.stringify(out, null, 2));
