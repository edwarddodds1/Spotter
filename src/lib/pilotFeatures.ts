import { Platform } from "react-native";

/**
 * Pilot social flags — split so we can ship friends now and keep leagues stubbed
 * until the league/score backend is real.
 */
export const PILOT_FRIENDS_ENABLED = true;
export const PILOT_LEAGUES_ENABLED = false;

/**
 * Back-compat: any pilot code still asking "is the social stack enabled?" should
 * mean "anything social, anywhere". True if either friends or leagues are on.
 */
export const PILOT_SOCIAL_ENABLED = PILOT_FRIENDS_ENABLED || PILOT_LEAGUES_ENABLED;

export function isDemoModeAllowed(): boolean {
  if (__DEV__) return true;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return new URLSearchParams(window.location.search).get("demo") === "1";
  }
  return false;
}
