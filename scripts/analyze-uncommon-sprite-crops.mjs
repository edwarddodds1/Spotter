/**
 * Derives per-breed crop rectangles from the uncommon sprite sheet by scanning
 * non-white pixels in the upper part of each grid cell (excludes label text).
 * Run: node scripts/analyze-uncommon-sprite-crops.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Jimp, intToRGBA } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "assets", "uncommon-dogs.png");

const COLS = 5;
const ROWS = 4;
const DOG_ONLY_FRACTION = 0.62; // upper band of cell (label sits below)

function isInk(r, g, b, a) {
  if (a < 40) return false;
  // treat near-white opaque as empty (leftover sheet inside cells)
  return r + g + b < 715;
}

async function main() {
  const img = await Jimp.read(srcPath);
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  const cellW = W / COLS;
  const cellH = H / ROWS;

  const crops = [];

  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x0 = Math.round(col * cellW);
    const y0 = Math.round(row * cellH);
    const x1 = Math.round((col + 1) * cellW);
    const yLimit = Math.round(y0 + cellH * DOG_ONLY_FRACTION);

    let minX = x1,
      minY = yLimit,
      maxX = x0,
      maxY = y0;

    for (let y = y0; y < yLimit; y++) {
      for (let x = x0; x < x1; x++) {
        const c = intToRGBA(img.getPixelColor(x, y));
        if (isInk(c.r, c.g, c.b, c.a)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX > maxX) {
      // fallback: center of dog band
      const cw = Math.round(cellW * 0.85);
      const ch = Math.round(cellH * 0.45);
      minX = Math.round(x0 + (cellW - cw) / 2);
      minY = Math.round(y0 + (cellH * 0.08));
      maxX = minX + cw;
      maxY = minY + ch;
    }

    const pad = 6;
    minX = Math.max(x0, minX - pad);
    minY = Math.max(y0, minY - pad);
    maxX = Math.min(x1 - 1, maxX + pad);
    maxY = Math.min(yLimit - 1, maxY + pad);

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    crops.push({ x: minX, y: minY, w: cw, h: ch });
  }

  console.log(`// Auto from ${path.basename(srcPath)} (${W}x${H}), dog-only top ${DOG_ONLY_FRACTION * 100}% of cell`);
  console.log(`export const UNCOMMON_SPRITE_SIZE = { w: ${W}, h: ${H} } as const;`);
  console.log("export const uncommonBreedCrops: Record<string, { x: number; y: number; w: number; h: number }> = {");

  const ids = [
    "cocker-spaniel",
    "beagle",
    "miniature-schnauzer",
    "spoodle",
    "australian-shepherd",
    "pug",
    "chihuahua",
    "bichon-frise",
    "boxer",
    "rottweiler",
    "siberian-husky",
    "whippet",
    "west-highland-white-terrier",
    "australian-cattle-dog",
    "kelpie",
    "dalmatian",
    "shiba-inu",
    "pomeranian",
    "yorkshire-terrier",
    "bull-terrier",
  ];

  ids.forEach((id, i) => {
    const c = crops[i];
    const key = id.includes("-") ? `"${id}"` : id;
    console.log(`  ${key}: { x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h} },`);
  });

  console.log("};");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
