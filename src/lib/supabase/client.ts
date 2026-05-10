import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Database } from "@/lib/supabase/types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const isWeb = Platform.OS === "web";

/**
 * Extra context when auth requests fail with a generic network error (e.g. "Failed to fetch").
 */
export function explainAuthNetworkFailure(): string {
  const url = (supabaseUrl ?? "").trim();
  const hints: string[] = [];

  if (url && (/your-project-ref/i.test(url) || /placeholder\.supabase\.co/i.test(url))) {
    hints.push("Your EXPO_PUBLIC_SUPABASE_URL still looks like the example — use your real Project URL from Supabase → Settings → API.");
  } else if (url && !url.startsWith("https://")) {
    hints.push("Supabase Project URL should start with https://");
  }

  if (isWeb) {
    hints.push("Ad blockers and strict privacy extensions often block requests to *.supabase.co — try disabling them for this site or use another browser.");
  }

  hints.push("After changing .env, restart Expo (npm run web). On Vercel, set env vars and redeploy — EXPO_PUBLIC_* is baked in at build time.");

  return hints.join(" ");
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseKey ?? "sb_publishable_placeholder",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      /** Web OAuth returns to this origin with hash/query; native uses deep links instead. */
      detectSessionInUrl: isWeb,
    },
  },
);
