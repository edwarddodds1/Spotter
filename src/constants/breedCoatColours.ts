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
const FOX_RED = col("fox-red", "Fox red", "#c2410c");
const LIGHT_GOLD = col("light-gold", "Light gold", "#f5e6b8");
const DARK_GOLD = col("dark-gold", "Dark gold", "#b8860b");
const PIED = col("pied", "Pied", "#fafafa", { secondaryHex: "#1c1917", pattern: "split" });
const FRENCH_BLUE = col("french-blue", "Blue", "#475569");
const GSD_BICOLOUR = col("gsd-bicolour", "Bi-colour", "#171717", { secondaryHex: "#fafafa", pattern: "split" });
const STAFFY_BLUE = col("staffy-blue", "Blue", "#64748b");
const CARAMEL = col("caramel", "Caramel", "#c08457");
const LEMON = col("lemon", "Lemon", "#fef08a");
const WHITE_TAN_MALTESE = col("white-tan-maltese", "White & tan", "#fafafa", { secondaryHex: "#c19a6b", pattern: "split" });
const JR_WHITE_TAN = col("jr-white-tan", "White & tan", "#fafafa", { secondaryHex: "#c19a6b", pattern: "split" });
const JR_WHITE_BLACK = col("jr-white-black", "White & black", "#fafafa", { secondaryHex: "#171717", pattern: "split" });
const GOLD_WHITE_SHIH = col("gold-white-shih", "Gold & white", "#eab308", { secondaryHex: "#fafafa", pattern: "split" });
const PARTI = col("parti-colour", "Parti-colour", "#fafafa", { secondaryHex: "#171717", pattern: "spots" });
const ROAN = col("roan", "Roan", "#78716c", { secondaryHex: "#e7e5e4", pattern: "spots" });
const CHOCOLATE_TRI = col("chocolate-tri", "Chocolate tri", "#4a3025", { secondaryHex: "#fef3c7", pattern: "spots" });
const BLACK_SILVER_SCHNAUZER = col("black-silver-schnauzer", "Black & silver", "#171717", { secondaryHex: "#9ca3af", pattern: "split" });
const AUSSIE_BLACK_TRI = col("aussie-black-tri", "Black tri", "#111827", { secondaryHex: "#b91c1c", pattern: "split" });
const AUSSIE_RED_TRI = col("aussie-red-tri", "Red tri", "#991b1b", { secondaryHex: "#171717", pattern: "split" });
const SOLID_BLACK = col("solid-black", "Solid black", "#0a0a0a");
const PUG_APRICOT = col("pug-apricot", "Apricot", "#f0c4a0");
const PUG_WHITE = col("pug-white", "White", "#f5f5f5");
const CHI_BLUE = col("chi-blue", "Blue", "#94a3b8");
const BICHON_BUFF = col("bichon-buff", "White & buff", "#fafafa", { secondaryHex: "#d4a574", pattern: "split" });
const BICHON_GREY = col("bichon-grey", "White & grey", "#fafafa", { secondaryHex: "#9ca3af", pattern: "split" });
const BOXER_REVERSE_BRINDLE = col("boxer-rev-brindle", "Reverse brindle", "#292524");
const BOXER_BLACK_MASK = col("boxer-black-mask", "Black mask", "#d4a574", { secondaryHex: "#171717", pattern: "split" });
const ROTT_MAHOGANY = col("rott-mahogany", "Black & mahogany", "#171717", { secondaryHex: "#7c2d12", pattern: "split" });
const ROTT_RUST = col("rott-rust", "Black & rust", "#171717", { secondaryHex: "#b45309", pattern: "split" });
const ROTT_BROWN = col("rott-brown", "Black & brown", "#171717", { secondaryHex: "#5c4033", pattern: "split" });
const HUSKY_BW = col("husky-bw", "Black & white", "#111827", { secondaryHex: "#fafafa", pattern: "split" });
const HUSKY_GW = col("husky-gw", "Grey & white", "#64748b", { secondaryHex: "#fafafa", pattern: "split" });
const HUSKY_RW = col("husky-rw", "Red & white", "#b45309", { secondaryHex: "#fafafa", pattern: "split" });
const HUSKY_AGOUTI = col("husky-agouti", "Agouti", "#78716c");
const HUSKY_WHITE = col("husky-white", "Pure white", "#f8fafc");
const WHIPPET_BLUE = col("whippet-blue", "Blue", "#64748b");
const WHIPPET_WHITE_RED = col("whippet-white-red", "White & red", "#fafafa", { secondaryHex: "#b91c1c", pattern: "split" });
const WESTIE_CREAM = col("westie-cream", "Cream white", "#fef9e7");
const WESTIE_BRIGHT = col("westie-bright", "Bright white", "#ffffff");
const WESTIE_WHEATEN = col("westie-wheaten", "Wheaten white", "#f5f0e1");
const WESTIE_SNOW = col("westie-snow", "Snow white", "#f8fafc");
const ACD_BLUE = col("acd-blue", "Blue", "#475569");
const ACD_BLUE_MOTTLED = col("acd-blue-mottled", "Blue mottled", "#334155", { secondaryHex: "#94a3b8", pattern: "spots" });
const ACD_BLUE_SPECK = col("acd-blue-speck", "Blue speckled", "#3b4f68", { secondaryHex: "#e2e8f0", pattern: "spots" });
const ACD_RED_SPECK = col("acd-red-speck", "Red speckled", "#9f1239", { secondaryHex: "#fecdd3", pattern: "spots" });
const ACD_RED_MOTTLED = col("acd-red-mottled", "Red mottled", "#7f1d1d", { secondaryHex: "#fca5a5", pattern: "spots" });
const KELPIE_FAWN = col("kelpie-fawn", "Fawn", "#d4b896");
const KELPIE_BLACK_TAN = col("kelpie-black-tan", "Black & tan", "#171717", { secondaryHex: "#c19a6b", pattern: "split" });
const DALM_BLACK_SPOT = col("dalm-black-spot", "Black spotted", "#fafafa", { secondaryHex: "#171717", pattern: "spots" });
const DALM_LIVER_SPOT = col("dalm-liver-spot", "Liver spotted", "#fafafa", { secondaryHex: "#5c3d2e", pattern: "spots" });
const DALM_LEMON = col("dalm-lemon", "Lemon", "#fef9c3", { secondaryHex: "#ca8a04", pattern: "spots" });
const DALM_BLUE_SPOT = col("dalm-blue-spot", "Blue", "#e2e8f0", { secondaryHex: "#475569", pattern: "spots" });
const SHIBA_RED = col("shiba-red", "Red", "#dc2626");
const SHIBA_SESAME = col("shiba-sesame", "Sesame", "#a16207");
const SHIBA_RED_SESAME = col("shiba-red-sesame", "Red sesame", "#b45309");
const YORK_PARTI = col("york-parti", "Parti-colour", "#171717", { secondaryHex: "#fafafa", pattern: "split" });
const YORK_CHOC = col("york-choc", "Chocolate", "#5c3d2e");
const YORK_GOLD = col("york-gold", "Golden", "#ca8a04");
const BULL_BLACK_BRINDLE = col("bull-black-brindle", "Black brindle", "#171717", { secondaryHex: "#57534e", pattern: "split" });
const BULL_TRI = col("bull-tri", "Tri-colour", "#171717", { secondaryHex: "#b45309", pattern: "split" });
const BERNESE_BLACK_TRI = col("bernese-black-tri", "Black Tri-colour", "#171717", { secondaryHex: "#b45309", pattern: "split" });
const BERNESE_RUST_WHITE = col("bernese-rust-white", "Rust & white", "#b45309", { secondaryHex: "#fafafa", pattern: "split" });
const BERNESE_SWISS = col("bernese-swiss-marked", "Swiss marked", "#292524", { secondaryHex: "#dc2626", pattern: "split" });
const BERNESE_DEEP_RUST = col("bernese-deep-rust", "Deep rust", "#7f1d1d");
const RIDGE_RED_WHEATEN = col("ridge-red-wheaten", "Red wheaten", "#c2410c");
const RIDGE_LIGHT_WHEATEN = col("ridge-light-wheaten", "Light wheaten", "#fde68a");
const RIDGE_DARK_WHEATEN = col("ridge-dark-wheaten", "Dark wheaten", "#92400e");
const RIDGE_BRINDLE_WHEATEN = col("ridge-brindle-wheaten", "Brindle wheaten", "#78716c");
const WEIM_SILVER_GREY = col("weim-silver-grey", "Silver grey", "#a8a29e");
const WEIM_MOUSE_GREY = col("weim-mouse-grey", "Mouse grey", "#9ca3af");
const WEIM_BLUE_GREY_COAT = col("weim-blue-grey-coat", "Blue grey", "#64748b");
const WEIM_CHARCOAL = col("weim-charcoal", "Charcoal", "#374151");
const WEIM_SILVER_BLUE = col("weim-silver-blue", "Silver blue", "#94a3b8");
const DOBER_RED_RUST = col("dober-red-rust", "Red & rust", "#991b1b", { secondaryHex: "#b45309", pattern: "split" });
const DOBER_BLUE_RUST = col("dober-blue-rust", "Blue & rust", "#475569", { secondaryHex: "#b45309", pattern: "split" });
const DOBER_FAWN_RUST = col("dober-fawn-rust", "Fawn & rust", "#d4a574", { secondaryHex: "#57534e", pattern: "split" });
const DOBER_WHITE = col("dober-white", "White", "#f8fafc");
const GREAT_DANE_BLUE = col("great-dane-blue", "Blue", "#475569");
const GSP_LIVER_WHITE = col("gsp-liver-white", "Liver & white", "#5c3d2e", { secondaryHex: "#fafafa", pattern: "split" });
const GSP_SOLID_LIVER = col("gsp-solid-liver", "Solid liver", "#4a3025");
const SAMOYED_BISCUIT = col("sam-biscuit", "Biscuit", "#e8d4b8");
const SAM_WHITE_BISCUIT = col("sam-white-biscuit", "White & biscuit", "#fafafa", { secondaryHex: "#e8d4b8", pattern: "split" });
const SAM_PURE_WHITE = col("sam-pure-white", "Pure white", "#ffffff");
const CORGI_RED_WHITE = col("corgi-red-white", "Red & white", "#b45309", { secondaryHex: "#fafafa", pattern: "split" });
const GREYHOUND_BLUE_COAT = col("greyhound-blue-coat", "Blue", "#64748b");
const BASSET_MAHOGANY = col("basset-mahogany", "Mahogany", "#5c3d2e");
const VIZ_GOLDEN_RUST = col("viz-golden-rust", "Golden rust", "#d97706");
const VIZ_RUST = col("viz-rust", "Rust", "#b45309");
const VIZ_SANDY_GOLD = col("viz-sandy-gold", "Sandy gold", "#eab308");
const VIZ_COPPER = col("viz-copper", "Copper", "#c2410c");
const VIZ_DEEP_GOLD = col("viz-deep-gold", "Deep gold", "#a16207");
const CORSA_RED = col("corso-red", "Red", "#991b1b");
const CHOW_CINNAMON = col("chow-cinnamon", "Cinnamon", "#b45309");
const XOLO_SLATE = col("xolo-slate-grey", "Slate grey", "#57534e");
const XOLO_BRONZE = col("xolo-bronze", "Bronze", "#92400e");
const XOLO_SPOTTED = col("xolo-spotted", "Spotted", "#fafafa", { secondaryHex: "#292524", pattern: "spots" });

export const COAT_COLOUR_OTHER = col(COAT_OTHER_ID, "Other", "#d4d4d8");

const DEFAULT_BREED_COLOURS: CoatColourOption[] = [BLACK, WHITE, BROWN, TAN, GREY];

const BY_BREED: Record<string, CoatColourOption[]> = {
  cavoodle: [APRICOT, CREAM, RED, BLACK, TRI],
  "labrador-retriever": [BLACK, YELLOW, CHOCOLATE, FOX_RED, SILVER],
  "golden-retriever": [LIGHT_GOLD, GOLDEN, DARK_GOLD, CREAM, RED_GOLD],
  "french-bulldog": [FAWN, BRINDLE, CREAM, PIED, FRENCH_BLUE],
  "german-shepherd": [BLACK_TAN, SABLE, BLACK, WHITE, GSD_BICOLOUR],
  "border-collie": [BLACK_WHITE, MERLE, SABLE, TRI, RED_WHITE],
  "staffordshire-bull-terrier": [STAFFY_BLUE, BLACK, BRINDLE, RED, WHITE],
  groodle: [CREAM, APRICOT, GOLDEN, RED, BLACK],
  "miniature-dachshund": [BLACK_TAN, CHOCOLATE, DAPPLE, CREAM, RED],
  "cavalier-king-charles-spaniel": [BLENHEIM, TRI, RUBY, BLACK_TAN, BLACK_WHITE],
  labradoodle: [CREAM, CHOCOLATE, BLACK, APRICOT, CARAMEL],
  "poodle-miniature": [WHITE, BLACK, APRICOT, SILVER, BROWN],
  maltese: [WHITE, CREAM, LEMON, TAN, WHITE_TAN_MALTESE],
  "jack-russell-terrier": [JR_WHITE_TAN, TRI, JR_WHITE_BLACK, BROWN, TAN],
  "shih-tzu": [GOLD_WHITE_SHIH, BLACK_WHITE, LIVER, BRINDLE, GOLDEN],
  "cocker-spaniel": [GOLDEN, BLACK, CHOCOLATE, PARTI, ROAN],
  beagle: [TRI, LEMON_WHITE, RED_WHITE, CHOCOLATE_TRI, BLACK_WHITE],
  "miniature-schnauzer": [SALT_PEPPER, BLACK, BLACK_SILVER_SCHNAUZER, WHITE, PARTI],
  spoodle: [CREAM, APRICOT, BLACK, CHOCOLATE, PARTI],
  "australian-shepherd": [BLUE_MERLE, RED_MERLE, AUSSIE_BLACK_TRI, AUSSIE_RED_TRI, SOLID_BLACK],
  pug: [FAWN_PUG, BLACK, SILVER, PUG_APRICOT, PUG_WHITE],
  chihuahua: [FAWN, CHOCOLATE, BLACK, CREAM, CHI_BLUE],
  "bichon-frise": [WHITE, CREAM, APRICOT, BICHON_BUFF, BICHON_GREY],
  boxer: [FAWN_BOXER, BRINDLE, WHITE, BOXER_REVERSE_BRINDLE, BOXER_BLACK_MASK],
  rottweiler: [BLACK_TAN, ROTT_MAHOGANY, ROTT_RUST, ROTT_BROWN, DOBER_BLACK],
  "siberian-husky": [HUSKY_BW, HUSKY_GW, HUSKY_RW, HUSKY_AGOUTI, HUSKY_WHITE],
  whippet: [WHIPPET_BLUE, FAWN, BRINDLE, BLACK, WHIPPET_WHITE_RED],
  "west-highland-white-terrier": [WHITE, WESTIE_CREAM, WESTIE_BRIGHT, WESTIE_WHEATEN, WESTIE_SNOW],
  "australian-cattle-dog": [ACD_BLUE, ACD_BLUE_MOTTLED, ACD_BLUE_SPECK, ACD_RED_SPECK, ACD_RED_MOTTLED],
  kelpie: [BLACK, CHOCOLATE, RED, KELPIE_FAWN, KELPIE_BLACK_TAN],
  dalmatian: [DALM_BLACK_SPOT, DALM_LIVER_SPOT, DALM_LEMON, DALM_BLUE_SPOT, TRI],
  "shiba-inu": [SHIBA_RED, BLACK_TAN_SHIBA, CREAM_SHIBA, SHIBA_SESAME, SHIBA_RED_SESAME],
  pomeranian: [ORANGE, CREAM, BLACK, WHITE, BLUE_MERLE],
  "yorkshire-terrier": [BLUE_GOLD, BLACK_TAN, YORK_PARTI, YORK_CHOC, YORK_GOLD],
  "bull-terrier": [WHITE, BRINDLE, BULL_BLACK_BRINDLE, RED, BULL_TRI],
  "bernese-mountain-dog": [BERNESE_BLACK_TRI, BERNESE_RUST_WHITE, BLACK_TAN, BERNESE_SWISS, BERNESE_DEEP_RUST],
  "rhodesian-ridgeback": [WHEATEN, RIDGE_RED_WHEATEN, RIDGE_LIGHT_WHEATEN, RIDGE_DARK_WHEATEN, RIDGE_BRINDLE_WHEATEN],
  weimaraner: [WEIM_SILVER_GREY, WEIM_MOUSE_GREY, WEIM_BLUE_GREY_COAT, WEIM_CHARCOAL, WEIM_SILVER_BLUE],
  dobermann: [DOBER_BLACK, DOBER_RED_RUST, DOBER_BLUE_RUST, DOBER_FAWN_RUST, DOBER_WHITE],
  "great-dane": [FAWN, HARLEQUIN, GREAT_DANE_BLUE, BLACK, BRINDLE],
  "german-shorthaired-pointer": [LIVER, GSP_LIVER_WHITE, LIVER_ROAN, BLACK_WHITE, GSP_SOLID_LIVER],
  samoyed: [WHITE, CREAM, SAMOYED_BISCUIT, SAM_WHITE_BISCUIT, SAM_PURE_WHITE],
  "pembroke-welsh-corgi": [CORGI_RED_WHITE, SABLE, BLACK_TAN, FAWN, TRI],
  greyhound: [BLACK, GREYHOUND_BLUE_COAT, BRINDLE, FAWN, WHITE],
  "basset-hound": [TRI, LEMON_WHITE, RED_WHITE, BASSET_MAHOGANY, BLACK_WHITE],
  vizsla: [VIZ_GOLDEN_RUST, VIZ_RUST, VIZ_SANDY_GOLD, VIZ_COPPER, VIZ_DEEP_GOLD],
  "cane-corso": [BLACK, GREY, FAWN, BRINDLE, CORSA_RED],
  "irish-wolfhound": [GREY, BRINDLE, RED, BLACK, WHEATEN],
  "chow-chow": [RED, BLACK, BLUE_GREY, CREAM, CHOW_CINNAMON],
  xoloitzcuintli: [BLACK, XOLO_SLATE, XOLO_BRONZE, RED, XOLO_SPOTTED],
};

export function getCommonColoursForBreed(breedId: string | null | undefined): CoatColourOption[] {
  const base =
    breedId && BY_BREED[breedId] && BY_BREED[breedId].length > 0 ? BY_BREED[breedId] : DEFAULT_BREED_COLOURS;
  return [...base, COAT_COLOUR_OTHER];
}
