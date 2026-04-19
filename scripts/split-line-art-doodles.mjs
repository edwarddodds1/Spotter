/**
 * White → transparent (edge flood), then split row into 4 equal slices.
 * Order (left→right): groodle, labradoodle, cavoodle, cavalier-king-charles-spaniel
 *
 * Run: node scripts/split-line-art-doodles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "assets", "line-art-doodles-row.png");
const outDir = path.join(root, "assets", "breed-line-art");

const WHITE_SUM = 705;

const BREEDS = ["groodle", "labradoodle", "cavoodle", "cavalier-king-charles-spaniel"];

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

async function main() {
  if (!fs.existsSync(srcPath)) {
    console.error("Missing:", srcPath);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const img = await Jimp.read(srcPath);
  edgeFloodTransparent(img);

  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const sliceW = Math.floor(W / 4);

  const meta = {};

  for (let i = 0; i < 4; i++) {
    const x0 = i * sliceW;
    const w = i === 3 ? W - x0 : sliceW;
    const slice = img.clone().crop({ x: x0, y: 0, w, h: H });
    const id = BREEDS[i];
    const outPath = path.join(outDir, `${id}.png`);
    await slice.write(outPath);
    meta[id] = { w: slice.bitmap.width, h: slice.bitmap.height };
    console.log(outPath, meta[id]);
  }

  const metaPath = path.join(outDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log("Wrote", metaPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
