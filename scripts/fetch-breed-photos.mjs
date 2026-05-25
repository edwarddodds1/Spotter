/**
 * Fetch copyright-free breed hero photos from Wikimedia Commons.
 *
 * For each breed in `src/constants/breeds.ts`:
 *   1. Query Commons for "{Breed Name} dog" + the breed name alone.
 *   2. Pick the best CC-licensed candidate (CC0 → PD → CC-BY → CC-BY-SA, GFDL ok).
 *   3. Download, normalise orientation, resize, JPEG.
 *   4. Upload to Supabase Storage `breed-reference/{breedId}.jpg` (service role key required).
 *   5. Upsert `breeds.reference_photo_url = breed-reference/{breedId}.jpg`.
 *
 * Writes:
 *   - scripts/breed-photo-credits.json (one entry per breed: photographer, source, license)
 *   - scripts/breed-photo-report.json  (success/skip/failure summary for manual follow-up)
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_URL = "https://YOUR-REF.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
 *   node scripts/fetch-breed-photos.mjs
 *
 *   Optional flags:
 *     --dry-run         download only, do not upload or write to DB
 *     --only=id1,id2    process only the listed breed ids
 *     --skip-existing   skip breeds that already have reference_photo_url set
 *     --max=N           cap number of breeds processed (testing)
 */
import { createClient } from "@supabase/supabase-js";
import { Jimp } from "jimp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const flagDryRun = argv.includes("--dry-run");
const flagSkipExisting = argv.includes("--skip-existing");
const onlyArg = argv.find((a) => a.startsWith("--only="));
const onlyIds = onlyArg ? onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean) : null;
const maxArg = argv.find((a) => a.startsWith("--max="));
const maxCount = maxArg ? Number(maxArg.slice("--max=".length)) : Infinity;

// ---- Load env (.env in repo root) -----------------------------------------
async function loadDotEnv() {
  try {
    const text = await fs.readFile(path.join(repoRoot, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key]) continue;
      const val = rawVal.replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  } catch {
    /* .env optional */
  }
}
await loadDotEnv();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.Supabase_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!flagDryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in env or .env, or run with --dry-run.",
  );
  process.exit(1);
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// ---- Pull breed list out of TS source -------------------------------------
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

// ---- Wikimedia Commons search helpers -------------------------------------
const UA = "Spotter-BreedPhotoFetcher/1.0 (+https://spotter.app)";

async function commonsJson(params) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("origin", "*");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons ${res.status} ${res.statusText}`);
  return res.json();
}

/** Returns canonical file titles (without prefix) for a search query. */
async function searchCommons(query) {
  const data = await commonsJson({
    action: "query",
    list: "search",
    srsearch: `${query} filetype:bitmap`,
    srnamespace: 6,
    srlimit: 20,
    srprop: "size",
  });
  return (data?.query?.search ?? []).map((r) => r.title);
}

/** Returns image metadata + license info for a list of file titles. */
async function fileInfo(titles) {
  if (titles.length === 0) return [];
  const data = await commonsJson({
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: 1600,
  });
  const pages = data?.query?.pages ?? [];
  return pages
    .filter((p) => Array.isArray(p.imageinfo) && p.imageinfo.length > 0)
    .map((p) => {
      const info = p.imageinfo[0];
      const meta = info.extmetadata ?? {};
      const text = (k) => meta?.[k]?.value ?? null;
      return {
        title: p.title,
        url: info.url,
        thumbUrl: info.thumburl ?? info.url,
        width: info.width,
        height: info.height,
        mime: info.mime,
        license: text("LicenseShortName"),
        licenseUrl: text("LicenseUrl"),
        artist: stripHtml(text("Artist")),
        credit: stripHtml(text("Credit")),
        permission: stripHtml(text("Permission")),
        objectName: stripHtml(text("ObjectName")),
        usageTerms: stripHtml(text("UsageTerms")),
        descriptionUrl: info.descriptionurl,
      };
    });
}

function stripHtml(s) {
  if (!s) return null;
  return String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null;
}

/** True if license string is OK for redistribution with attribution. */
function licenseOk(license) {
  if (!license) return false;
  const l = license.toLowerCase();
  if (l.includes("public domain") || l === "pd" || l.includes("cc0") || l.includes("cc 0")) return true;
  if (l.includes("cc by") || l.includes("cc-by") || l.includes("attribution")) return true;
  if (l.includes("gfdl") || l.includes("gnu free")) return true;
  return false;
}

/** Lower is better — prefer most permissive, prefer landscape, prefer larger. */
function scoreCandidate(c, breedNameLower) {
  let score = 0;
  const l = (c.license ?? "").toLowerCase();
  if (l.includes("cc0") || l.includes("public domain")) score -= 100;
  else if (l.includes("cc by-sa") || l.includes("cc-by-sa")) score -= 10;
  else if (l.includes("cc by") || l.includes("cc-by")) score -= 30;
  /* Prefer landscape (typical hero shape). */
  if (c.width && c.height) {
    const aspect = c.width / c.height;
    if (aspect > 0.9 && aspect < 1.9) score -= 10;
  }
  /* Prefer larger originals (we resize down anyway, but big = quality). */
  if (c.width >= 1200) score -= 5;
  /* Title relevance — strongly prefer when breed name appears. */
  const titleLower = c.title?.toLowerCase() ?? "";
  if (breedNameLower && titleLower.includes(breedNameLower)) score -= 40;
  if (titleLower.includes("dog")) score -= 2;
  if (titleLower.includes("puppy")) score -= 5;
  /* Penalise JPGs that are likely show/competition shots (overstaged). */
  if (titleLower.includes("show") || titleLower.includes("winner") || titleLower.includes("championship")) {
    score += 5;
  }
  return score;
}

const BAD_TITLE_HINTS = [
  "logo",
  "diagram",
  "skeleton",
  "skull",
  "icon",
  "stamp",
  "map",
  "flag",
  "coat of arms",
  "graph",
  "chart",
  "infograph",
  "drawing",
  "illustration",
  "painting",
  "engraving",
  "lithograph",
  "(psf)",     // Public Schools Foundation clipart line art
  "(pictoframe)",
  "mascot",     // usually unrepresentative old photos
  "statue",
  "sculpture",
  "ceramic",
  "clay",
  "wood carving",
  "embroider",
  "porcelain",
];
function isBadTitle(t) {
  const l = t.toLowerCase();
  if (BAD_TITLE_HINTS.some((h) => l.includes(h))) return true;
  /* Reject titles that signal a pre-1990 photo / artwork. */
  const yearMatches = l.match(/\b(1[6-9]\d{2}|19[0-8]\d)\b/);
  if (yearMatches) return true;
  if (/circa\s+1[6-9]\d{2}/.test(l) || /circa\s+19[0-8]\d/.test(l)) return true;
  if (/\bca\.?\s+1[6-9]\d{2}/.test(l)) return true;
  return false;
}

async function bestCandidateForBreed(breedName) {
  const queries = [
    `${breedName} dog`,
    `${breedName} puppy`,
    `${breedName}`,
  ];
  const titlesSeen = new Set();
  const titles = [];
  for (const q of queries) {
    let hits = [];
    try {
      hits = await searchCommons(q);
    } catch (err) {
      console.warn(`  search "${q}" failed:`, err.message);
    }
    for (const t of hits) {
      if (!titlesSeen.has(t)) {
        titlesSeen.add(t);
        titles.push(t);
      }
    }
    if (titles.length >= 30) break;
  }
  const filtered = titles.filter((t) => !isBadTitle(t));
  if (filtered.length === 0) return null;

  const candidates = await fileInfo(filtered.slice(0, 25));
  const usable = candidates
    .filter((c) => licenseOk(c.license))
    .filter((c) => /image\/(jpeg|png|webp)/i.test(c.mime ?? ""))
    .filter((c) => (c.width ?? 0) >= 600 && (c.height ?? 0) >= 400);
  if (usable.length === 0) return null;

  const nameLower = breedName.toLowerCase();
  usable.sort((a, b) => scoreCandidate(a, nameLower) - scoreCandidate(b, nameLower));
  return usable[0];
}

// ---- Image processing -----------------------------------------------------
async function downloadAndProcess(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const img = await Jimp.read(buf);
  /* Resize so the long edge is 1200, preserve aspect. */
  const maxEdge = 1200;
  if (img.bitmap.width >= img.bitmap.height) {
    if (img.bitmap.width > maxEdge) img.resize({ w: maxEdge });
  } else {
    if (img.bitmap.height > maxEdge) img.resize({ h: maxEdge });
  }
  const out = await img.getBuffer("image/jpeg", { quality: 82 });
  return out;
}

// ---- Supabase upload ------------------------------------------------------
async function uploadToBucket(breedId, jpegBuffer) {
  if (!supabase) return null;
  const objectPath = `${breedId}.jpg`;
  const { error } = await supabase.storage
    .from("breed-reference")
    .upload(objectPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return `breed-reference/${objectPath}`;
}

async function updateBreedRow(breedId, refPath) {
  if (!supabase) return;
  const { error } = await supabase
    .from("breeds")
    .update({ reference_photo_url: refPath })
    .eq("id", breedId);
  if (error) throw error;
}

async function getExistingRefs() {
  if (!supabase) return new Map();
  const { data, error } = await supabase.from("breeds").select("id,reference_photo_url");
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.id, r.reference_photo_url ?? null]));
}

// ---- Main -----------------------------------------------------------------
const breeds = await loadBreeds();
const filtered = onlyIds ? breeds.filter((b) => onlyIds.includes(b.id)) : breeds;
const work = filtered.slice(0, maxCount);

console.log(`Processing ${work.length} breed(s) ${flagDryRun ? "(dry-run)" : ""}`);

let existingRefs = new Map();
if (flagSkipExisting && !flagDryRun) {
  try {
    existingRefs = await getExistingRefs();
  } catch (err) {
    console.warn("Could not read existing refs:", err.message);
  }
}

const credits = {};
const report = { ok: [], skipped: [], failed: [] };

for (const breed of work) {
  process.stdout.write(`\n[${breed.id}] ${breed.name}\n`);
  try {
    if (flagSkipExisting && existingRefs.get(breed.id)) {
      console.log("  skip: already has reference_photo_url");
      report.skipped.push({ id: breed.id, reason: "already set" });
      continue;
    }
    const chosen = await bestCandidateForBreed(breed.name);
    if (!chosen) {
      console.log("  no usable Commons candidate found");
      report.failed.push({ id: breed.id, name: breed.name, reason: "no candidate" });
      continue;
    }
    console.log(`  pick: ${chosen.title}`);
    console.log(`        license=${chosen.license} | ${chosen.width}x${chosen.height}`);
    console.log(`        ${chosen.descriptionUrl}`);

    const jpeg = await downloadAndProcess(chosen.thumbUrl ?? chosen.url);

    if (flagDryRun) {
      const localPath = path.join(repoRoot, "scripts/.breed-photos", `${breed.id}.jpg`);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, jpeg);
      console.log(`  wrote (dry-run): ${path.relative(repoRoot, localPath)}`);
    } else {
      const refPath = await uploadToBucket(breed.id, jpeg);
      await updateBreedRow(breed.id, refPath);
      console.log(`  uploaded: ${refPath}`);
    }

    credits[breed.id] = {
      breed: breed.name,
      title: chosen.title,
      sourceUrl: chosen.descriptionUrl,
      directUrl: chosen.url,
      license: chosen.license,
      licenseUrl: chosen.licenseUrl,
      artist: chosen.artist,
      credit: chosen.credit,
      width: chosen.width,
      height: chosen.height,
    };
    report.ok.push({ id: breed.id, license: chosen.license, source: chosen.descriptionUrl });
  } catch (err) {
    console.warn(`  ERROR: ${err.message}`);
    report.failed.push({ id: breed.id, name: breed.name, reason: err.message });
  }
  /* Be polite to the Commons API. */
  await new Promise((r) => setTimeout(r, 250));
}

await fs.writeFile(
  path.join(repoRoot, "scripts/breed-photo-credits.json"),
  JSON.stringify(credits, null, 2),
);
await fs.writeFile(
  path.join(repoRoot, "scripts/breed-photo-report.json"),
  JSON.stringify(report, null, 2),
);

console.log(`\n=== SUMMARY ===`);
console.log(`OK:      ${report.ok.length}`);
console.log(`Skipped: ${report.skipped.length}`);
console.log(`Failed:  ${report.failed.length}`);
if (report.failed.length) {
  console.log("\nBreeds without a photo (need manual review):");
  for (const f of report.failed) console.log(`  - ${f.id}  (${f.name}): ${f.reason}`);
}
console.log("\nCredits written to scripts/breed-photo-credits.json");
console.log("Report  written to scripts/breed-photo-report.json");
