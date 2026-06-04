#!/usr/bin/env node
/**
 * One-shot script: bakes the canonical Wikipedia reference photo URLs into
 * `src/constants/breeds.ts` so that demo-mode users (and the brief window
 * before `refreshBreedsFromRemote` resolves post-sign-in) see breed photos
 * instead of an empty hero / 404 from the public `breed-reference` bucket.
 *
 * Source of truth: `public.breeds.reference_photo_url` in Supabase.
 *
 * Idempotent: only rewrites lines that say `referencePhotoUrl: null,`.
 *
 * Usage: `node scripts/apply-breed-thumbnails-to-catalog.mjs`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const URLS = {
  cavoodle:
    "https://upload.wikimedia.org/wikipedia/commons/3/33/F1_Red_Toy_Cavoodle_Puppy.jpg",
  "labrador-retriever":
    "https://upload.wikimedia.org/wikipedia/commons/3/34/Labrador_on_Quantock_%282175262184%29.jpg",
  "golden-retriever":
    "https://upload.wikimedia.org/wikipedia/commons/b/bd/Golden_Retriever_Dukedestiny01_drvd.jpg",
  "french-bulldog":
    "https://upload.wikimedia.org/wikipedia/commons/1/18/2008-07-28_Dog_at_Frolick_Field.jpg",
  "german-shepherd":
    "https://upload.wikimedia.org/wikipedia/commons/d/d0/German_Shepherd_-_DSC_0346_%2810096362833%29.jpg",
  "border-collie":
    "https://upload.wikimedia.org/wikipedia/commons/e/e4/Border_Collie_600.jpg",
  "staffordshire-bull-terrier":
    "https://upload.wikimedia.org/wikipedia/commons/d/de/%D7%A1%D7%90%D7%98%D7%A3_%D7%90%D7%A0%D7%92%D7%9C%D7%99.jpg",
  groodle:
    "https://upload.wikimedia.org/wikipedia/commons/f/f2/Golden_Doodle_Standing_%28HD%29.jpg",
  "miniature-dachshund":
    "https://upload.wikimedia.org/wikipedia/commons/b/be/%EB%8B%A5%EC%8A%A4%ED%9B%88%ED%8A%B8%28%EB%8B%A8%EB%AA%A8%EC%A2%85%29_%28Dachshund_%28Short%29%29.jpg",
  "cavalier-king-charles-spaniel":
    "https://upload.wikimedia.org/wikipedia/commons/5/5f/CarterBIS.Tiki.13.6.09.jpg",
  labradoodle:
    "https://upload.wikimedia.org/wikipedia/commons/8/85/Labradoodle-Brown-Male-SideFace.jpg",
  "poodle-miniature":
    "https://upload.wikimedia.org/wikipedia/commons/f/f8/Full_attention_%288067543690%29.jpg",
  maltese:
    "https://upload.wikimedia.org/wikipedia/commons/9/94/Maltese_600.jpg",
  "jack-russell-terrier":
    "https://upload.wikimedia.org/wikipedia/commons/f/f1/Jack_Russell_Terrier_1.jpg",
  "shih-tzu":
    "https://upload.wikimedia.org/wikipedia/commons/d/df/Shihtzu_%28cropped%29.jpg",
  "cocker-spaniel":
    "https://upload.wikimedia.org/wikipedia/commons/2/28/Gessa_d%27Aran_Copo_de_Nieve-_arancio_roano-_prop.Kalesa.jpg",
  beagle: "https://upload.wikimedia.org/wikipedia/commons/5/55/Beagle_600.jpg",
  "miniature-schnauzer":
    "https://upload.wikimedia.org/wikipedia/commons/3/30/Miniature_Schnauzer_salt_%26_pepper_%28cropped%29.jpg",
  spoodle:
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Cockapoo_apricot_standing.jpg",
  "australian-shepherd":
    "https://upload.wikimedia.org/wikipedia/commons/8/80/Australian_Shepherd_red_bi.JPG",
  pug: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Mops-duke-mopszucht-vom-maegdebrunnen.jpg",
  chihuahua:
    "https://upload.wikimedia.org/wikipedia/commons/4/4c/Chihuahua1_bvdb.jpg",
  "bichon-frise":
    "https://upload.wikimedia.org/wikipedia/commons/9/93/Bichon_Fris%C3%A9_-_studdogbichon.jpg",
  boxer:
    "https://upload.wikimedia.org/wikipedia/commons/6/6f/Male_fawn_Boxer_undocked.jpg",
  rottweiler:
    "https://upload.wikimedia.org/wikipedia/commons/2/26/Rottweiler_standing_facing_left.jpg",
  "siberian-husky":
    "https://upload.wikimedia.org/wikipedia/commons/8/8b/Husky_L.jpg",
  whippet:
    "https://upload.wikimedia.org/wikipedia/commons/7/76/Whippet_2018_6.jpg",
  "west-highland-white-terrier":
    "https://upload.wikimedia.org/wikipedia/commons/2/2c/West_Highland_White_Terrier_Krakow.jpg",
  "australian-cattle-dog":
    "https://upload.wikimedia.org/wikipedia/commons/c/cc/ACD-blue-spud.jpg",
  kelpie:
    "https://upload.wikimedia.org/wikipedia/commons/8/8a/Black_and_tan_Kelpie_portrait.jpg",
  dalmatian:
    "https://upload.wikimedia.org/wikipedia/commons/6/68/Sun_Dog_Dalmatian.jpg",
  "shiba-inu":
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Taka_Shiba.jpg",
  pomeranian:
    "https://upload.wikimedia.org/wikipedia/commons/c/ca/Pomeranian.JPG",
  "yorkshire-terrier":
    "https://upload.wikimedia.org/wikipedia/commons/4/41/%282_version%29_Grupp_3%2C_YORKSHIRETERRIER%2C_NO_UCH_SE_UCH_Oxzar_Amazing_Bel%E2%80%99s_Toffy_%2824310212305%29.jpg",
  "bull-terrier":
    "https://upload.wikimedia.org/wikipedia/commons/4/4c/Bullterrier-3453301920.jpg",
  "bernese-mountain-dog":
    "https://upload.wikimedia.org/wikipedia/commons/c/cc/3-BerneseMountainDogInGrass.jpg",
  "rhodesian-ridgeback":
    "https://upload.wikimedia.org/wikipedia/commons/0/01/Rhodesian_ridgeback.jpg",
  weimaraner:
    "https://upload.wikimedia.org/wikipedia/commons/5/59/Weimaraner_Freika-2.jpg",
  dobermann:
    "https://upload.wikimedia.org/wikipedia/commons/a/ac/Dobermann_handling.jpg",
  "great-dane":
    "https://upload.wikimedia.org/wikipedia/commons/e/e0/Dog_niemiecki_%C5%BC%C3%B3%C5%82ty_LM980.jpg",
  "german-shorthaired-pointer":
    "https://upload.wikimedia.org/wikipedia/commons/3/38/Duitse_staande_korthaar_10-10-2.jpg",
  samoyed:
    "https://upload.wikimedia.org/wikipedia/commons/1/18/Samojed00.jpg",
  "pembroke-welsh-corgi":
    "https://upload.wikimedia.org/wikipedia/commons/9/99/Welsh_Pembroke_Corgi.jpg",
  greyhound:
    "https://upload.wikimedia.org/wikipedia/commons/e/ef/GraceTheGreyhound.jpg",
  "basset-hound":
    "https://upload.wikimedia.org/wikipedia/commons/c/cf/BassetHound_profil.jpg",
  vizsla:
    "https://upload.wikimedia.org/wikipedia/commons/2/2d/Wy%C5%BCe%C5%82_w%C4%99gierski_g%C5%82adkow%C5%82osy_500.jpg",
  "cane-corso":
    "https://upload.wikimedia.org/wikipedia/commons/0/03/Cane_corso_temi_1_1024x768x24_%28cropped%29.png",
  "irish-wolfhound":
    "https://upload.wikimedia.org/wikipedia/commons/d/da/%282%29_Irish_Wolfhound_4.jpg",
  "chow-chow":
    "https://upload.wikimedia.org/wikipedia/commons/0/0e/Chow-chow_in_Tallinn.JPG",
  xoloitzcuintli:
    "https://upload.wikimedia.org/wikipedia/commons/b/bb/BIR_Grupp_5-_MEXIKANSK_NAKENHUND%2C_Lokal_Hero%E2%80%99s_King_Og_Hart%E2%80%99s_Istas_%2823607403303%29.jpg",
};

const filePath = resolve(process.cwd(), "src/constants/breeds.ts");
const original = readFileSync(filePath, "utf8");

let updated = original;
const updatedIds = [];
const missingIds = [];

for (const [id, url] of Object.entries(URLS)) {
  // Match a breed block opening at `id: "<id>",` then any block content,
  // followed by the (still-null) `referencePhotoUrl: null,` line.
  const blockRe = new RegExp(
    `(id:\\s*"${id.replace(/[-/\\^$*+?.()|[\\]{}]/g, "\\$&")}",[\\s\\S]*?referencePhotoUrl:\\s*)null(,)`,
    "m",
  );
  if (blockRe.test(updated)) {
    updated = updated.replace(blockRe, (_, prefix, suffix) => {
      return `${prefix}${JSON.stringify(url)}${suffix}`;
    });
    updatedIds.push(id);
  } else {
    missingIds.push(id);
  }
}

if (updated !== original) {
  writeFileSync(filePath, updated, "utf8");
  console.log(`[breeds] Updated ${updatedIds.length} breed photo URLs in src/constants/breeds.ts`);
}
if (missingIds.length > 0) {
  console.warn(
    `[breeds] Skipped ${missingIds.length} ids (already filled or block shape changed):`,
    missingIds.join(", "),
  );
}
