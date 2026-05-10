import { Platform } from "react-native";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimTrailingSlash(trimmed);
};

/**
 * Returns a stable web redirect URL for Supabase auth flows.
 * Prefers EXPO_PUBLIC_SITE_URL for production (e.g. Vercel),
 * then falls back to the current browser origin during local dev.
 */
export function getWebAuthRedirectTo(pathname = "/"): string | undefined {
  if (Platform.OS !== "web") return undefined;

  const configuredBase = normalizeBaseUrl(process.env.EXPO_PUBLIC_SITE_URL ?? "");
  if (configuredBase) {
    return new URL(pathname, `${configuredBase}/`).toString();
  }

  if (typeof window !== "undefined") {
    return new URL(pathname, window.location.origin).toString();
  }

  return undefined;
}
