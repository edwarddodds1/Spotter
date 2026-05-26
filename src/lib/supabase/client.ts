import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import type { Database } from "@/lib/supabase/types";

type SupabaseExtra = { supabaseUrl?: string; supabaseKey?: string; releaseSha?: string };

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

const extra = Constants.expoConfig?.extra as SupabaseExtra | undefined;

/** Prefer `extra` on web static builds — it holds Supabase_URL / Supabase_Publishable_Key from app.config.js at build time. */
const supabaseUrl = trimEnv(
  extra?.supabaseUrl ??
    process.env.Supabase_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL,
);
const supabaseKey = trimEnv(
  extra?.supabaseKey ??
    process.env.Supabase_Publishable_Key ??
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY,
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** Same URL the client uses (includes Supabase_URL from Vercel via `extra`). */
export function getResolvedSupabaseProjectUrl(): string | undefined {
  return supabaseUrl;
}

/** Build identifier (Vercel commit SHA when available) — used for error reporting / release tagging. */
export function getReleaseSha(): string | undefined {
  return trimEnv(extra?.releaseSha);
}

const isWeb = Platform.OS === "web";

/** Native localStorage on web — more reliable for Supabase session than RN AsyncStorage on some static exports. */
const webAuthStorage = {
  getItem: (key: string) => {
    try {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        return Promise.resolve(globalThis.localStorage.getItem(key));
      }
    } catch {
      /* Private mode / embedded browsers may block storage — session stays in memory for that tab. */
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        globalThis.localStorage.setItem(key, value);
      }
    } catch {
      /* Same as getItem — avoid crashing auth; persistence may fail until storage works. */
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    try {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        globalThis.localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },
};

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

  hints.push(
    "Vercel: Environment Variables — set Supabase_URL and Supabase_Publishable_Key (or EXPO_PUBLIC_* / SUPABASE_* aliases) for Production, then redeploy.",
  );

  return hints.join(" ");
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseKey ?? "sb_publishable_placeholder",
  {
    auth: {
      storage: isWeb ? webAuthStorage : AsyncStorage,
      /** PKCE is the recommended SPA flow; works with email/password and OAuth return URLs. */
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      /** Web OAuth returns to this origin with hash/query; native uses deep links instead. */
      detectSessionInUrl: isWeb,
    },
  },
);
