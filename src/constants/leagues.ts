/** Deep link / universal link base for league invites (configure per deployment). */
export const LEAGUE_INVITE_BASE_URL = "https://spotter.app";

export function leagueInviteUrl(inviteCode: string): string {
  return `${LEAGUE_INVITE_BASE_URL}/league/join/${inviteCode}`;
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
