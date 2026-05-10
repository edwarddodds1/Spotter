import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BreedCommonColours } from "@/components/BreedCommonColours";
import { BreedMiniIcon } from "@/components/BreedMiniIcon";
import { BreedOriginMap } from "@/components/BreedOriginMap";
import { RarityBadge } from "@/components/RarityBadge";
import { buildDogdexBreedOrder } from "@/constants/breeds";
import { getBreedFunFact } from "@/constants/breedFunFacts";
import { parseCharacteristicList } from "@/constants/breedCharacteristics";
import { getBreedStatRatings } from "@/constants/breedStatRatings";
import { breedProfileAccent, rarityColors } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { getOriginMapData } from "@/lib/breedOriginGeo";
import { resolveBreedHeroImageUri } from "@/lib/supabase/publicUrls";
import { isAdminEmail } from "@/constants/admin";
import { useAuthStore } from "@/store/useAuthStore";
import { selectCollectedBreedIds, useSpotterStore } from "@/store/useSpotterStore";

const FAVORITE_BREEDS_KEY = "@spotter/favoriteBreedIds";
/** Shorter hero so more content shows above the fold; still tall enough for title + CTA. */
const HERO_HEIGHT = 260;

type Props = NativeStackScreenProps<RootStackParamList, "BreedDetail">;

function compactCharacteristics(raw: string): string {
  const traits = parseCharacteristicList(raw);
  if (traits.length === 0) return "—";
  return traits.slice(0, 3).join(", ");
}

export function BreedDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevBreedIdRef = useRef<string | null>(null);
  const swipeBusyRef = useRef(false);
  const themeMode = useSpotterStore((s) => s.themeMode);
  const isDark = themeMode === "dark";
  const breeds = useSpotterStore((state) => state.breeds);
  const allScans = useSpotterStore((state) => state.scans);
  const currentUserId = useSpotterStore((state) => state.currentUser.id);
  const sessionEmail = useAuthStore((s) => s.session?.user?.email);
  const showAdminEdit = isAdminEmail(sessionEmail);
  const breed = useMemo(
    () => breeds.find((item) => item.id === route.params.breedId),
    [breeds, route.params.breedId],
  );
  const collectedIds = useMemo(() => selectCollectedBreedIds(allScans, currentUserId), [allScans, currentUserId]);
  const isUnlocked = breed ? collectedIds.has(breed.id) : false;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  /** After scrolling past the hero, switch status bar for light page content (light mode). */
  const [heroScrolledPast, setHeroScrolledPast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITE_BREEDS_KEY);
        if (cancelled) return;
        const arr = raw ? (JSON.parse(raw) as string[]) : [];
        setFavoriteIds(new Set(arr));
      } catch {
        if (!cancelled) setFavoriteIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!breed) return;
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(breed.id)) next.delete(breed.id);
      else next.add(breed.id);
      void AsyncStorage.setItem(FAVORITE_BREEDS_KEY, JSON.stringify([...next])).catch(() => undefined);
      return next;
    });
  }, [breed]);

  const dogdexBreeds = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);
  const breedIndex = useMemo(() => {
    if (!breed) return -1;
    return dogdexBreeds.findIndex((b) => b.id === breed.id);
  }, [dogdexBreeds, breed]);

  const runBreedSwipe = useCallback(
    (goingNext: boolean) => {
      if (!breed || swipeBusyRef.current) return;
      const targetIndex = goingNext ? breedIndex + 1 : breedIndex - 1;
      const target = dogdexBreeds[targetIndex];
      if (!target) return;

      swipeBusyRef.current = true;
      const w = windowWidth;
      const outDx = goingNext ? -w : w;
      const startInDx = goingNext ? w : -w;

      Animated.timing(slideAnim, {
        toValue: outDx,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          swipeBusyRef.current = false;
          return;
        }
        navigation.setParams({ breedId: target.id });
        slideAnim.setValue(startInDx);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          swipeBusyRef.current = false;
        });
      });
    },
    [breed, breedIndex, dogdexBreeds, navigation, slideAnim, windowWidth],
  );

  useEffect(() => {
    const id = route.params.breedId;
    if (prevBreedIdRef.current !== null && prevBreedIdRef.current !== id) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      setHeroScrolledPast(false);
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

  const spotsNewestFirst = useMemo(
    () => [...scans].sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()),
    [scans],
  );

  const hasOriginMap = useMemo(
    () => (breed ? Boolean(getOriginMapData(breed.origin)) : false),
    [breed],
  );

  const heroUri = breed ? resolveBreedHeroImageUri(breed) : null;
  const statRatings = useMemo(() => {
    if (!breed) return null;
    return breed.statRatings ?? getBreedStatRatings(breed.id);
  }, [breed]);
  const funFact = useMemo(() => {
    if (!breed) return null;
    const db = breed.funFact?.trim();
    if (db) return db;
    return getBreedFunFact(breed.id);
  }, [breed]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.35,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: (_, g) => Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (swipeBusyRef.current || !breed) return;
          if (Math.abs(g.dx) < Math.abs(g.dy) * 1.2) return;

          const minDx = 52;
          const minVx = 0.28;
          const goNext = g.dx < 0 && (Math.abs(g.dx) > minDx || g.vx < -minVx);
          const goPrev = g.dx > 0 && (Math.abs(g.dx) > minDx || g.vx > minVx);
          if (!goNext && !goPrev) return;

          if (goNext) runBreedSwipe(true);
          else runBreedSwipe(false);
        },
      }),
    [breed, runBreedSwipe],
  );

  const onShare = useCallback(async () => {
    if (!breed) return;
    try {
      await Share.share({
        message: `${breed.name} — on Spotter`,
        title: breed.name,
      });
    } catch {
      /* user dismissed */
    }
  }, [breed]);

  if (!breed) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-ink">
        <Text className="text-black dark:text-white">Breed not found.</Text>
      </View>
    );
  }

  const isFavorite = favoriteIds.has(breed.id);
  const cardClass =
    "rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card";
  const shadowStyle =
    Platform.OS === "web"
      ? { boxShadow: "0 4px 24px rgba(0,0,0,0.06)" as const }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 12,
          elevation: 4,
        };

  return (
    <View className="flex-1 bg-zinc-100 dark:bg-ink">
      <StatusBar style={heroScrolledPast ? (isDark ? "light" : "dark") : "light"} />
      <ScrollView
        ref={scrollRef}
        {...panResponder.panHandlers}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const past = y > HERO_HEIGHT * 0.35;
          setHeroScrolledPast((prev) => (prev !== past ? past : prev));
        }}
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <View style={{ height: HERO_HEIGHT }} className="relative w-full overflow-hidden bg-zinc-900">
            {heroUri ? (
              <Image source={{ uri: heroUri }} className="absolute inset-0 size-full" resizeMode="cover" />
            ) : (
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: breedProfileAccent.primary }}
              >
                <BreedMiniIcon breed={breed} />
              </View>
            )}
            <View
              pointerEvents="none"
              className="absolute inset-0"
              style={{ backgroundColor: breedProfileAccent.heroOverlay }}
            />
            <View
              pointerEvents="none"
              className="absolute bottom-0 left-0 right-0 h-24"
              style={{ backgroundColor: breedProfileAccent.heroOverlayBottom }}
            />

            <View
              style={{ paddingTop: insets.top + 4 }}
              className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-3"
            >
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                className="h-10 w-10 items-center justify-center rounded-full bg-black/35"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
              </Pressable>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => void onShare()}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/35"
                  accessibilityRole="button"
                  accessibilityLabel="Share breed"
                >
                  <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={toggleFavorite}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/35"
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={22} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <View className="flex-row flex-wrap items-center gap-2">
                <RarityBadge rarity={breed.rarity} />
                {isUnlocked ? (
                  <View className="rounded-full bg-white/20 px-2.5 py-1">
                    <Text className="text-[10px] font-semibold uppercase tracking-wide text-white">In your Dogdex</Text>
                  </View>
                ) : (
                  <View className="rounded-full bg-red-600/90 px-2.5 py-1">
                    <Text className="text-[10px] font-semibold text-white">Not yet found</Text>
                  </View>
                )}
              </View>
              <Text className="mt-1.5 text-2xl font-bold text-white">{breed.name}</Text>
              <Pressable
                onPress={() => navigation.navigate("Tabs", { screen: "SpotTab" } as never)}
                className="mt-2.5 flex-row items-center gap-2 self-start rounded-full bg-white/95 px-3 py-1.5 dark:bg-white/90"
              >
                <MaterialCommunityIcons name="camera" size={16} color={rarityColors[breed.rarity]} />
                <Text className="text-xs font-semibold text-zinc-900">
                  Open Spot
                  {isUnlocked ? ` · Seen ${scans.length} time${scans.length === 1 ? "" : "s"}` : ""}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="px-4 pt-5">
            {/* Quick facts */}
            <View className={cardClass} style={shadowStyle}>
              <View className="flex-row flex-wrap gap-x-2 gap-y-4">
                <QuickFact icon="map-marker" label="Origin" value={breed.origin} />
                <QuickFact icon="ruler" label="Size" value={breed.size} />
                <QuickFact icon="heart-pulse" label="Lifespan" value={breed.lifespan} />
                <QuickFact
                  icon="lightning-bolt"
                  label="Characteristics"
                  value={compactCharacteristics(breed.temperament)}
                />
              </View>
            </View>

            {/* About */}
            <View className={`mt-5 ${cardClass}`} style={shadowStyle}>
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="information" size={26} color={breedProfileAccent.primary} />
                <Text className="text-2xl font-bold text-black dark:text-white">About the breed</Text>
              </View>
              <View className="mt-4 flex-row gap-3">
                <View className="min-w-0 flex-1 basis-0">
                  <Text className="text-base leading-6 text-zinc-700 dark:text-zinc-300">
                    {breed.subtitle?.trim() ? (
                      <>
                        <Text className="font-semibold text-zinc-800 dark:text-zinc-200">{breed.subtitle.trim()}</Text>
                        <Text>{/[.!?…]$/.test(breed.subtitle.trim()) ? " " : " — "}</Text>
                      </>
                    ) : null}
                    {breed.description}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 basis-0 items-center justify-center">
                  <BreedMiniIcon breed={breed} />
                </View>
              </View>
              {hasOriginMap ? (
                <View className="mt-5 overflow-hidden rounded-2xl">
                  <BreedOriginMap origin={breed.origin} className="h-[140px] w-full" />
                </View>
              ) : null}
            </View>

            <BreedCommonColours breedId={breed.id} rarity={breed.rarity} scans={scans} isUnlocked={isUnlocked} />

            {(() => {
              const statsSlot =
                statRatings ? (
                  <View className={`${cardClass} flex-1`} style={shadowStyle}>
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="chart-bar" size={22} color={breedProfileAccent.primary} />
                      <Text className="text-lg font-bold text-black dark:text-white">Breed stats</Text>
                    </View>
                    <View className="mt-4 gap-3">
                      <StatRow isDark={isDark} label="Intelligence" value={statRatings.intelligence} />
                      <StatRow isDark={isDark} label="Energy level" value={statRatings.energy} />
                      <StatRow isDark={isDark} label="Trainability" value={statRatings.trainability} />
                      <StatRow isDark={isDark} label="Shedding" value={statRatings.shedding} />
                      <StatRow isDark={isDark} label="Kid friendly" value={statRatings.kidFriendly} />
                    </View>
                  </View>
                ) : showAdminEdit ? (
                  <Pressable
                    onPress={() => navigation.navigate("AdminBreedEditor", { breedId: breed.id })}
                    className={`${cardClass} flex-1 border-dashed border-zinc-400/80 dark:border-zinc-500`}
                    style={shadowStyle}
                  >
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="pencil-outline" size={22} color={breedProfileAccent.primary} />
                      <Text className="text-lg font-bold text-black dark:text-white">Breed stats</Text>
                    </View>
                    <Text className="mt-2 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                      None yet for this breed. Tap to add (admin).
                    </Text>
                  </Pressable>
                ) : null;

              const funSlot = funFact ? (
                <View
                  className="min-h-0 flex-1 rounded-3xl border border-amber-200/80 bg-amber-50/90 p-5 dark:border-amber-900/50 dark:bg-amber-950/40"
                  style={shadowStyle}
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="star-four-points" size={22} color="#b45309" />
                    <Text className="text-lg font-bold text-amber-950 dark:text-amber-100">Fun fact</Text>
                  </View>
                  <Text className="mt-3 text-base leading-6 text-amber-950/90 dark:text-amber-100/90">{funFact}</Text>
                </View>
              ) : showAdminEdit ? (
                <Pressable
                  onPress={() => navigation.navigate("AdminBreedEditor", { breedId: breed.id })}
                  className="flex-1 rounded-3xl border border-dashed border-amber-700/45 bg-amber-50/60 p-5 dark:border-amber-600/45 dark:bg-amber-950/30"
                  style={shadowStyle}
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="pencil-outline" size={22} color="#b45309" />
                    <Text className="text-lg font-bold text-amber-950 dark:text-amber-100">Fun fact</Text>
                  </View>
                  <Text className="mt-2 text-sm leading-5 text-amber-900/85 dark:text-amber-200/85">
                    None yet for this breed. Tap to add (admin).
                  </Text>
                </Pressable>
              ) : null;

              if (!statsSlot && !funSlot) return null;

              if (statsSlot && funSlot) {
                return (
                  <View className="mt-5 flex-row gap-3 items-stretch">
                    <View className="min-w-0 flex-1">{statsSlot}</View>
                    <View className="min-w-0 flex-1">{funSlot}</View>
                  </View>
                );
              }

              return (
                <View className="mt-5 gap-3">
                  {statsSlot}
                  {funSlot}
                </View>
              );
            })()}

            {showAdminEdit ? (
              <Pressable
                onPress={() => navigation.navigate("AdminBreedEditor", { breedId: breed.id })}
                className="mt-5 self-start rounded-full bg-zinc-200 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-xs font-semibold text-black dark:text-white">Edit breed (admin)</Text>
              </Pressable>
            ) : null}

            <View className="mt-8">
              <Text className="text-lg font-bold text-black dark:text-white">Your spots</Text>
              <Text className="mt-0.5 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                Your past scans of this breed — newest first.
              </Text>
              {spotsNewestFirst.length === 0 ? (
                <View className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-zinc-600 dark:bg-card">
                  <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {isUnlocked
                      ? "No photos tagged with this breed yet."
                      : "No scans yet — use Spot to log this breed when you see it."}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  className="mt-3 -mx-4"
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
                >
                  {spotsNewestFirst.map((scan) => (
                    <View
                      key={scan.id}
                      className="w-[148px] shrink-0 overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800"
                    >
                      <View className="aspect-square w-full">
                        <Image source={{ uri: scan.photoUrl }} className="size-full" resizeMode="cover" />
                        <View className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1.5">
                          <Text className="text-[11px] font-semibold text-white" numberOfLines={1}>
                            {scan.locationLabel?.trim() ||
                              new Date(scan.scannedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function QuickFact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-[45%] max-w-[50%] flex-1 gap-1" style={{ flexBasis: "45%" }}>
      <MaterialCommunityIcons name={icon} size={22} color={breedProfileAccent.primary} />
      <Text className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</Text>
      <Text className="text-sm font-semibold leading-5 text-black dark:text-white" numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function StatRow({ isDark, label, value }: { isDark: boolean; label: string; value: number }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  const emptyStar = isDark ? "#3f3f46" : "#d4d4d8";
  return (
    <View>
      <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</Text>
      <View className="mt-1 flex-row gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <MaterialCommunityIcons
            key={i}
            name="star"
            size={18}
            color={i <= v ? breedProfileAccent.primary : emptyStar}
          />
        ))}
      </View>
    </View>
  );
}
