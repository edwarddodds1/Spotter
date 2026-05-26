import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppMark } from "@/components/AppMark";
import { ScanPhoto } from "@/components/ScanPhoto";
import { PointsBadge } from "@/components/PointsBadge";
import { RarityBadge } from "@/components/RarityBadge";
import { SpotPhotoEditorModal } from "@/components/SpotPhotoEditorModal";
import { UserAvatar } from "@/components/UserAvatar";
import { FeedPostSocialBar } from "@/features/social/FeedPostSocialBar";
import { deleteSpot, replaceScanPhoto } from "@/features/spot/spotService";
import { shareScanCard } from "@/features/social/shareScanCard";
import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import { getStartOfCurrentWeek } from "@/lib/utils/dates";
import { palette } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { UserProfile } from "@/types/app";

const rankAccent = ["#f59e0b", "#94a3b8", "#b45309"];

type FeedMode = "public" | "friends";

function resolveFeedUser(scanUserId: string, currentUser: UserProfile, friends: UserProfile[]): UserProfile {
  if (scanUserId === currentUser.id) return currentUser;
  return (
    friends.find((f) => f.id === scanUserId) ?? {
      id: scanUserId,
      username: "Spotter",
      avatarUrl: null,
      totalScans: 0,
      createdAt: "",
      city: "",
      country: "",
    }
  );
}

export function SocialScreen() {
  const navigation = useNavigation<any>();
  const allScans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const pendingFriendRequests = useSpotterStore((state) => state.pendingFriendRequests);

  const [feedMode, setFeedMode] = useState<FeedMode>("public");
  const [editingScanId, setEditingScanId] = useState<string | null>(null);
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const segmentTrackW = useSharedValue(0);
  const segmentIndex = useSharedValue(0);

  const openPhotoEditor = async (scanId: string, photoUrl: string) => {
    try {
      const resolved = await resolveScanPhotoDisplayUrl(photoUrl);
      setEditingUri(resolved);
      setEditingScanId(scanId);
    } catch (err) {
      console.warn("[SocialScreen] could not open photo editor", err);
      Alert.alert("Couldn't open editor", "Please try again in a moment.");
    }
  };

  const closePhotoEditor = () => {
    setEditingScanId(null);
    setEditingUri(null);
  };

  const handlePhotoSave = async (newUri: string) => {
    const scanId = editingScanId;
    if (!scanId) return;
    closePhotoEditor();
    try {
      await replaceScanPhoto(scanId, newUri);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't update the photo. Please try again.";
      Alert.alert("Save failed", message);
    }
  };

  useEffect(() => {
    segmentIndex.value = withSpring(feedMode === "public" ? 0 : 1, { damping: 22, stiffness: 260 });
  }, [feedMode, segmentIndex]);

  const scans = useMemo(
    () => allScans.filter((scan) => !scan.isPendingBreed && scan.userId === currentUser.id),
    [allScans, currentUser.id],
  );

  const topDogs = useMemo(() => {
    const weekStart = getStartOfCurrentWeek();
    const weekCounts = new Map<string, number>();

    scans.forEach((scan) => {
      if (scan.isPrivate) return;
      if (!scan.dogProfileId) return;
      if (new Date(scan.scannedAt) < weekStart) return;
      weekCounts.set(scan.dogProfileId, (weekCounts.get(scan.dogProfileId) ?? 0) + 1);
    });

    return [...dogProfiles]
      .map((dog) => ({
        ...dog,
        weeklyScans: weekCounts.get(dog.id) ?? 0,
      }))
      .sort((a, b) => (b.weeklyScans === a.weeklyScans ? b.totalScans - a.totalScans : b.weeklyScans - a.weeklyScans))
      .slice(0, 3);
  }, [dogProfiles, scans]);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const feedSourceScans = useMemo(() => {
    if (feedMode === "public") {
      return allScans.filter((s) => s.userId === currentUser.id && !s.isPendingBreed);
    }
    return allScans.filter((s) => friendIds.has(s.userId) && !s.isPendingBreed);
  }, [allScans, currentUser.id, feedMode, friendIds]);

  const feed = useMemo(() => {
    const rows: {
      scan: (typeof allScans)[number];
      breed: (typeof breeds)[number];
      dogProfile: (typeof dogProfiles)[number] | null;
      user: UserProfile;
    }[] = [];
    for (const scan of feedSourceScans) {
      if (!scan.breedId || scan.isPrivate) continue;
      const breed = breeds.find((b) => b.id === scan.breedId);
      if (!breed) continue;
      rows.push({
        scan,
        breed,
        dogProfile: dogProfiles.find((dog) => dog.id === scan.dogProfileId) ?? null,
        user: resolveFeedUser(scan.userId, currentUser, friends),
      });
    }
    return rows;
  }, [breeds, currentUser, dogProfiles, feedSourceScans, friends]);

  const thumbStyle = useAnimatedStyle(() => {
    const pad = 4;
    const w = Math.max(0, (segmentTrackW.value - pad) / 2);
    return {
      width: w,
      transform: [{ translateX: segmentIndex.value * w }],
    };
  });

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      <View className="flex-row items-center justify-between gap-3 px-4 pt-8">
        <Text className="text-4xl font-black text-black dark:text-white">Social</Text>
        <Pressable
          onPress={() => navigation.navigate("Friends")}
          className="flex-row items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 dark:bg-zinc-900"
        >
          <MaterialCommunityIcons name="account-group-outline" size={18} color={palette.amber} />
          <Text className="text-sm font-semibold text-black dark:text-white">Friends</Text>
          {pendingFriendRequests.length > 0 ? <View className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
        </Pressable>
      </View>

      <View className="px-4 pb-6 pt-4">
        <View className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card dark:shadow-none">
          <View className="px-5 py-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-bold text-black dark:text-white">Top dogs</Text>
              <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">This week</Text>
            </View>
            {topDogs.length === 0 ? (
              <Text className="py-2 text-sm text-zinc-500 dark:text-zinc-400">No scans yet this week. Get spotting!</Text>
            ) : (
              topDogs.map((dog, index) => {
                const breed = breeds.find((item) => item.id === dog.breedId)!;
                const accent = rankAccent[index] ?? palette.muted;
                return (
                  <Pressable
                    key={dog.id}
                    onPress={() => navigation.navigate("TopDogs")}
                    className="mb-2 flex-row items-center rounded-2xl bg-zinc-50 px-3 py-3 dark:bg-zinc-950/80"
                  >
                    <View
                      className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${accent}22` }}
                    >
                      <Text className="text-sm font-bold" style={{ color: accent }}>
                        {index + 1}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                        {dog.name}
                      </Text>
                      <Text className="text-xs text-zinc-600 dark:text-zinc-400" numberOfLines={1}>
                        {breed.name}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-bold text-amber">{dog.weeklyScans}</Text>
                      <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">scans</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
            <Pressable
              onPress={() => navigation.navigate("TopDogs")}
              className="mt-2 flex-row items-center justify-center gap-1 py-2"
            >
              <Text className="text-sm font-semibold text-amber">Full leaderboard</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={palette.amber} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Feed */}
      <View className="px-4">
        <View className="mb-3 flex-row items-baseline justify-between">
          <Text className="text-lg font-bold text-black dark:text-white">Recent spots</Text>
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {feed.length} {feedMode === "public" ? "public" : "from friends"}
          </Text>
        </View>

        <View
          className="relative mb-3 h-9 w-full flex-row rounded-full bg-zinc-200 p-0.5 dark:bg-zinc-800"
          onLayout={(e) => {
            segmentTrackW.value = e.nativeEvent.layout.width;
          }}
        >
          <Animated.View
            className="absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm dark:bg-zinc-700"
            style={[{ height: 32 }, thumbStyle]}
          />
          <Pressable
            onPress={() => setFeedMode("public")}
            className="z-10 flex-1 items-center justify-center"
            accessibilityRole="button"
            accessibilityState={{ selected: feedMode === "public" }}
          >
            <Text
              className={`text-xs font-semibold ${feedMode === "public" ? "text-black dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              Public
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFeedMode("friends")}
            className="z-10 flex-1 items-center justify-center"
            accessibilityRole="button"
            accessibilityState={{ selected: feedMode === "friends" }}
          >
            <Text
              className={`text-xs font-semibold ${feedMode === "friends" ? "text-black dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              Friends
            </Text>
          </Pressable>
        </View>

        {feed.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-zinc-300 bg-white py-14 dark:border-border dark:bg-card">
            <AppMark size={44} style={{ opacity: 0.85 }} />
            <Text className="mt-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {feedMode === "public"
                ? scans.some((s) => s.breedId && !s.isPendingBreed && s.isPrivate)
                  ? "All your recent spots are private — turn off “Keep private” when saving, or change privacy in Profile."
                  : "No scans to show yet. Open Spot and log your first breed!"
                : friends.length === 0
                  ? "Add friends from the Friends button above to see their public spots here."
                  : "When your friends share public spots, they’ll show up here."}
            </Text>
          </View>
        ) : (
          feed.map(({ scan, breed, dogProfile, user }) => (
            <View
              key={scan.id}
              className="mb-4 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none"
            >
              <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size={44} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                      {user.username}
                    </Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(scan.scannedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  {scan.userId === currentUser.id ? (
                    <Pressable
                      onPress={() => void openPhotoEditor(scan.id, scan.photoUrl)}
                      className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                      accessibilityLabel="Edit photo"
                    >
                      <MaterialCommunityIcons name="image-edit-outline" size={18} color={palette.amber} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => shareScanCard(scan, breed)}
                    className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                    accessibilityLabel="Share spot"
                  >
                    <MaterialCommunityIcons name="share-variant-outline" size={18} color={palette.amber} />
                  </Pressable>
                  {scan.userId === currentUser.id ? (
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Delete this spot?",
                          "This removes the scan from your journal and feed. Stats and badges will update if needed.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => void deleteSpot(scan.id),
                            },
                          ],
                        );
                      }}
                      className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                      accessibilityLabel="Delete spot"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#b91c1c" />
                    </Pressable>
                  ) : null}
                  <PointsBadge points={scan.pointsAwarded} featured={scan.matchedFeaturedBreed} />
                </View>
              </View>

              <ScanPhoto
                scanId={scan.id}
                photoUrl={scan.photoUrl}
                className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900"
              />

              <View className="px-4 pb-4 pt-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-lg font-bold text-black dark:text-white">{breed.name}</Text>
                    {dogProfile ? (
                      <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {dogProfile.name} · spotted {dogProfile.totalScans}× total
                      </Text>
                    ) : null}
                    {scan.locationLabel ? (
                      <Text className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{scan.locationLabel}</Text>
                    ) : null}
                    {scan.spotComment ? (
                      <Text className="mt-2 text-sm leading-5 text-zinc-700 dark:text-zinc-300">{scan.spotComment}</Text>
                    ) : null}
                  </View>
                  <RarityBadge rarity={breed.rarity} />
                </View>

                <FeedPostSocialBar scanId={scan.id} />
              </View>
            </View>
          ))
        )}
      </View>
      <SpotPhotoEditorModal
        visible={editingScanId !== null && editingUri !== null}
        imageUri={editingUri}
        onClose={closePhotoEditor}
        onSave={handlePhotoSave}
      />
    </ScrollView>
  );
}
