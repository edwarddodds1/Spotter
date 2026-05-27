const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Resolves the base URL used for league invite links.
 *
 * Priority:
 * 1. `EXPO_PUBLIC_SITE_URL` env — explicit override. Set this in `.env.local`
 *    AND on Vercel (Production + Preview) to pin invite links to your public
 *    Vercel URL regardless of where the link is generated. Crucially this
 *    means invites copied while running `expo start --web` on localhost still
 *    point at the deployed site.
 * 2. Current browser origin (web) — used when no env is configured, so
 *    Vercel deploys "just work" with whatever origin the user opened.
 * 3. `spotter://` app scheme as a last resort (only works if the recipient
 *    has the app installed).
 */
function resolveInviteBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  if (configured) return trimTrailingSlash(configured);
  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return "spotter:/";
}

/** Kept for backwards compatibility; new callers should prefer {@link leagueInviteUrl}. */
export const LEAGUE_INVITE_BASE_URL = resolveInviteBaseUrl();

export function leagueInviteUrl(inviteCode: string): string {
  return `${resolveInviteBaseUrl()}/league/join/${inviteCode}`;
}

export const LEAGUE_CAPACITY_PRESETS = [5, 10, 20, 50] as const;

export type LeagueDurationPreset = "ongoing" | "1w" | "4w" | "12w" | "custom";

export function endsAtForDuration(preset: LeagueDurationPreset, customDays?: number): string | null {
  if (preset === "ongoing") return null;
  const now = new Date();
  let days = 0;
  if (preset === "1w") days = 7;
  else if (preset === "4w") days = 28;
  else if (preset === "12w") days = 84;
  else if (preset === "custom") days = Math.max(1, Math.min(365, Math.floor(customDays ?? 14)));
  now.setUTCDate(now.getUTCDate() + days);
  return now.toISOString();
}

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short invite codes (avoid ambiguous 0/O, 1/I). */
export function generateUniqueInviteCode(existingCodes: Iterable<string>): string {
  const taken = new Set(existingCodes);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    let code = "";
    for (let i = 0; i < 8; i += 1) {
      code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)]!;
    }
    if (!taken.has(code)) return code;
  }
  return `L${Date.now().toString(36).slice(-7)}`.toUpperCase();
}
