/**
 * Single Expo config entrypoint. Spreads `app.json` so plugins/settings stay in one place.
 * Puts Supabase URL + key into `extra` at build time (required for names that are not EXPO_PUBLIC_*,
 * since those are the only vars Metro inlines into the static web bundle).
 *
 * Primary names (Vercel): Supabase_URL, Supabase_Publishable_Key
 */
const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      supabaseUrl:
        process.env.Supabase_URL ||
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "",
      supabaseKey:
        process.env.Supabase_Publishable_Key ||
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        "",
    },
  },
};
