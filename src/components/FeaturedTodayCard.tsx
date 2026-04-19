import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { commonBreedCrops, COMMON_SPRITE_SIZE } from "@/constants/commonSpriteCrops";
import { getHexSpriteTweak } from "@/constants/hexSpriteTweaks";
import { rareLegendaryBreedCrops, RARE_LEGENDARY_SPRITE_SIZE } from "@/constants/rareLegendarySpriteCrops";
import { uncommonBreedCrops, UNCOMMON_SPRITE_SIZE } from "@/constants/uncommonSpriteCrops";
import { palette, rarityColors } from "@/constants/theme";
import { getBreedLineArt, getLineArtSheetSize } from "@/lib/breedLineArtSprite";
import { layoutSpriteInViewport } from "@/lib/spriteViewportLayout";
import type { Breed } from "@/types/app";

const commonSprite = require("../../assets/common-dogs.png");
const uncommonSprite = require("../../assets/uncommon-dogs.png");
const rareLegendarySprite = require("../../assets/rare-legendary-dogs.png");

/** Same aspect as HexBreedTile (56×45) so line-art / sheet crops match the Dogdex hex. */
const HEX_DOG_VP_W = 56;
const HEX_DOG_VP_H = 45;
const HEX_BASELINE_INSET = 7;

const VP_W = 112;
const VP_H = (VP_W / HEX_DOG_VP_W) * HEX_DOG_VP_H;
const VP_BASELINE_INSET = HEX_BASELINE_INSET * (VP_H / HEX_DOG_VP_H);
const FEATURED_TWEAK_NUDGE_SCALE = VP_W / HEX_DOG_VP_W;

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

type Props = {
  breed: Breed;
  onOpenBreedSheet: () => void;
};

export function FeaturedTodayCard({ breed, onOpenBreedSheet }: Props) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const multiplierStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const commonCrop = commonBreedCrops[breed.id];
  const uncommonCrop = uncommonBreedCrops[breed.id];
  const rareLegendaryCrop = rareLegendaryBreedCrops[breed.id];
  const tweak = getHexSpriteTweak(breed.id);
  const lineArtEntry = getBreedLineArt(breed.id);
  const lineArtLayout =
    lineArtEntry != null
      ? layoutSpriteInViewport(
          lineArtEntry.crop,
          tweak,
          getLineArtSheetSize(lineArtEntry),
          VP_W,
          VP_H,
          VP_BASELINE_INSET,
          FEATURED_TWEAK_NUDGE_SCALE,
          true,
        )
      : null;
  const commonLayout =
    commonCrop != null
      ? layoutSpriteInViewport(commonCrop, tweak, COMMON_SPRITE_SIZE, VP_W, VP_H, VP_BASELINE_INSET, FEATURED_TWEAK_NUDGE_SCALE, true)
      : null;
  const uncommonLayout =
    uncommonCrop != null
      ? layoutSpriteInViewport(uncommonCrop, tweak, UNCOMMON_SPRITE_SIZE, VP_W, VP_H, VP_BASELINE_INSET, FEATURED_TWEAK_NUDGE_SCALE, true)
      : null;
  const rareLegendaryLayout =
    rareLegendaryCrop != null
      ? layoutSpriteInViewport(
          rareLegendaryCrop,
          tweak,
          RARE_LEGENDARY_SPRITE_SIZE,
          VP_W,
          VP_H,
          VP_BASELINE_INSET,
          FEATURED_TWEAK_NUDGE_SCALE,
          true,
        )
      : null;

  const accent = rarityColors[breed.rarity];

  return (
    <Pressable
      onPress={onOpenBreedSheet}
      accessibilityRole="button"
      accessibilityLabel={`Featured breed ${breed.name}, open breed sheet`}
      className="mt-5 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white active:opacity-95 dark:border-border dark:bg-card"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      }}
    >
      <View className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: accent }} />
      <View className="flex-row pl-2 pr-4 py-5">
        <View className="items-center justify-center" style={{ width: 136 }}>
          <View
            className="items-center justify-center overflow-visible"
            style={{
              width: VP_W + 24,
              height: VP_H + 28,
            }}
          >
            <View
              style={{
                width: VP_W,
                height: VP_H,
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
                    opacity: 1,
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
                    opacity: 1,
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
                    opacity: 1,
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
                    opacity: 1,
                  }}
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-transparent">
                  <MaterialCommunityIcons name={iconForBreed(breed.id)} size={56} color={accent} />
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="min-w-0 flex-1 justify-center pl-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber">Featured today</Text>
            <View className="rounded-full bg-amber/15 p-1.5 dark:bg-amber/20">
              <MaterialCommunityIcons name="information-outline" size={22} color={palette.amber} />
            </View>
          </View>
          <Text className="mt-2 pr-2 text-2xl font-bold leading-tight text-black dark:text-white" numberOfLines={2}>
            {breed.name}
          </Text>
          <Animated.View style={[multiplierStyle, { marginTop: 16, alignSelf: "flex-start" }]}>
            <View
              className="flex-row items-baseline rounded-2xl bg-amber px-3.5 py-2"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Text className="text-[26px] font-black tracking-tight text-white">3×</Text>
              <Text className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-white/95">points</Text>
            </View>
          </Animated.View>
          <Text className="mt-3 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
            Spot this breed today — triple points in the camera flow.
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
