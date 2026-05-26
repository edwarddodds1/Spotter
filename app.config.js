/**
 * Single Expo config entrypoint. Spreads `app.json` so plugins/settings stay in one place.
 * Puts Supabase URL + key into `extra` at build time (required for names that are not EXPO_PUBLIC_*,
 * since those are the only vars Metro inlines into the static web bundle).
 *
 * Primary names (Vercel): Supabase_URL, Supabase_Publishable_Key
 *
 * Production builds (Vercel `VERCEL_ENV=production`, or any local build with
 * `EXPO_PUBLIC_FAIL_ON_MISSING_ENV=true`) hard-fail if the Supabase env vars
 * are missing so we never ship a deploy that boots into a non-functional placeholder client.
 */
const appJson = require("./app.json");

const supabaseUrl =
  process.env.Supabase_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.Supabase_Publishable_Key ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

const isProductionBuild =
  process.env.VERCEL_ENV === "production" ||
  process.env.EXPO_PUBLIC_FAIL_ON_MISSING_ENV === "true";

if (isProductionBuild && (!supabaseUrl || !supabaseKey)) {
  throw new Error(
    "[app.config.js] Supabase env vars missing for production build.\n" +
      "Set Supabase_URL and Supabase_Publishable_Key (or the EXPO_PUBLIC_* / SUPABASE_* aliases) " +
      "in Vercel → Project Settings → Environment Variables for the Production environment, then redeploy.",
  );
}

const releaseSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.EXPO_PUBLIC_RELEASE_SHA ||
  "";

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      supabaseUrl,
      supabaseKey,
      releaseSha,
    },
  },
};
