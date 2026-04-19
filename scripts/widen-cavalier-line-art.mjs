/**
 * Cavalier line-art ships in a 256px-wide template; extra horizontal canvas avoids a chopped tail in layout.
 * Run from repo root: node scripts/widen-cavalier-line-art.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TARGET_W = 320;
const PAD_LEFT = 48;

const file = path.join(root, "assets", "breed-line-art", "cavalier-king-charles-spaniel.png");

const src = await Jimp.read(file);
if (src.width === TARGET_W) {
  console.log("Already", TARGET_W, "px wide — skip");
  process.exit(0);
}
const canvas = new Jimp({ width: TARGET_W, height: src.height, color: 0x00000000 });
canvas.composite(src, PAD_LEFT, 0);
await canvas.write(file);
console.log(`Wrote ${file} (${TARGET_W}×${src.height}, art offset x=${PAD_LEFT})`);
