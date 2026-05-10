/**
 * Preset traits admins can tap in the breed editor.
 * Values are stored comma-separated in `Breed.temperament` (DB column unchanged).
 */
export const BREED_CHARACTERISTIC_PRESETS: readonly string[] = [
  "Friendly",
  "Playful",
  "Social",
  "Affectionate",
  "Outgoing",
  "Eager",
  "Gentle",
  "Calm",
  "Lively",
  "Energetic",
  "Active",
  "Athletic",
  "Intelligent",
  "Trainable",
  "Alert",
  "Curious",
  "Bold",
  "Brave",
  "Confident",
  "Independent",
  "Loyal",
  "Devoted",
  "Protective",
  "Adaptable",
  "Cheerful",
  "Mischievous",
  "Stubborn",
  "Patient",
  "Quiet",
  "Reserved",
  "Tenacious",
  "Focused",
  "Courageous",
  "Steady",
  "Strong-willed",
] as const;

const presetLower = new Set(BREED_CHARACTERISTIC_PRESETS.map((s) => s.toLowerCase()));

export function isPresetCharacteristic(label: string): boolean {
  return presetLower.has(label.trim().toLowerCase());
}

export function parseCharacteristicList(raw: string): string[] {
  if (!raw.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function dedupeCharacteristics(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function serializeCharacteristicList(items: string[]): string {
  return dedupeCharacteristics(items).join(", ");
}

export function titleCaseTraitWords(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
