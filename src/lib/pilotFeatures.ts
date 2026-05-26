import { Platform } from "react-native";

/** Pilot ships collector-first; friends/leagues UI is stubbed until v2. */
export const PILOT_SOCIAL_ENABLED = false;

export function isDemoModeAllowed(): boolean {
  if (__DEV__) return true;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("demo") === "1";
  }
  return false;
}
