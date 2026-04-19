/**
 * One-off / repeatable: new Cavalier line-art PNG → transparent background, trim, write to breed-line-art.
 *
 *   node scripts/process-cavalier-line-art.mjs [path/to/source.png]
 *
 * Default source: assets/breed-line-art/incoming/cavalier-new.png
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const WHITE_SUM = 705;

function isBg(r, g, b) {
  return r + g + b >= WHITE_SUM;
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

function opaqueBounds(img) {
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const data = img.bitmap.data;
  let minX = W,
    minY = H,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (data[idx + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  return { minX, minY, maxX, maxY };
}

const PAD = 12;

const defaultSrc = path.join(root, "assets", "breed-line-art", "incoming", "cavalier-new.png");
const outPath = path.join(root, "assets", "breed-line-art", "cavalier-king-charles-spaniel.png");

const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSrc;

if (!fs.existsSync(srcPath)) {
  console.error("Missing source:", srcPath);
  process.exit(1);
}

const img = await Jimp.read(srcPath);
edgeFloodTransparent(img);

const b = opaqueBounds(img);
if (!b) {
  console.error("No opaque pixels after flood — check image");
  process.exit(1);
}

const cropW = b.maxX - b.minX + 1 + PAD * 2;
const cropH = b.maxY - b.minY + 1 + PAD * 2;
const trimmed = img.crop({
  x: Math.max(0, b.minX - PAD),
  y: Math.max(0, b.minY - PAD),
  w: Math.min(img.width - Math.max(0, b.minX - PAD), cropW),
  h: Math.min(img.height - Math.max(0, b.minY - PAD), cropH),
});

await trimmed.write(outPath);

const W = trimmed.bitmap.width;
const H = trimmed.bitmap.height;
/** Bottom of opaque ink row (paw baseline heuristic). */
let feetRow = 0;
const data = trimmed.bitmap.data;
for (let y = H - 1; y >= 0; y--) {
  let ink = false;
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4;
    const sum = data[idx] + data[idx + 1] + data[idx + 2];
    if (data[idx + 3] > 40 && sum < 680) {
      ink = true;
      break;
    }
  }
  if (ink) {
    feetRow = y + 2;
    break;
  }
}
if (feetRow === 0) feetRow = H - 4;

console.log(`Wrote ${outPath}`);
console.log(`Dimensions: ${W}×${H} — set cavalierLineArtSheetSize and feetY ≈ ${feetRow}`);
