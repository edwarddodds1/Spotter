/**
 * Makes sprite sheets ready for hex tiles:
 * 1) Edge flood: "white" pixels touching the image border → transparent (sheet background).
 * Keep it simple and stable:
 * - clear edge-connected white sheet background
 * - clear below each crop's feet baseline (label/background strip)
 *
 * Dog colors inside the silhouette stay opaque (not connected to border via white; above feetY).
 *
 * Run: node scripts/apply-sprite-sheet-transparency.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Sum r+g+b above this counts as floodable "background" white. */
const WHITE_SUM = 705;
const BELOW_FEET_PX = 12;
const RESTORE_NON_BG_SUM = 742;
const INTERIOR_RESTORE_BREEDS = new Set([
  "cavoodle",
  "labradoodle",
  "groodle",
  "cavalier-king-charles-spaniel",
]);

const JOBS = [
  {
    name: "common",
    cropsTs: path.join("src", "constants", "commonSpriteCrops.ts"),
    png: path.join("assets", "common-dogs.png"),
  },
  {
    name: "uncommon",
    cropsTs: path.join("src", "constants", "uncommonSpriteCrops.ts"),
    png: path.join("assets", "uncommon-dogs.png"),
  },
  {
    name: "rare-legendary",
    cropsTs: path.join("src", "constants", "rareLegendarySpriteCrops.ts"),
    png: path.join("assets", "rare-legendary-dogs.png"),
  },
];

function isBg(r, g, b) {
  return r + g + b >= WHITE_SUM;
}

/**
 * Pull `{ id: { x, y, w, h, feetY } }` entries from a crops TS file.
 */
function parseCropsTs(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const crops = Object.create(null);
  const re =
    /(?:^|\n)\s*(?:"([^"]+)"|(\w+)):\s*\{\s*x:\s*(\d+)\s*,\s*y:\s*(\d+)\s*,\s*w:\s*(\d+)\s*,\s*h:\s*(\d+)\s*,\s*feetY:\s*(\d+)/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = m[1] ?? m[2];
    crops[id] = {
      x: Number(m[3]),
      y: Number(m[4]),
      w: Number(m[5]),
      h: Number(m[6]),
      feetY: Number(m[7]),
    };
  }
  return crops;
}

function edgeFloodTransparent(img) {
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const data = img.bitmap.data;

  const mark = new Uint8Array(W * H);
  const queue = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (mark[i]) return;
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (!isBg(r, g, b)) return;
    mark[i] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }

  let qi = 0;
  while (qi < queue.length) {
    const x = queue[qi++];
    const y = queue[qi++];
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      push(nx, ny);
    }
  }

  for (let i = 0; i < W * H; i++) {
    if (mark[i]) {
      const idx = i * 4;
      data[idx + 3] = 0;
    }
  }
}

function clearBelowFeet(img, crops) {
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const data = img.bitmap.data;

  for (const c of Object.values(crops)) {
    const { x, y, w, h, feetY } = c;
    const x1 = Math.max(0, x);
    const x2 = Math.min(W, x + w);
    const y2 = Math.min(H, y + h);
    const clearFromY = Math.max(y, feetY + BELOW_FEET_PX);

    for (let sy = clearFromY; sy < y2; sy++) {
      for (let sx = x1; sx < x2; sx++) {
        const idx = (sy * W + sx) * 4;
        data[idx + 3] = 0;
      }
    }
  }
}

function restoreInteriorColourForBreeds(img, original, crops) {
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const out = img.bitmap.data;
  const src = original.bitmap.data;

  const setFromSource = (x, y) => {
    const idx = (y * W + x) * 4;
    out[idx] = src[idx];
    out[idx + 1] = src[idx + 1];
    out[idx + 2] = src[idx + 2];
    out[idx + 3] = src[idx + 3];
  };

  for (const [breedId, c] of Object.entries(crops)) {
    if (!INTERIOR_RESTORE_BREEDS.has(breedId)) continue;
    const { x, y, w, h, feetY } = c;
    const x1 = Math.max(0, x);
    const x2 = Math.min(W, x + w);
    const y1 = Math.max(0, y);
    // Do not restore inside the intentionally-cleared label strip.
    const y2 = Math.min(H, Math.min(y + h, feetY + BELOW_FEET_PX));

    for (let sy = y1; sy < y2; sy++) {
      for (let sx = x1; sx < x2; sx++) {
        const idx = (sy * W + sx) * 4;
        if (out[idx + 3] !== 0) continue;
        const sa = src[idx + 3];
        if (sa === 0) continue;
        const sum = src[idx] + src[idx + 1] + src[idx + 2];
        // Restore only non-background pixels; keep white background transparent.
        if (sum < RESTORE_NON_BG_SUM) setFromSource(sx, sy);
      }
    }
  }
}

async function processPng(label, crops, pngPath) {
  if (!fs.existsSync(pngPath)) {
    console.warn(`Skip (missing): ${pngPath}`);
    return;
  }
  const img = await Jimp.read(pngPath);
  const original = img.clone();
  edgeFloodTransparent(img);
  clearBelowFeet(img, crops);
  restoreInteriorColourForBreeds(img, original, crops);
  await img.write(pngPath);
  const st = fs.statSync(pngPath);
  console.log(`Wrote ${path.relative(root, pngPath)} (${st.size} bytes) — ${label}, ${Object.keys(crops).length} crops`);
}

async function main() {
  for (const job of JOBS) {
    const tsPath = path.join(root, job.cropsTs);
    const crops = parseCropsTs(tsPath);
    const pngPath = path.join(root, job.png);
    await processPng(job.name, crops, pngPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
