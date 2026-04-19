import { useMemo } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppMark } from "@/components/AppMark";
import { PointsBadge } from "@/components/PointsBadge";
import { RarityBadge } from "@/components/RarityBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { FeedPostSocialBar } from "@/features/social/FeedPostSocialBar";
import { deleteSpot } from "@/features/spot/spotService";
import { shareScanCard } from "@/features/social/shareScanCard";
import { getStartOfCurrentWeek } from "@/lib/utils/dates";
import { palette, rarityColors } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";

const rankAccent = ["#f59e0b", "#94a3b8", "#b45309"];

export function SocialScreen() {
  const navigation = useNavigation<any>();
  const allScans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);

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

  const feed = useMemo(() => {
    const rows: {
      scan: (typeof allScans)[number];
      breed: (typeof breeds)[number];
      dogProfile: (typeof dogProfiles)[number] | null;
      user: typeof currentUser;
    }[] = [];
    for (const scan of scans) {
      if (!scan.breedId || scan.isPrivate) continue;
      const breed = breeds.find((b) => b.id === scan.breedId);
      if (!breed) continue;
      rows.push({
        scan,
        breed,
        dogProfile: dogProfiles.find((dog) => dog.id === scan.dogProfileId) ?? null,
        user: currentUser,
      });
    }
    return rows;
  }, [breeds, currentUser, dogProfiles, scans]);

  const weekScanCount = useMemo(() => {
    const start = getStartOfCurrentWeek();
    return scans.filter((s) => new Date(s.scannedAt) >= start).length;
  }, [scans]);

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      {/* Hero */}
      <View className="px-4 pb-6 pt-14">
        <View className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-card dark:shadow-none">
          <View
            className="border-b border-zinc-100 px-5 pb-5 pt-6 dark:border-border"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center gap-4">
                <UserAvatar
                  username={currentUser.username}
                  avatarUrl={currentUser.avatarUrl}
                  size={72}
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-amber">Your profile</Text>
                  <Text className="mt-1 text-xl font-bold text-black dark:text-white" numberOfLines={1}>
                    {currentUser.username}
                  </Text>
                  <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {weekScanCount} scan{weekScanCount === 1 ? "" : "s"} this week · {friends.length} friend
                    {friends.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigation.navigate("Friends")}
                className="ml-2 flex-row items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 dark:bg-zinc-900"
              >
                <MaterialCommunityIcons name="account-group-outline" size={18} color={palette.amber} />
                <Text className="text-sm font-semibold text-black dark:text-white">Friends</Text>
              </Pressable>
            </View>
          </View>

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
            {feed.length} public
          </Text>
        </View>
        <Text className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Only public spots appear here. React with emoji, comment below a post, or delete from here or Profile → Your spots.
        </Text>

        {feed.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-zinc-300 bg-white py-14 dark:border-border dark:bg-card">
            <AppMark size={44} style={{ opacity: 0.85 }} />
            <Text className="mt-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {scans.some((s) => s.breedId && !s.isPendingBreed && s.isPrivate)
                ? "All your recent spots are private — turn off “Keep private” when saving, or change privacy in Profile."
                : "No scans to show yet. Open Spot and log your first breed!"}
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
                  <PointsBadge points={scan.pointsAwarded} featured={scan.matchedFeaturedBreed} />
                </View>
              </View>

              <Image source={{ uri: scan.photoUrl }} className="aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900" />

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

                <View className="mt-3 h-px w-full bg-zinc-100 dark:bg-border" />

                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: rarityColors[breed.rarity] }}
                    />
                    <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {breed.rarity.charAt(0).toUpperCase() + breed.rarity.slice(1)} breed
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => shareScanCard(scan, breed)}
                    className="flex-row items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-border dark:bg-zinc-900"
                  >
                    <MaterialCommunityIcons name="share-variant-outline" size={16} color={palette.amber} />
                    <Text className="text-sm font-semibold text-black dark:text-white">Share</Text>
                  </Pressable>
                </View>

                <FeedPostSocialBar scanId={scan.id} />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
