import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthResult =
  | { type: "redirect" }
  | Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;

/**
 * Native: in-app browser + `spotter://` redirect.
 * Web (e.g. Vercel): full-page redirect back to this origin — custom schemes make browsers try to "download" or open nothing useful.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      throw new Error("Google sign-in is only available in a browser.");
    }
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      throw error;
    }
    if (!data?.url) {
      throw new Error("Google sign-in URL was not returned by Supabase.");
    }
    window.location.assign(data.url);
    return { type: "redirect" };
  }

  const redirectTo = AuthSession.makeRedirectUri({ scheme: "spotter" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Google sign-in URL was not returned by Supabase.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success" && result.url) {
    const url = new URL(result.url);
    const accessToken = url.hash.match(/access_token=([^&]+)/)?.[1];
    const refreshToken = url.hash.match(/refresh_token=([^&]+)/)?.[1];

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
  }

  return result;
}
