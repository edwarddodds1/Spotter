export type HexSpriteTweak = {
  /** Horizontal nudge in rendered pixels inside the hex viewport. */
  dx: number;
  /** Vertical nudge in rendered pixels inside the hex viewport. */
  dy: number;
  /** Multiplier for fitted sprite size (1 = unchanged). */
  scale: number;
};

const DEFAULT_TWEAK: HexSpriteTweak = { dx: 0, dy: 0, scale: 1 };

/**
 * Central per-breed tuning for DOGDEX HEX tiles only.
 * Edit these values to quickly tweak each dog's placement and size in hexes.
 */
export const hexSpriteTweaks: Record<string, HexSpriteTweak> = {
  // Common
  /** Cavoodle: nudge/zoom in `cavoodleLineArtCrop.ts` unless you need hex-only tweaks. */
  cavoodle: { dx: -2.6, dy: 20, scale: 1 },
  "labrador-retriever": { dx: 0, dy: -14, scale: 0.95 },
  "golden-retriever": { dx: 0, dy: -14, scale: 1 },
  "french-bulldog": { dx: 3, dy: -16, scale: 0.70 },
  "german-shepherd": { dx: 2, dy: -9, scale: 0.95 },
  "border-collie": { dx: -2, dy: -9, scale: 0.95 },
  "staffordshire-bull-terrier": { dx: 2, dy: -8, scale: 0.9 },
  groodle: { dx: -2, dy: 74, scale: 3 },
  "miniature-dachshund": { dx: 0, dy: 0, scale: 1 },
  /** Cavalier: crop/nudge in `cavalierLineArtCrop.ts` unless you need hex-only tweaks. */
  "cavalier-king-charles-spaniel": { dx: 0, dy:6, scale: 0.85 },
  labradoodle: { dx: -2, dy: 70, scale: 2.8 },
  "poodle-miniature": { dx: 0, dy: -2, scale: 0.82 },
  maltese: { dx: -2, dy: 5, scale: 0.8 },
  "jack-russell-terrier": { dx: 2, dy: 4, scale: 0.8 },
  "shih-tzu": { dx: -1, dy: 4, scale: 0.8 },

  // Uncommon
  "cocker-spaniel": { dx: 1.5, dy: -16, scale: 0.75 },
  beagle: { dx: 2, dy: -17, scale: 0.82 },
  "miniature-schnauzer": { dx: 3, dy: -17, scale: 0.78 },
  spoodle: { dx: 2, dy: -17.5, scale: 0.78 },
  "australian-shepherd": { dx: 2, dy: -18, scale: 0.86 },
  pug: { dx: 0, dy: -5, scale: 0.9 },
  chihuahua: { dx:1, dy: -6, scale: 0.95 },
  "bichon-frise": { dx: 3, dy: -5, scale: 0.9 },
  boxer: { dx: 5, dy: -5, scale: 0.9 },
  rottweiler: { dx: 4, dy: -5, scale: 0.9 },
  "siberian-husky": { dx: 0, dy: 4, scale: 0.92 },
  whippet: { dx: -3, dy: 3, scale: 1 },
  "west-highland-white-terrier": { dx: 2, dy: 3, scale: 0.8 },
  "australian-cattle-dog": { dx: 2, dy: 3, scale: 1 },
  kelpie: { dx: 2, dy: 3, scale: 0.9 },
  dalmatian: { dx: 0, dy: 6, scale: 0.92 },
  "shiba-inu": { dx: -3, dy: 6, scale: 0.95 },
  pomeranian: { dx: 0, dy: 6, scale: 0.78 },
  "yorkshire-terrier": { dx: 7, dy: 7, scale: 0.9 },
  "bull-terrier": { dx: 2, dy: 5, scale: 0.9 },

  // Rare + Legendary
  "bernese-mountain-dog": { dx: -4, dy: -7, scale: 0.8 },
  "rhodesian-ridgeback": { dx: -13, dy: -6, scale: 0.9 },
  weimaraner: { dx: -14, dy: -7, scale: 0.95 },
  dobermann: { dx: -8.5, dy: -5.5, scale: 0.95 },
  "great-dane": { dx: -5.1, dy: -6, scale: 0.92 },
  "german-shorthaired-pointer": { dx: 2, dy: -8, scale: 0.9 },
  samoyed: { dx: 0, dy: 1, scale: 0.9 },
  "pembroke-welsh-corgi": { dx: 0, dy: 0, scale: 0.85 },
  greyhound: { dx: 0, dy: 0, scale: 0.9 },
  "basset-hound": { dx: -2, dy: 0, scale: 1 },
  vizsla: { dx: 0, dy: 0, scale: 0.88 },
  "cane-corso": { dx: -1, dy: 0, scale: 0.88 },
  "irish-wolfhound": { dx: 0, dy: 19, scale: 1.1 },
  "chow-chow": { dx: 1, dy: 19, scale: 1.05 },
  xoloitzcuintli: { dx: 0, dy: 19, scale: 1.1 },
};

export function getHexSpriteTweak(breedId: string): HexSpriteTweak {
  return hexSpriteTweaks[breedId] ?? DEFAULT_TWEAK;
}

