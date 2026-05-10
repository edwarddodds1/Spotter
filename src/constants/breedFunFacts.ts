/** Short fun facts for breed profile (optional per breed). */
const FACTS: Partial<Record<string, string>> = {
  cavoodle: "Cavoodles are one of Australia’s most popular designer dog breeds.",
  "labrador-retriever": "Labradors are one of the most commonly used assistance and guide dogs worldwide.",
  "golden-retriever": "Golden Retrievers are famous for their soft mouths, allowing them to carry objects gently.",
  "french-bulldog": "French Bulldogs cannot swim well due to their compact body shape.",
  "german-shepherd": "German Shepherds were among the first breeds widely used as guide dogs.",
  "border-collie": "Border Collies are often considered the most intelligent dog breed in the world.",
  "staffordshire-bull-terrier":
    "Staffordshire Bull Terriers are nicknamed “nanny dogs” for their affectionate nature with children.",
  groodle: "Groodles are commonly trained as therapy and emotional support dogs.",
  "miniature-dachshund": "Their long body shape was specifically bred to help them enter tunnels.",
  "cavalier-king-charles-spaniel": "The breed was named after King Charles II, who adored spaniels.",
  labradoodle: "The Labradoodle was originally bred in Australia as a guide dog for people with allergies.",
  "poodle-miniature": "Poodles were originally bred as water retrievers.",
  maltese: "The Maltese breed dates back more than 2,000 years.",
  "jack-russell-terrier": "Jack Russells can jump up to five times their own height.",
  "shih-tzu": "The name “Shih Tzu” means “little lion” in Chinese.",
  "cocker-spaniel": "Cocker Spaniels are famous for their long silky ears and expressive eyes.",
  beagle: "A Beagle’s nose has over 200 million scent receptors.",
  "miniature-schnauzer": "Their iconic beard helped protect their face while hunting rats on farms.",
  spoodle: "Spoodles are also commonly called Cockapoos in many countries.",
  "australian-shepherd": "Despite the name, the breed was primarily developed in the United States.",
  pug: "Pugs were bred to be royal companion dogs for Chinese emperors.",
  chihuahua: "The Chihuahua is named after the Mexican state of Chihuahua.",
  "bichon-frise": "The name “Bichon Frise” means “curly lap dog” in French.",
  boxer: "Boxers often “box” with their front paws while playing.",
  rottweiler: "Rottweilers once pulled butcher carts in Germany.",
  "siberian-husky": "Huskies can tolerate extremely cold Arctic temperatures.",
  whippet: "Whippets can reach speeds over 55 km/h.",
  "west-highland-white-terrier": "Westies were bred with white coats so hunters could easily distinguish them from foxes.",
  "australian-cattle-dog":
    "An Australian Cattle Dog named Bluey holds the record for the longest-lived dog at 29 years.",
  kelpie: "Kelpies can run across the backs of sheep while herding.",
  dalmatian: "Dalmatian puppies are born completely white before their spots appear.",
  "shiba-inu": "Shiba Inus are famous online for the “Doge” meme.",
  pomeranian: "Pomeranians are descended from much larger Arctic sled dogs.",
  "yorkshire-terrier": "Despite their glamorous appearance, Yorkies were originally working dogs.",
  "bull-terrier": "Bull Terriers are often nicknamed “the clown of the dog world.”",
  "bernese-mountain-dog":
    "Bernese Mountain Dogs were originally used in Switzerland to pull milk carts and carry goods through mountain villages.",
  "rhodesian-ridgeback":
    "Rhodesian Ridgebacks are famous for the strip of hair along their back that grows in the opposite direction to the rest of their coat.",
  weimaraner:
    "Weimaraners are nicknamed the “Grey Ghost” because of their sleek silver coat and silent hunting style.",
  dobermann:
    "The Dobermann breed was created by a German tax collector who wanted the perfect protection dog to accompany him while collecting money.",
  "great-dane":
    "Despite being called the “Great Dane,” the breed actually originated in Germany, not Denmark.",
  "german-shorthaired-pointer":
    "German Shorthaired Pointers can switch between pointing, retrieving, tracking, and swimming, making them one of the most versatile hunting breeds.",
  samoyed:
    "Samoyeds have a natural “Sammy smile” that helps prevent drool from freezing in Arctic temperatures.",
  "pembroke-welsh-corgi":
    "Welsh folklore says fairies and elves once rode Corgis into battle, which is why some people call the markings on their backs “fairy saddles.”",
  greyhound:
    "Greyhounds are the second fastest land animal on Earth after the cheetah and can reach speeds around 70 km/h.",
  "basset-hound":
    "Basset Hounds have such powerful noses that only the Bloodhound is considered better at scent tracking.",
  vizsla: "Vizslas are often called “Velcro dogs” because they love staying physically close to their owners at all times.",
  "cane-corso":
    "The name “Cane Corso” comes from the Latin word cohors, meaning “guardian” or “protector.”",
  "irish-wolfhound":
    "Irish Wolfhounds were once bred to hunt wolves and even used in battles against mounted soldiers.",
  "chow-chow": "Chow Chows are one of the few dog breeds with a distinctive blue-black tongue.",
  xoloitzcuintli:
    "The Xoloitzcuintli is one of the world’s oldest dog breeds and was considered sacred by the Aztecs over 3,000 years ago.",
};

export function getBreedFunFact(breedId: string): string | null {
  const t = FACTS[breedId]?.trim();
  return t ? t : null;
}
