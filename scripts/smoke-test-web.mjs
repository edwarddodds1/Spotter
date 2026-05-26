#!/usr/bin/env node
/**
 * Spotter web smoke test.
 *
 * Usage: `npm run build:web && npm run smoke:web`
 *
 * Runs against the static export in `dist/`:
 *  1. Verifies `dist/index.html` exists and is non-empty.
 *  2. Serves `dist/` on a local port (no extra deps — uses Node's http + fs).
 *  3. Launches Playwright Chromium and confirms:
 *       - the page loads with a non-empty body,
 *       - no `console.error` calls during boot,
 *       - the AuthScreen ("Continue with email") OR a logged-in shell renders.
 *
 * Exits non-zero on any failure so the CI step can block deploys.
 *
 * Playwright is loaded lazily so this script can be invoked without it installed —
 * it will print install instructions and exit 1.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";

const DIST_DIR = resolve(process.cwd(), "dist");
const INDEX_HTML = join(DIST_DIR, "index.html");
const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const BOOT_TIMEOUT_MS = 30_000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function fail(message) {
  console.error(`[smoke] FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[smoke] OK: ${message}`);
}

if (!existsSync(INDEX_HTML)) {
  fail(`dist/index.html not found. Run \`npm run build:web\` first.`);
}
if (statSync(INDEX_HTML).size < 256) {
  fail(`dist/index.html is suspiciously small (${statSync(INDEX_HTML).size} bytes).`);
}
ok("dist/index.html exists");

const server = createServer((req, res) => {
  try {
    const rawUrl = req.url ?? "/";
    const safePath = rawUrl.split("?")[0];
    let filePath = join(DIST_DIR, safePath);
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = INDEX_HTML;
    }
    const mime = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500);
    res.end(String(err));
  }
});

async function main() {
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    fail(
      "Playwright is not installed. Run `npx playwright install --with-deps chromium` (CI) or `npm i -D playwright` (local).",
    );
  }

  await new Promise((resolveListen) => server.listen(PORT, resolveListen));
  ok(`serving dist/ on http://localhost:${PORT}`);

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  try {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle", timeout: BOOT_TIMEOUT_MS });

    const rootHasContent = await page.evaluate(() => {
      const root = document.getElementById("root");
      return Boolean(root && root.children.length > 0);
    });
    if (!rootHasContent) fail("#root rendered empty after boot.");
    ok("#root has rendered content");

    const sawAuthOrApp = await page.evaluate(() => {
      const text = document.body.innerText || "";
      return text.includes("Spotter") || text.includes("Sign in") || text.includes("Continue with email");
    });
    if (!sawAuthOrApp) fail("Boot screen did not contain Spotter copy (auth or app shell).");
    ok("boot UI rendered Spotter branding");

    if (consoleErrors.length > 0) {
      console.error("[smoke] Console errors during boot:");
      for (const line of consoleErrors) console.error("  -", line);
      fail(`Boot produced ${consoleErrors.length} console error(s).`);
    }
    ok("no console errors during boot");
  } finally {
    await browser.close();
    server.close();
  }

  ok("smoke test passed");
}

main().catch((err) => {
  console.error(err);
  server.close();
  process.exit(1);
});
