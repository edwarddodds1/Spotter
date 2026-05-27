import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppMark } from "@/components/AppMark";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ScanPhoto } from "@/components/ScanPhoto";
import { PointsBadge } from "@/components/PointsBadge";
import { RarityBadge } from "@/components/RarityBadge";
import { SpotPhotoEditorModal } from "@/components/SpotPhotoEditorModal";
import { UserAvatar } from "@/components/UserAvatar";
import { openUserProfileNavigate } from "@/components/UsernameLink";
import { FeedPostSocialBar } from "@/features/social/FeedPostSocialBar";
import { deleteSpot, replaceScanPhoto } from "@/features/spot/spotService";
import { shareScanCard } from "@/features/social/shareScanCard";
import { PILOT_FRIENDS_ENABLED } from "@/lib/pilotFeatures";
import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import { refreshBadgeUnlocks } from "@/lib/syncBadgeUnlocks";
import { refreshNotifications } from "@/lib/syncNotifications";
import { refreshPublicScans } from "@/lib/syncPublicScans";
import { getStartOfCurrentWeek } from "@/lib/utils/dates";
import { badgeCopy } from "@/constants/badges";
import { badgeColors, palette } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { BadgeUnlock, ScanRecord, UserProfile } from "@/types/app";

const rankAccent = ["#f59e0b", "#94a3b8", "#b45309"];

type FeedMode = "public" | "friends";

function resolveFeedUser(
  scanUserId: string,
  currentUser: UserProfile,
  friends: UserProfile[],
  knownUsers: UserProfile[],
): UserProfile {
  if (scanUserId === currentUser.id) return currentUser;
  return (
    friends.find((f) => f.id === scanUserId) ??
    knownUsers.find((u) => u.id === scanUserId) ?? {
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
  const knownUsers = useSpotterStore((state) => state.knownUsers);
  const badgeUnlocks = useSpotterStore((state) => state.badgeUnlocks);
  const pendingFriendRequests = useSpotterStore((state) => state.pendingFriendRequests);
  const notifications = useSpotterStore((state) => state.notifications);
  const hasUnreadNotifications = notifications.some((n) => n.readAt === null);

  const [feedMode, setFeedMode] = useState<FeedMode>("public");
  const [editingScanId, setEditingScanId] = useState<string | null>(null);
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const [deleteScanId, setDeleteScanId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const segmentTrackW = useSharedValue(0);
  const segmentIndex = useSharedValue(0);

  useEffect(() => {
    if (!shareNotice) return;
    const timer = setTimeout(() => setShareNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [shareNotice]);

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

  useFocusEffect(
    useCallback(() => {
      void refreshPublicScans();
      void refreshNotifications();
      void refreshBadgeUnlocks();
    }, []),
  );

  const feedSourceScans = useMemo(() => {
    if (feedMode === "public") {
      return allScans.filter((s) => !s.isPendingBreed && !s.isPrivate);
    }
    return allScans.filter((s) => friendIds.has(s.userId) && !s.isPendingBreed);
  }, [allScans, feedMode, friendIds]);

  const feedSourceBadgeUnlocks = useMemo(() => {
    if (feedMode === "public") return badgeUnlocks;
    return badgeUnlocks.filter(
      (u) => u.userId === currentUser.id || friendIds.has(u.userId),
    );
  }, [badgeUnlocks, currentUser.id, feedMode, friendIds]);

  type ScanFeedEntry = {
    kind: "scan";
    scan: ScanRecord;
    breed: (typeof breeds)[number];
    dogProfile: (typeof dogProfiles)[number] | null;
    user: UserProfile;
    timestamp: number;
  };
  type BadgeFeedEntry = {
    kind: "badge";
    unlock: BadgeUnlock;
    user: UserProfile;
    timestamp: number;
  };
  type FeedEntry = ScanFeedEntry | BadgeFeedEntry;

  const feed = useMemo<FeedEntry[]>(() => {
    const rows: FeedEntry[] = [];
    for (const scan of feedSourceScans) {
      if (!scan.breedId || scan.isPrivate) continue;
      const breed = breeds.find((b) => b.id === scan.breedId);
      if (!breed) continue;
      rows.push({
        kind: "scan",
        scan,
        breed,
        dogProfile: dogProfiles.find((dog) => dog.id === scan.dogProfileId) ?? null,
        user: resolveFeedUser(scan.userId, currentUser, friends, knownUsers),
        timestamp: new Date(scan.scannedAt).getTime(),
      });
    }
    for (const unlock of feedSourceBadgeUnlocks) {
      rows.push({
        kind: "badge",
        unlock,
        user: resolveFeedUser(unlock.userId, currentUser, friends, knownUsers),
        timestamp: new Date(unlock.unlockedAt).getTime(),
      });
    }
    rows.sort((a, b) => b.timestamp - a.timestamp);
    return rows;
  }, [
    breeds,
    currentUser,
    dogProfiles,
    feedSourceBadgeUnlocks,
    feedSourceScans,
    friends,
    knownUsers,
  ]);

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
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            className="relative rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-900"
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={palette.amber} />
            {hasUnreadNotifications ? (
              <View
                className="absolute h-2.5 w-2.5 rounded-full bg-red-500"
                style={{ top: 6, right: 6 }}
              />
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Friends")}
            className="flex-row items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 dark:bg-zinc-900"
          >
            <MaterialCommunityIcons name="account-group-outline" size={18} color={palette.amber} />
            <Text className="text-sm font-semibold text-black dark:text-white">Friends</Text>
            {pendingFriendRequests.length > 0 ? <View className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
          </Pressable>
        </View>
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
            {feed.length} {feedMode === "public" ? "from everyone" : "from friends"}
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
            onPress={() => {
              if (!PILOT_FRIENDS_ENABLED) return;
              setFeedMode("friends");
            }}
            className="z-10 flex-1 items-center justify-center"
            accessibilityRole="button"
            accessibilityState={{ selected: feedMode === "friends", disabled: !PILOT_FRIENDS_ENABLED }}
          >
            <Text
              className={`text-xs font-semibold ${feedMode === "friends" ? "text-black dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}
            >
              Friends
            </Text>
          </Pressable>
        </View>

        {shareNotice ? (
          <View className="mb-3 rounded-2xl bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/30">
            <Text className="text-center text-sm font-medium text-emerald-800 dark:text-emerald-300">{shareNotice}</Text>
          </View>
        ) : null}

        {feed.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-zinc-300 bg-white py-14 dark:border-border dark:bg-card">
            <AppMark size={44} style={{ opacity: 0.85 }} />
            <Text className="mt-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {feedMode === "public"
                ? "No public spots yet. Open Spot to log a breed and start the feed."
                : !PILOT_FRIENDS_ENABLED
                  ? "Friends feed is coming soon. Switch to Public to see everyone's spots."
                  : friends.length === 0
                    ? "Add friends from the Friends button above to see their public spots here."
                    : "When your friends share public spots, they'll show up here."}
            </Text>
          </View>
        ) : (
          feed.map((entry) => {
            if (entry.kind === "badge") {
              const accent = badgeColors[entry.unlock.badge];
              const copy = badgeCopy[entry.unlock.badge];
              return (
                <View
                  key={`badge-${entry.unlock.id}`}
                  className="mb-4 flex-row items-center gap-3 rounded-3xl border px-4 py-3"
                  style={{
                    backgroundColor: `${accent}10`,
                    borderColor: `${accent}55`,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      openUserProfileNavigate(navigation, currentUser.id, entry.user.id)
                    }
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${entry.user.username}'s profile`}
                  >
                    <UserAvatar
                      username={entry.user.username}
                      avatarUrl={entry.user.avatarUrl}
                      size={40}
                    />
                  </Pressable>
                  <View
                    className="items-center justify-center rounded-2xl"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: `${accent}22`,
                      borderWidth: 2,
                      borderColor: accent,
                    }}
                  >
                    <MaterialCommunityIcons name="trophy-variant" size={20} color={accent} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm text-black dark:text-white" numberOfLines={2}>
                      <Text className="font-semibold">{entry.user.username}</Text>
                      <Text className="text-zinc-600 dark:text-zinc-400">{" earned the "}</Text>
                      <Text className="font-semibold" style={{ color: accent }}>
                        {copy.label}
                      </Text>
                      <Text className="text-zinc-600 dark:text-zinc-400">{" badge"}</Text>
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {new Date(entry.unlock.unlockedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            }

            const { scan, breed, dogProfile, user } = entry;
            return (
            <View
              key={scan.id}
              className="mb-4 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none"
            >
              <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
                <Pressable
                  onPress={() => openUserProfileNavigate(navigation, currentUser.id, user.id)}
                  className="min-w-0 flex-1 flex-row items-center gap-3"
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${user.username}'s profile`}
                >
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
                </Pressable>
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
                    onPress={() => {
                      void (async () => {
                        const result = await shareScanCard(scan, breed);
                        if (!result.ok) {
                          Alert.alert("Share failed", result.reason);
                          return;
                        }
                        if (result.method === "download") {
                          setShareNotice("Spot card downloaded to your device");
                        } else {
                          setShareNotice("Share sheet opened");
                        }
                      })();
                    }}
                    className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                    accessibilityLabel="Share spot"
                  >
                    <MaterialCommunityIcons name="share-variant-outline" size={18} color={palette.amber} />
                  </Pressable>
                  {scan.userId === currentUser.id ? (
                    <Pressable
                      onPress={() => setDeleteScanId(scan.id)}
                      className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                      accessibilityLabel="Delete spot"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#b91c1c" />
                    </Pressable>
                  ) : null}
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
                  <View className="items-end gap-2">
                    <RarityBadge rarity={breed.rarity} />
                    <PointsBadge points={scan.pointsAwarded} featured={scan.matchedFeaturedBreed} />
                  </View>
                </View>

                <FeedPostSocialBar scanId={scan.id} />
              </View>
            </View>
            );
          })
        )}
      </View>
      <SpotPhotoEditorModal
        visible={editingScanId !== null && editingUri !== null}
        imageUri={editingUri}
        onClose={closePhotoEditor}
        onSave={handlePhotoSave}
      />
      <ConfirmDialog
        visible={deleteScanId !== null}
        title="Delete this spot?"
        message="This removes the scan from your journal and feed. Stats and badges will update if needed."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteScanId(null)}
        onConfirm={() => {
          const id = deleteScanId;
          setDeleteScanId(null);
          if (id) void deleteSpot(id);
        }}
      />
    </ScrollView>
  );
}
