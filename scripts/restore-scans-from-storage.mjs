/**
 * Rebuild missing `public.scans` rows from photos still in Supabase Storage.
 *
 * Use when photos uploaded but DB upserts failed (e.g. legacy non-UUID scan ids).
 *
 * Required env:
 *   SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/restore-scans-from-storage.mjs --email=doddsy2005@gmail.com
 *   node scripts/restore-scans-from-storage.mjs --user-id=84488cd5-d1ed-4107-9aba-5698625c708d
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function loadDotEnv() {
  try {
    const text = await fs.readFile(path.join(repoRoot, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* optional */
  }
}
await loadDotEnv();

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const userIdArg = process.argv.find((a) => a.startsWith("--user-id="))?.slice("--user-id=".length);

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let userId = userIdArg;
if (!userId && emailArg) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === emailArg.toLowerCase());
  if (!user) {
    console.error(`No auth user for ${emailArg}`);
    process.exit(1);
  }
  userId = user.id;
}
if (!userId) {
  console.error("Pass --email=... or --user-id=...");
  process.exit(1);
}

const projectHost = new URL(url).host;
const prefix = `${userId}/`;

const { data: objects, error: listErr } = await admin.storage.from("scans").list(userId, { limit: 500 });
if (listErr) throw listErr;

const files = (objects ?? []).filter((o) => o.name && !o.name.endsWith("/"));
console.log(`Found ${files.length} storage file(s) under scans/${prefix}`);

const { data: existing, error: scanErr } = await admin
  .from("scans")
  .select("photo_url")
  .eq("user_id", userId);
if (scanErr) throw scanErr;

const existingUrls = new Set((existing ?? []).map((r) => r.photo_url));
const username = emailArg?.split("@")[0]?.slice(0, 24) ?? `user${userId.slice(0, 8)}`;

await admin.from("users").upsert({
  id: userId,
  username: username.length >= 3 ? username : "spotter",
  total_scans: files.length,
});

let inserted = 0;
for (const file of files) {
  const objectPath = `${prefix}${file.name}`;
  const photoUrl = `https://${projectHost}/storage/v1/object/public/scans/${objectPath}`;
  if ([...existingUrls].some((u) => u?.includes(file.name))) continue;

  const createdAt = file.created_at ?? file.updated_at ?? new Date().toISOString();
  const { error } = await admin.from("scans").insert({
    user_id: userId,
    breed_id: null,
    photo_url: photoUrl,
    scanned_at: createdAt,
    is_pending_breed: true,
    points_awarded: 0,
    matched_featured_breed: false,
    is_private: false,
  });
  if (error) {
    console.warn(`  skip ${file.name}:`, error.message);
    continue;
  }
  inserted++;
  existingUrls.add(photoUrl);
}

await admin.from("users").update({ total_scans: (existing?.length ?? 0) + inserted }).eq("id", userId);

console.log(`Restored ${inserted} scan row(s) for ${userId}.`);
console.log("Breeds were not in storage metadata — user must retag pending scans in the app.");
