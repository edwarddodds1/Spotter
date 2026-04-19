import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, View } from "react-native";

import { commonBreedCrops, COMMON_SPRITE_SIZE } from "@/constants/commonSpriteCrops";
import { getHexSpriteTweak } from "@/constants/hexSpriteTweaks";
import { rareLegendaryBreedCrops, RARE_LEGENDARY_SPRITE_SIZE } from "@/constants/rareLegendarySpriteCrops";
import { uncommonBreedCrops, UNCOMMON_SPRITE_SIZE } from "@/constants/uncommonSpriteCrops";
import { getBreedLineArt, getLineArtSheetSize } from "@/lib/breedLineArtSprite";
import { layoutSpriteInViewport, type SpriteSheetCrop } from "@/lib/spriteViewportLayout";
import type { Breed } from "@/types/app";

const commonSprite = require("../../assets/common-dogs.png");
const uncommonSprite = require("../../assets/uncommon-dogs.png");
const rareLegendarySprite = require("../../assets/rare-legendary-dogs.png");

/** Match Dogdex hex placement exactly, then scale up for profile card. */
const HEX_VP_W = 56;
const HEX_VP_H = 45;
const HEX_BASELINE_INSET = 7;
const PROFILE_ICON_SCALE = 3.7;

function layoutMiniIconSprite(
  crop: SpriteSheetCrop,
  spriteSheet: { w: number; h: number },
  tweak: { dx: number; dy: number; scale: number },
) {
  const vpW = HEX_VP_W * PROFILE_ICON_SCALE;
  const vpH = HEX_VP_H * PROFILE_ICON_SCALE;
  const baselineInset = HEX_BASELINE_INSET * PROFILE_ICON_SCALE;
  return {
    ...layoutSpriteInViewport(crop, tweak, spriteSheet, vpW, vpH, baselineInset, PROFILE_ICON_SCALE),
    vpW,
    vpH,
  };
}

const iconPool: Array<keyof typeof MaterialCommunityIcons.glyphMap> = ["dog-side", "dog-service", "dog", "paw", "bone"];

function iconForBreed(breedId: string) {
  const hash = breedId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconPool[hash % iconPool.length];
}

export function BreedMiniIcon({ breed }: { breed: Breed }) {
  const commonCrop = commonBreedCrops[breed.id];
  const uncommonCrop = uncommonBreedCrops[breed.id];
  const rareLegendaryCrop = rareLegendaryBreedCrops[breed.id];
  const tweak = getHexSpriteTweak(breed.id);
  const lineArtEntry = getBreedLineArt(breed.id);
  const lineArtLayout = lineArtEntry ? layoutMiniIconSprite(lineArtEntry.crop, getLineArtSheetSize(lineArtEntry), tweak) : null;
  const commonLayout = commonCrop ? layoutMiniIconSprite(commonCrop, COMMON_SPRITE_SIZE, tweak) : null;
  const uncommonLayout = uncommonCrop ? layoutMiniIconSprite(uncommonCrop, UNCOMMON_SPRITE_SIZE, tweak) : null;
  const rareLegendaryLayout = rareLegendaryCrop ? layoutMiniIconSprite(rareLegendaryCrop, RARE_LEGENDARY_SPRITE_SIZE, tweak) : null;
  const viewportW =
    lineArtLayout?.vpW ??
    commonLayout?.vpW ??
    uncommonLayout?.vpW ??
    rareLegendaryLayout?.vpW ??
    HEX_VP_W * PROFILE_ICON_SCALE;
  const viewportH =
    lineArtLayout?.vpH ??
    commonLayout?.vpH ??
    uncommonLayout?.vpH ??
    rareLegendaryLayout?.vpH ??
    HEX_VP_H * PROFILE_ICON_SCALE;

  return (
    <View className="h-[144px] w-[168px] items-center justify-center">
      <View style={{ width: viewportW, height: viewportH, overflow: "hidden", backgroundColor: "transparent" }}>
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
            <MaterialCommunityIcons name={iconForBreed(breed.id)} size={78} color="#374151" />
          </View>
        )}
      </View>
    </View>
  );
}

