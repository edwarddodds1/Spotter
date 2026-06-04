import { Jimp, JimpMime } from "jimp";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Produce a 1024x1024 App Store icon with NO alpha channel.
 *
 * Apple rejects marketing icons that contain an alpha channel (even if fully
 * opaque). Jimp encodes RGBA (PNG color type 6) by default, which would *add*
 * an alpha channel — exactly the thing we're avoiding. We flatten onto an
 * opaque white canvas and force PNG color type 2 (truecolour, no alpha), then
 * assert the encoded bytes really are alpha-free before writing.
 */
const SRC = "assets/spotter-logo.png";
const OUT = "assets/icon-ios.png";

const src = await Jimp.read(SRC);
src.resize({ w: 1024, h: 1024 });

// Flatten onto opaque white so any (future) transparency becomes solid.
const canvas = new Jimp({ width: 1024, height: 1024, color: 0xffffffff });
canvas.composite(src, 0, 0);

// Force truecolour without alpha (PNG color type 2).
const buffer = await canvas.getBuffer(JimpMime.png, { colorType: 2 });
writeFileSync(OUT, buffer);

// Verify: byte 25 of a PNG is the color type. 2 = RGB (no alpha), 6 = RGBA.
const written = readFileSync(OUT);
const width = written.readUInt32BE(16);
const height = written.readUInt32BE(20);
const colorType = written[25];
if (colorType === 4 || colorType === 6) {
  throw new Error(`icon still has an alpha channel (colorType=${colorType})`);
}
console.log(`OK wrote ${OUT}: ${width}x${height}, colorType=${colorType} (2=RGB no-alpha)`);
