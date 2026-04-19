import type { CoatColourOption } from "@/types/app";

export const COAT_OTHER_ID = "other";

function col(
  id: string,
  label: string,
  hex: string,
  extras?: Pick<CoatColourOption, "secondaryHex" | "pattern">,
): CoatColourOption {
  return { id, label, hex, ...extras };
}

const BLACK = col("black", "Black", "#1c1917");
const WHITE = col("white", "White", "#fafafa");
const CREAM = col("cream", "Cream", "#f5f0e1");
const GOLDEN = col("golden", "Golden", "#daa520");
const CHOCOLATE = col("chocolate", "Chocolate", "#4a3025");
const YELLOW = col("yellow", "Yellow", "#e8c547");
const GREY = col("grey", "Grey", "#78716c");
const RED = col("red", "Red", "#b91c1c");
const BLUE_GREY = col("blue-grey", "Blue-grey", "#64748b");
const FAWN = col("fawn", "Fawn", "#d4a574");
const BRINDLE = col("brindle", "Brindle", "#6b5344");
const TAN = col("tan", "Tan", "#c19a6b");
const SILVER = col("silver", "Silver", "#c0c0c0");
const APRICOT = col("apricot", "Apricot", "#f0c4a0");
const RED_GOLD = col("red-gold", "Dark gold", "#b45309");
const FAWN_PUG = col("fawn-pug", "Fawn", "#e8cfa5");
const BLACK_TAN = col("black-tan", "Black & tan", "#292524", { secondaryHex: "#c19a6b", pattern: "split" });
const SABLE = col("sable", "Sable", "#8b7355");
const MERLE = col("merle", "Merle", "#94a3b8");
const SALT_PEPPER = col("salt-pepper", "Salt & pepper", "#a8a29e");
const RED_WHITE = col("red-white", "Red & white", "#b45309", { secondaryHex: "#fafafa", pattern: "split" });
const TRI = col("tri", "Tri-colour", "#422006", { secondaryHex: "#fef3c7", pattern: "spots" });
const BLUE_MERLE = col("blue-merle", "Blue merle", "#7c8cae", { secondaryHex: "#e5e7eb", pattern: "spots" });
const RED_MERLE = col("red-merle", "Red merle", "#c4a484", { secondaryHex: "#f5f5f4", pattern: "spots" });
const WHEATEN = col("wheaten", "Wheaten", "#d4b896");
const LIVER = col("liver", "Liver", "#5c3d2e");
const BROWN = col("brown", "Brown", "#5c4033");
const RED_SESAME = col("red-sesame", "Red sesame", "#b45309");
const BLACK_TAN_SHIBA = col("black-tan-shiba", "Black & tan", "#1c1917", { secondaryHex: "#c19a6b", pattern: "split" });
const CREAM_SHIBA = col("cream-shiba", "Cream", "#fef3c7");
const FAWN_BOXER = col("fawn-boxer", "Fawn", "#d4a574");
const HARLEQUIN = col("harlequin", "Harlequin", "#fafafa", { secondaryHex: "#1f2937", pattern: "spots" });
const MANTLE = col("mantle", "Mantle", "#0a0a0a", { secondaryHex: "#f5f5f4", pattern: "split" });
const WEIMARAN_SILVER = col("weimaraner-grey", "Silver grey", "#9ca3af");
const DOBER_BLACK = col("dober-black", "Black & rust", "#171717");
const BLENHEIM = col("blenheim", "Blenheim", "#c4a574");
const RUBY = col("ruby", "Ruby", "#9f1239");
const LEMON_WHITE = col("lemon-white", "Lemon & white", "#fef9c3", { secondaryHex: "#fafafa", pattern: "split" });
const DAPPLE = col("dapple", "Dapple", "#9ca3af");
const ORANGE = col("orange", "Orange", "#ea580c");
const BLUE_GOLD = col("blue-gold", "Steel & gold", "#475569", { secondaryHex: "#d4a373", pattern: "split" });
const BLACK_WHITE = col("black-white", "Black & white", "#111827", { secondaryHex: "#fafafa", pattern: "split" });
const LIVER_ROAN = col("liver-roan", "Liver roan", "#7c5a46", { secondaryHex: "#ede9e7", pattern: "spots" });
const LEMON_SPOT = col("lemon-spot", "Lemon spots", "#fafafa", { secondaryHex: "#fef08a", pattern: "spots" });

export const COAT_COLOUR_OTHER = col(COAT_OTHER_ID, "Other", "#d4d4d8");

const DEFAULT_BREED_COLOURS: CoatColourOption[] = [BLACK, WHITE, BROWN, TAN, GREY];

const BY_BREED: Record<string, CoatColourOption[]> = {
  cavoodle: [APRICOT, CREAM, RED_GOLD, BLACK, CHOCOLATE, WHITE],
  "labrador-retriever": [BLACK, YELLOW, CHOCOLATE],
  "golden-retriever": [GOLDEN, CREAM, RED_GOLD],
  "french-bulldog": [BRINDLE, FAWN, WHITE, CREAM, BLACK],
  "german-shepherd": [BLACK_TAN, SABLE, BLACK],
  "border-collie": [BLACK_WHITE, MERLE, SABLE, TRI],
  "staffordshire-bull-terrier": [BRINDLE, RED, WHITE, BLACK, BLUE_GREY],
  groodle: [APRICOT, CREAM, CHOCOLATE, BLACK, RED_GOLD],
  "miniature-dachshund": [BLACK_TAN, CHOCOLATE, RED, CREAM, DAPPLE],
  "cavalier-king-charles-spaniel": [BLENHEIM, TRI, BLACK_TAN, RUBY],
  labradoodle: [APRICOT, CREAM, CHOCOLATE, BLACK, RED_GOLD],
  "poodle-miniature": [BLACK, WHITE, APRICOT, CHOCOLATE, GREY, RED],
  maltese: [WHITE, CREAM],
  "jack-russell-terrier": [WHITE, TRI, BLACK_TAN, RED_WHITE],
  "shih-tzu": [BLACK, WHITE, GOLDEN, BRINDLE, GREY],
  "cocker-spaniel": [BLACK, GOLDEN, CHOCOLATE, RED, BLUE_GREY],
  beagle: [TRI, RED_WHITE, LEMON_WHITE],
  "miniature-schnauzer": [SALT_PEPPER, BLACK, WHITE],
  spoodle: [APRICOT, CREAM, CHOCOLATE, BLACK, RED_GOLD],
  "australian-shepherd": [BLUE_MERLE, RED_MERLE, BLACK, RED, TRI],
  pug: [FAWN_PUG, BLACK, SILVER],
  chihuahua: [FAWN, BLACK, WHITE, CHOCOLATE, CREAM],
  "bichon-frise": [WHITE, CREAM, APRICOT],
  boxer: [FAWN_BOXER, BRINDLE, WHITE],
  rottweiler: [BLACK_TAN],
  "siberian-husky": [GREY, WHITE, BLACK, RED_WHITE, SABLE],
  whippet: [FAWN, BRINDLE, BLACK, WHITE, BLUE_GREY],
  "west-highland-white-terrier": [WHITE, CREAM],
  "australian-cattle-dog": [BLUE_MERLE, RED_MERLE, BLACK],
  kelpie: [BLACK, CHOCOLATE, RED, BLUE_GREY],
  dalmatian: [WHITE, BLACK, LIVER, LEMON_SPOT],
  "shiba-inu": [RED_SESAME, BLACK_TAN_SHIBA, CREAM_SHIBA],
  pomeranian: [ORANGE, BLACK, WHITE, CREAM, MERLE],
  "yorkshire-terrier": [BLACK_TAN, BLUE_GOLD],
  "bull-terrier": [WHITE, BRINDLE, RED, BLACK_TAN],
  "bernese-mountain-dog": [TRI],
  "rhodesian-ridgeback": [WHEATEN, RED],
  weimaraner: [WEIMARAN_SILVER, CHOCOLATE],
  dobermann: [DOBER_BLACK, RED, BLUE_GREY, FAWN],
  "great-dane": [HARLEQUIN, MANTLE, FAWN, BRINDLE, BLACK],
  "german-shorthaired-pointer": [LIVER_ROAN, LIVER, BLACK_WHITE],
  samoyed: [WHITE, CREAM],
  "pembroke-welsh-corgi": [RED, SABLE, BLACK_TAN, MERLE],
  greyhound: [BRINDLE, BLACK, WHITE, BLUE_GREY, FAWN],
  "basset-hound": [TRI, RED_WHITE, LEMON_WHITE],
  vizsla: [GOLDEN, RED_GOLD],
  "cane-corso": [BLACK, GREY, FAWN, BRINDLE],
  "irish-wolfhound": [GREY, BRINDLE, BLACK, WHITE, RED_GOLD],
  "chow-chow": [RED, BLACK, BLUE_GREY, CREAM],
  xoloitzcuintli: [BLACK, GREY, RED, FAWN],
};

export function getCommonColoursForBreed(breedId: string | null | undefined): CoatColourOption[] {
  const base =
    breedId && BY_BREED[breedId] && BY_BREED[breedId].length > 0 ? BY_BREED[breedId] : DEFAULT_BREED_COLOURS;
  return [...base, COAT_COLOUR_OTHER];
}
