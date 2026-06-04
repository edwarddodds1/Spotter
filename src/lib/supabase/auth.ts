import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { getWebAuthRedirectTo } from "@/lib/supabase/redirect";

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
    const redirectTo = getWebAuthRedirectTo("/");
    if (!redirectTo) {
      throw new Error("Unable to build a web redirect URL for Google sign-in.");
    }
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

/**
 * Permanently delete the signed-in user's account and all their data by
 * invoking the `delete-account` edge function (service-role server-side
 * deletion). On success the local session is cleared by the caller.
 */
export async function deleteAccount(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Account deletion is unavailable right now." };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, message: "You need to be signed in to delete your account." };
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });
  if (error) {
    return { ok: false, message: error.message ?? "Account deletion failed. Please try again." };
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    return { ok: false, message: String((data as { error: unknown }).error) };
  }
  return { ok: true };
}

type AppleAuthResult =
  | { type: "redirect" }
  | Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;

/**
 * Sign in with Apple via Supabase's Apple OAuth provider. Mirrors
 * `signInWithGoogle`: a full-page redirect on web, and an in-app browser
 * session with the `spotter://` redirect on native. Required by App Store
 * guideline 4.8 because we also offer Google as a third-party login.
 */
export async function signInWithApple(): Promise<AppleAuthResult> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      throw new Error("Apple sign-in is only available in a browser.");
    }
    const redirectTo = getWebAuthRedirectTo("/");
    if (!redirectTo) {
      throw new Error("Unable to build a web redirect URL for Apple sign-in.");
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo },
    });
    if (error) {
      throw error;
    }
    if (!data?.url) {
      throw new Error("Apple sign-in URL was not returned by Supabase.");
    }
    window.location.assign(data.url);
    return { type: "redirect" };
  }

  const redirectTo = AuthSession.makeRedirectUri({ scheme: "spotter" });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Apple sign-in URL was not returned by Supabase.");
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
