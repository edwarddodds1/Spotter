import { useEffect, useMemo, useRef } from "react";
import { Image, PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BreedCommonColours } from "@/components/BreedCommonColours";
import { BreedMiniIcon } from "@/components/BreedMiniIcon";
import { BreedOriginMap } from "@/components/BreedOriginMap";
import { RarityBadge } from "@/components/RarityBadge";
import { buildDogdexBreedOrder } from "@/constants/breeds";
import { variantThresholds } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { getOriginMapData } from "@/lib/breedOriginGeo";
import { selectCollectedBreedIds, useSpotterStore } from "@/store/useSpotterStore";

type Props = NativeStackScreenProps<RootStackParamList, "BreedDetail">;

export function BreedDetailScreen({ route, navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const prevBreedIdRef = useRef<string | null>(null);
  const breeds = useSpotterStore((state) => state.breeds);
  const allScans = useSpotterStore((state) => state.scans);
  const currentUserId = useSpotterStore((state) => state.currentUser.id);
  const breed = useMemo(
    () => breeds.find((item) => item.id === route.params.breedId),
    [breeds, route.params.breedId],
  );
  const collectedIds = useMemo(() => selectCollectedBreedIds(allScans), [allScans]);
  const isUnlocked = breed ? collectedIds.has(breed.id) : false;

  useEffect(() => {
    const id = route.params.breedId;
    if (prevBreedIdRef.current !== null && prevBreedIdRef.current !== id) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
    prevBreedIdRef.current = id;
  }, [route.params.breedId]);

  const scans = useMemo(
    () =>
      allScans.filter(
        (scan) =>
          scan.breedId === route.params.breedId && !scan.isPendingBreed && scan.userId === currentUserId,
      ),
    [allScans, route.params.breedId, currentUserId],
  );

  if (!breed) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-ink">
        <Text className="text-black dark:text-white">Breed not found.</Text>
      </View>
    );
  }

  const nextThreshold = variantThresholds[breed.rarity];
  const scansRemaining = Math.max(nextThreshold - scans.length, 0);
  const hasOriginMap = useMemo(() => Boolean(getOriginMapData(breed.origin)), [breed.origin]);
  const dogdexBreeds = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);
  const breedIndex = useMemo(() => dogdexBreeds.findIndex((b) => b.id === breed.id), [dogdexBreeds, breed.id]);

  const swipeBusyRef = useRef(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.35,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (swipeBusyRef.current) return;
          if (Math.abs(g.dx) < Math.abs(g.dy) * 1.2) return;

          const minDx = 52;
          const minVx = 0.28;
          const goNext = g.dx < 0 && (Math.abs(g.dx) > minDx || g.vx < -minVx);
          const goPrev = g.dx > 0 && (Math.abs(g.dx) > minDx || g.vx > minVx);
          if (!goNext && !goPrev) return;

          const targetIndex = goNext ? breedIndex + 1 : breedIndex - 1;
          const target = dogdexBreeds[targetIndex];
          if (!target) return;

          swipeBusyRef.current = true;
          navigation.setParams({ breedId: target.id });
          setTimeout(() => {
            swipeBusyRef.current = false;
          }, 280);
        },
      }),
    [breedIndex, dogdexBreeds, navigation],
  );

  return (
    <ScrollView
      ref={scrollRef}
      {...panResponder.panHandlers}
      className="flex-1 bg-zinc-50 dark:bg-ink"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-4 pt-4">
        <View className="flex-row items-start gap-2">
          <Text className="min-w-0 flex-1 text-3xl font-bold text-black dark:text-white">{breed.name}</Text>
          {isUnlocked ? (
            <View className="mt-1 shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 dark:bg-emerald-500/20">
              <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">In your Dogdex</Text>
            </View>
          ) : (
            <View className="mt-1 shrink-0 rounded-full bg-red-600 px-2.5 py-1 dark:bg-red-500">
              <Text className="text-xs font-semibold text-white">Not yet found</Text>
            </View>
          )}
        </View>
        <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-2">
          <RarityBadge rarity={breed.rarity} />
          {!isUnlocked ? (
            <Pressable
              onPress={() => navigation.navigate("Tabs", { screen: "SpotTab" } as never)}
              className="active:opacity-70"
            >
              <View className="flex-row items-center gap-1">
                <MaterialCommunityIcons name="camera" size={14} color="#d97706" />
                <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400">Open Spot</Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        <Text className="mt-4 text-base leading-6 text-zinc-700 dark:text-zinc-300">{breed.description}</Text>

        <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
          <Text className="text-lg font-bold text-black dark:text-white">Breed profile</Text>
          {hasOriginMap ? (
            <View className="mt-4 flex-row items-start gap-4">
              <View className="min-w-0 flex-1 gap-3">
                <MetaRow label="Origin" value={breed.origin} />
                <MetaRow label="Temperament" value={breed.temperament} />
                <MetaRow label="Size" value={breed.size} />
                <MetaRow label="Lifespan" value={breed.lifespan} />
              </View>
              <View className="w-[48%] max-w-[260px] shrink-0 self-start">
                <BreedOriginMap origin={breed.origin} className="size-full min-h-[164px]" />
                <View className="mt-1 items-center">
                  <BreedMiniIcon breed={breed} />
                </View>
              </View>
            </View>
          ) : (
            <View className="mt-3 gap-3">
              <MetaRow label="Origin" value={breed.origin} />
              <MetaRow label="Temperament" value={breed.temperament} />
              <MetaRow label="Size" value={breed.size} />
              <MetaRow label="Lifespan" value={breed.lifespan} />
            </View>
          )}
          <BreedCommonColours breedId={breed.id} scans={scans} />
        </View>

        <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
          <Text className="text-lg font-bold text-black dark:text-white">Variant progress</Text>
          <Text className="mt-2 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
            {!isUnlocked
              ? "Spot this breed at least once to track scans and work toward colour variants."
              : scansRemaining === 0
                ? "Colour variant unlocked."
                : `${scansRemaining} more scan${scansRemaining === 1 ? "" : "s"} needed for the next colour variant.`}
          </Text>
        </View>

        <Text className="mt-8 text-lg font-bold text-black dark:text-white">Your scan history</Text>
        {scans.length === 0 ? (
          <View className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-zinc-600 dark:bg-card">
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              {isUnlocked
                ? "No photos tagged with this breed yet."
                : "No scans yet — use Spot to log this breed when you see it."}
            </Text>
          </View>
        ) : (
          <View className="mt-3 flex-row flex-wrap justify-between">
            {scans.map((scan) => (
              <View key={scan.id} className="mb-3 w-[48%]">
                <Image source={{ uri: scan.photoUrl }} className="h-28 w-full rounded-2xl bg-zinc-100" />
                {scan.spotComment ? (
                  <Text className="mt-1.5 text-[11px] leading-4 text-zinc-600 dark:text-zinc-400" numberOfLines={3}>
                    {scan.spotComment}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text className="mt-1 text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}
