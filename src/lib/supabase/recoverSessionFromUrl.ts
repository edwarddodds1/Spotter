import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";

/**
 * After Supabase email confirmation or magic link, the browser may land on:
 * - PKCE: `?code=...`
 * - Implicit: `#access_token=...&refresh_token=...`
 *
 * `getSession()` alone does not always exchange the PKCE code; this must run first on web.
 */
export async function recoverWebSessionFromUrl(): Promise<void> {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const err = searchParams.get("error");
  const errDesc = searchParams.get("error_description");
  if (err) {
    console.warn("[auth] Supabase redirect error:", err, errDesc ?? "");
    stripSensitiveQueryParams(url);
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return;
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth] exchangeCodeForSession:", error.message);
      return;
    }
    stripSensitiveQueryParams(url);
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    return;
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!hash) return;
  const hashParams = new URLSearchParams(hash);
  const access_token = hashParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      console.warn("[auth] setSession from hash:", error.message);
      return;
    }
    url.hash = "";
    window.history.replaceState({}, "", url.pathname + url.search);
  }
}

function stripSensitiveQueryParams(url: URL) {
  ["code", "error", "error_description", "error_code"].forEach((k) => url.searchParams.delete(k));
}
