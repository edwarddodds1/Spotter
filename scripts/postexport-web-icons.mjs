import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(process.cwd());
const distDir = resolve(rootDir, "dist");
const logoSource = resolve(rootDir, "assets", "spotter-logo.png");
const webIndexPath = resolve(distDir, "index.html");

if (!existsSync(distDir) || !existsSync(webIndexPath)) {
  throw new Error("dist/index.html not found. Run Expo web export before this script.");
}

if (!existsSync(logoSource)) {
  throw new Error("assets/spotter-logo.png not found.");
}

mkdirSync(distDir, { recursive: true });
copyFileSync(logoSource, resolve(distDir, "spotter-logo.png"));
copyFileSync(logoSource, resolve(distDir, "apple-touch-icon.png"));

const indexHtml = readFileSync(webIndexPath, "utf8");

const iconTags = [
  '<link rel="icon" type="image/png" href="/spotter-logo.png" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Spotter" />',
].join("");

const nextHtml = indexHtml.replace(/<link rel="icon" href="\/favicon\.ico" \/>/g, iconTags);
writeFileSync(webIndexPath, nextHtml, "utf8");

console.log("Patched web icons for favicon and Apple home screen.");
