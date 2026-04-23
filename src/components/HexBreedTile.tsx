import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View, type DimensionValue } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import Animated, { FadeInUp } from "react-native-reanimated";

import { commonBreedCrops, COMMON_SPRITE_SIZE } from "@/constants/commonSpriteCrops";
import { getHexSpriteTweak } from "@/constants/hexSpriteTweaks";
import { rareLegendaryBreedCrops, RARE_LEGENDARY_SPRITE_SIZE } from "@/constants/rareLegendarySpriteCrops";
import { uncommonBreedCrops, UNCOMMON_SPRITE_SIZE } from "@/constants/uncommonSpriteCrops";
import { rarityColors, rarityHexBorderColors } from "@/constants/theme";
import { getBreedLineArt, getLineArtSheetSize } from "@/lib/breedLineArtSprite";
import { layoutSpriteInViewport } from "@/lib/spriteViewportLayout";
import type { Breed } from "@/types/app";

const iconPool: Array<keyof typeof MaterialCommunityIcons.glyphMap> = [
  "dog-side",
  "dog-service",
  "dog",
  "paw",
  "bone",
  "dog-side-off",
];

const commonSprite = require("../../assets/common-dogs.png");
const uncommonSprite = require("../../assets/uncommon-dogs.png");
const rareLegendarySprite = require("../../assets/rare-legendary-dogs.png");

/** Hex tile matches Svg viewBox 0 0 100 110 */
const TILE_SCALE = 1.3;
const TILE_W = 72 * TILE_SCALE;
const TILE_H = 78 * TILE_SCALE;
const VIEWBOX_H = 110;
const FEET_Y_VIEWBOX = 74;

const DOG_VIEWPORT_W = 56 * TILE_SCALE;
const DOG_VIEWPORT_H = 45 * TILE_SCALE;
const BASELINE_INSET = 7 * TILE_SCALE;

/** Let the first paint commit before entry animation runs (avoids blank first rows at scroll top). */
const ENTER_AFTER_FIRST_FRAME_MS = 17;

const feetPxFromTop = (FEET_Y_VIEWBOX / VIEWBOX_H) * TILE_H;
const dogViewportTop = feetPxFromTop - (DOG_VIEWPORT_H - BASELINE_INSET);
const dogViewportLeft = (TILE_W - DOG_VIEWPORT_W) / 2;

function iconForBreed(breedId: string) {
  const hash = breedId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return iconPool[hash % iconPool.length];
}

export function HexBreedTile({
  breed,
  unlocked,
  onPress,
  columns = 3,
  animationDelayMs,
}: {
  breed: Breed;
  unlocked: boolean;
  onPress?: () => void;
  /** Grid columns (Dogdex uses 3 so hexes read clearly). */
  columns?: number;
  /** Optional enter animation delay for staggered row reveal. */
  animationDelayMs?: number;
}) {
  const fill = unlocked ? rarityColors[breed.rarity] : "#a3a3a3";
  const stroke = rarityHexBorderColors[breed.rarity];
  const iconColor = unlocked ? "#ffffff" : "#404040";
  const commonCrop = commonBreedCrops[breed.id];
  const uncommonCrop = uncommonBreedCrops[breed.id];
  const rareLegendaryCrop = rareLegendaryBreedCrops[breed.id];
  const hasCommonIcon = commonCrop != null;
  const hasUncommonIcon = uncommonCrop != null;
  const hasRareLegendaryIcon = rareLegendaryCrop != null;
  const tweak = getHexSpriteTweak(breed.id);

  const lineArtEntry = getBreedLineArt(breed.id);
  const lineArtLayout = lineArtEntry
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
    hasCommonIcon && commonCrop
      ? layoutSpriteInViewport(commonCrop, tweak, COMMON_SPRITE_SIZE, DOG_VIEWPORT_W, DOG_VIEWPORT_H, BASELINE_INSET)
      : null;
  const uncommonLayout =
    hasUncommonIcon && uncommonCrop
      ? layoutSpriteInViewport(uncommonCrop, tweak, UNCOMMON_SPRITE_SIZE, DOG_VIEWPORT_W, DOG_VIEWPORT_H, BASELINE_INSET)
      : null;
  const rareLegendaryLayout =
    hasRareLegendaryIcon && rareLegendaryCrop
      ? layoutSpriteInViewport(
          rareLegendaryCrop,
          tweak,
          RARE_LEGENDARY_SPRITE_SIZE,
          DOG_VIEWPORT_W,
          DOG_VIEWPORT_H,
          BASELINE_INSET,
        )
      : null;

  const colWidth = `${100 / columns}%` as DimensionValue;

  return (
    <View style={{ width: colWidth }}>
      <Animated.View
        entering={
          typeof animationDelayMs === "number"
            ? FadeInUp.delay(ENTER_AFTER_FIRST_FRAME_MS + animationDelayMs).duration(260)
            : undefined
        }
      >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className="mb-5 items-center active:opacity-85"
        style={{ width: "100%" }}
      >
      <View
        className="items-center justify-center"
        style={{
          width: TILE_W,
          height: TILE_H,
        }}
      >
        <Svg width={TILE_W} height={TILE_H} viewBox="0 0 100 110">
          <Polygon points="50,3 93,28 93,81 50,107 7,81 7,28" fill={fill} />
          <Polygon
            points="50,3 93,28 93,81 50,107 7,81 7,28"
            fill="none"
            stroke={stroke}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: dogViewportLeft,
            top: dogViewportTop,
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
                backgroundColor: "transparent",
                opacity: unlocked ? 1 : 0.45,
              }}
            />
          ) : hasCommonIcon && commonLayout ? (
            <Image
              source={commonSprite}
              style={{
                position: "absolute",
                width: commonLayout.spriteWidth,
                height: commonLayout.spriteHeight,
                left: commonLayout.left,
                top: commonLayout.top,
                backgroundColor: "transparent",
                opacity: unlocked ? 1 : 0.45,
              }}
            />
          ) : hasUncommonIcon && uncommonLayout ? (
            <Image
              source={uncommonSprite}
              style={{
                position: "absolute",
                width: uncommonLayout.spriteWidth,
                height: uncommonLayout.spriteHeight,
                left: uncommonLayout.left,
                top: uncommonLayout.top,
                backgroundColor: "transparent",
                opacity: unlocked ? 1 : 0.45,
              }}
            />
          ) : hasRareLegendaryIcon && rareLegendaryLayout ? (
            <Image
              source={rareLegendarySprite}
              style={{
                position: "absolute",
                width: rareLegendaryLayout.spriteWidth,
                height: rareLegendaryLayout.spriteHeight,
                left: rareLegendaryLayout.left,
                top: rareLegendaryLayout.top,
                backgroundColor: "transparent",
                opacity: unlocked ? 1 : 0.45,
              }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center" style={{ opacity: unlocked ? 1 : 0.5 }}>
              <MaterialCommunityIcons name={iconForBreed(breed.id)} size={26} color={iconColor} />
            </View>
          )}
        </View>
        {!unlocked ? (
          <View
            pointerEvents="none"
            className="absolute bottom-2 items-center justify-center rounded-full bg-black/55 px-1.5 py-0.5"
            style={{ alignSelf: "center" }}
          >
            <MaterialCommunityIcons name="lock" size={12} color="#fff" />
          </View>
        ) : null}
      </View>
      <Text
        className="mt-1 max-w-[102px] text-center text-[11px] font-semibold leading-tight text-zinc-800 dark:text-zinc-200"
        numberOfLines={2}
      >
        {breed.name}
      </Text>
      </Pressable>
      </Animated.View>
    </View>
  );
}
