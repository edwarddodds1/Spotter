import { Platform } from "react-native";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimTrailingSlash(trimmed);
};

/**
 * Returns the redirect URL Supabase should send users back to after OAuth / email links.
 *
 * Always uses the **current browser origin** when `window` exists so Production, Preview (`*.vercel.app`),
 * and custom domains work without `EXPO_PUBLIC_SITE_URL` matching exactly.
 * (A wrong SITE_URL in Vercel was a common cause of “login works locally but not on Vercel”.)
 *
 * Add each origin you use to Supabase → Authentication → URL Configuration → Redirect URLs
 * (e.g. `https://your-app.vercel.app/**` or wildcard patterns your project allows).
 */
export function getWebAuthRedirectTo(pathname = "/"): string | undefined {
  if (Platform.OS !== "web") return undefined;

  if (typeof window !== "undefined") {
    const origin = trimTrailingSlash(window.location.origin);
    return new URL(pathname, `${origin}/`).toString();
  }

  const configuredBase = normalizeBaseUrl(process.env.EXPO_PUBLIC_SITE_URL ?? "");
  if (configuredBase) {
    return new URL(pathname, `${configuredBase}/`).toString();
  }

  return undefined;
}
