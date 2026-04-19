import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { commonBreedCrops, COMMON_SPRITE_SIZE } from "@/constants/commonSpriteCrops";
import { getHexSpriteTweak } from "@/constants/hexSpriteTweaks";
import { rareLegendaryBreedCrops, RARE_LEGENDARY_SPRITE_SIZE } from "@/constants/rareLegendarySpriteCrops";
import { uncommonBreedCrops, UNCOMMON_SPRITE_SIZE } from "@/constants/uncommonSpriteCrops";
import { getBreedLineArt, getLineArtSheetSize } from "@/lib/breedLineArtSprite";
import { layoutSpriteInViewport } from "@/lib/spriteViewportLayout";

const commonSprite = require("../../assets/common-dogs.png");
const uncommonSprite = require("../../assets/uncommon-dogs.png");
const rareLegendarySprite = require("../../assets/rare-legendary-dogs.png");

/** Viewport for list thumbs (breed picker); slightly larger than hex tiles so dogs read clearly. */
const DOG_VIEWPORT_W = 68;
const DOG_VIEWPORT_H = 54;
const BASELINE_INSET = 7;

const iconPool: Array<keyof typeof MaterialCommunityIcons.glyphMap> = [
  "dog-side",
  "dog-service",
  "dog",
  "paw",
  "bone",
  "dog-side-off",
];

function iconForBreed(breedId: string) {
  const hash = breedId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconPool[hash % iconPool.length];
}

/**
 * Small square preview for lists (e.g. breed picker). Uses bundled sprite sheets, not remote URLs.
 */
export function BreedSpriteThumb({ breedId }: { breedId: string }) {
  const tweak = getHexSpriteTweak(breedId);
  const lineArtEntry = getBreedLineArt(breedId);
  const commonCrop = commonBreedCrops[breedId];
  const uncommonCrop = uncommonBreedCrops[breedId];
  const rareLegendaryCrop = rareLegendaryBreedCrops[breedId];

  const lineArtLayout =
    lineArtEntry != null
      ? layoutSpriteInViewport(
          lineArtEntry.crop,
          tweak,
          getLineArtSheetSize(lineArtEntry),
          DOG_VIEWPORT_W,
          DOG_VIEWPORT_H,
          BASELINE_INSET,
        )
      : null;
  const commonLayout =
    commonCrop != null
      ? layoutSpriteInViewport(commonCrop, tweak, COMMON_SPRITE_SIZE, DOG_VIEWPORT_W, DOG_VIEWPORT_H, BASELINE_INSET)
      : null;
  const uncommonLayout =
    uncommonCrop != null
      ? layoutSpriteInViewport(uncommonCrop, tweak, UNCOMMON_SPRITE_SIZE, DOG_VIEWPORT_W, DOG_VIEWPORT_H, BASELINE_INSET)
      : null;
  const rareLegendaryLayout =
    rareLegendaryCrop != null
      ? layoutSpriteInViewport(rareLegendaryCrop, tweak, RARE_LEGENDARY_SPRITE_SIZE, DOG_VIEWPORT_W, DOG_VIEWPORT_H, BASELINE_INSET)
      : null;

  return (
    <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
      <View
        pointerEvents="none"
        style={{
          width: DOG_VIEWPORT_W,
          height: DOG_VIEWPORT_H,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        {lineArtLayout && lineArtEntry ? (
          <Image
            source={lineArtEntry.source}
            style={{
              position: "absolute",
              width: lineArtLayout.spriteWidth,
              height: lineArtLayout.spriteHeight,
              left: lineArtLayout.left,
              top: lineArtLayout.top,
            }}
          />
        ) : commonLayout ? (
          <Image
            source={commonSprite}
            style={{
              position: "absolute",
              width: commonLayout.spriteWidth,
              height: commonLayout.spriteHeight,
              left: commonLayout.left,
              top: commonLayout.top,
            }}
          />
        ) : uncommonLayout ? (
          <Image
            source={uncommonSprite}
            style={{
              position: "absolute",
              width: uncommonLayout.spriteWidth,
              height: uncommonLayout.spriteHeight,
              left: uncommonLayout.left,
              top: uncommonLayout.top,
            }}
          />
        ) : rareLegendaryLayout ? (
          <Image
            source={rareLegendarySprite}
            style={{
              position: "absolute",
              width: rareLegendaryLayout.spriteWidth,
              height: rareLegendaryLayout.spriteHeight,
              left: rareLegendaryLayout.left,
              top: rareLegendaryLayout.top,
            }}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <MaterialCommunityIcons name={iconForBreed(breedId)} size={34} color="#52525b" />
          </View>
        )}
      </View>
    </View>
  );
}
