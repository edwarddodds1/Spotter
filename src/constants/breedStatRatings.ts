/** Curated 1–5 star ratings for breed profile (expand over time). */
export type BreedStatRatings = {
  intelligence: number;
  energy: number;
  trainability: number;
  shedding: number;
  kidFriendly: number;
};

const RATINGS: Partial<Record<string, BreedStatRatings>> = {
  cavoodle: { intelligence: 4, energy: 3, trainability: 4, shedding: 2, kidFriendly: 5 },
  "labrador-retriever": { intelligence: 5, energy: 5, trainability: 5, shedding: 4, kidFriendly: 5 },
  "golden-retriever": { intelligence: 5, energy: 4, trainability: 5, shedding: 4, kidFriendly: 5 },
  "french-bulldog": { intelligence: 3, energy: 2, trainability: 3, shedding: 3, kidFriendly: 4 },
  "german-shepherd": { intelligence: 5, energy: 5, trainability: 5, shedding: 5, kidFriendly: 4 },
  "border-collie": { intelligence: 5, energy: 5, trainability: 5, shedding: 3, kidFriendly: 4 },
  "staffordshire-bull-terrier": { intelligence: 4, energy: 4, trainability: 4, shedding: 2, kidFriendly: 5 },
  groodle: { intelligence: 5, energy: 4, trainability: 5, shedding: 2, kidFriendly: 5 },
  "miniature-dachshund": { intelligence: 3, energy: 3, trainability: 3, shedding: 2, kidFriendly: 4 },
  "cavalier-king-charles-spaniel": { intelligence: 4, energy: 3, trainability: 4, shedding: 3, kidFriendly: 5 },
  labradoodle: { intelligence: 5, energy: 4, trainability: 5, shedding: 2, kidFriendly: 5 },
  "poodle-miniature": { intelligence: 5, energy: 4, trainability: 5, shedding: 1, kidFriendly: 4 },
  maltese: { intelligence: 4, energy: 3, trainability: 4, shedding: 1, kidFriendly: 4 },
  "jack-russell-terrier": { intelligence: 4, energy: 5, trainability: 4, shedding: 3, kidFriendly: 4 },
  "shih-tzu": { intelligence: 3, energy: 2, trainability: 3, shedding: 2, kidFriendly: 5 },
  "cocker-spaniel": { intelligence: 4, energy: 4, trainability: 4, shedding: 3, kidFriendly: 5 },
  beagle: { intelligence: 3, energy: 4, trainability: 3, shedding: 3, kidFriendly: 5 },
  "miniature-schnauzer": { intelligence: 4, energy: 4, trainability: 4, shedding: 1, kidFriendly: 4 },
  spoodle: { intelligence: 4, energy: 4, trainability: 5, shedding: 2, kidFriendly: 5 },
  "australian-shepherd": { intelligence: 5, energy: 5, trainability: 5, shedding: 3, kidFriendly: 4 },
  pug: { intelligence: 3, energy: 2, trainability: 3, shedding: 4, kidFriendly: 5 },
  chihuahua: { intelligence: 3, energy: 3, trainability: 3, shedding: 2, kidFriendly: 3 },
  "bichon-frise": { intelligence: 4, energy: 3, trainability: 4, shedding: 1, kidFriendly: 5 },
  boxer: { intelligence: 4, energy: 5, trainability: 4, shedding: 2, kidFriendly: 5 },
  rottweiler: { intelligence: 5, energy: 4, trainability: 5, shedding: 3, kidFriendly: 4 },
  "siberian-husky": { intelligence: 4, energy: 5, trainability: 3, shedding: 5, kidFriendly: 5 },
  whippet: { intelligence: 3, energy: 4, trainability: 3, shedding: 1, kidFriendly: 4 },
  "west-highland-white-terrier": { intelligence: 4, energy: 4, trainability: 4, shedding: 2, kidFriendly: 4 },
  "australian-cattle-dog": { intelligence: 5, energy: 5, trainability: 5, shedding: 3, kidFriendly: 4 },
  kelpie: { intelligence: 5, energy: 5, trainability: 5, shedding: 2, kidFriendly: 4 },
  dalmatian: { intelligence: 4, energy: 5, trainability: 4, shedding: 4, kidFriendly: 4 },
  "shiba-inu": { intelligence: 4, energy: 4, trainability: 3, shedding: 5, kidFriendly: 4 },
  pomeranian: { intelligence: 4, energy: 4, trainability: 4, shedding: 4, kidFriendly: 3 },
  "yorkshire-terrier": { intelligence: 4, energy: 4, trainability: 4, shedding: 1, kidFriendly: 3 },
  "bull-terrier": { intelligence: 3, energy: 4, trainability: 3, shedding: 2, kidFriendly: 4 },
  "bernese-mountain-dog": { intelligence: 4, energy: 3, trainability: 4, shedding: 5, kidFriendly: 5 },
  "rhodesian-ridgeback": { intelligence: 4, energy: 4, trainability: 3, shedding: 2, kidFriendly: 4 },
  weimaraner: { intelligence: 5, energy: 5, trainability: 4, shedding: 2, kidFriendly: 4 },
  dobermann: { intelligence: 5, energy: 5, trainability: 5, shedding: 2, kidFriendly: 4 },
  "great-dane": { intelligence: 4, energy: 3, trainability: 4, shedding: 3, kidFriendly: 5 },
  "german-shorthaired-pointer": { intelligence: 5, energy: 5, trainability: 5, shedding: 2, kidFriendly: 5 },
  samoyed: { intelligence: 4, energy: 5, trainability: 4, shedding: 5, kidFriendly: 5 },
  "pembroke-welsh-corgi": { intelligence: 5, energy: 4, trainability: 5, shedding: 4, kidFriendly: 5 },
  greyhound: { intelligence: 3, energy: 4, trainability: 3, shedding: 2, kidFriendly: 4 },
  "basset-hound": { intelligence: 3, energy: 2, trainability: 2, shedding: 3, kidFriendly: 5 },
  vizsla: { intelligence: 5, energy: 5, trainability: 5, shedding: 1, kidFriendly: 5 },
  "cane-corso": { intelligence: 5, energy: 4, trainability: 4, shedding: 2, kidFriendly: 4 },
  "irish-wolfhound": { intelligence: 4, energy: 3, trainability: 4, shedding: 2, kidFriendly: 5 },
  "chow-chow": { intelligence: 3, energy: 2, trainability: 2, shedding: 5, kidFriendly: 3 },
  xoloitzcuintli: { intelligence: 4, energy: 3, trainability: 4, shedding: 1, kidFriendly: 4 },
};

export function getBreedStatRatings(breedId: string): BreedStatRatings | null {
  return RATINGS[breedId] ?? null;
}
