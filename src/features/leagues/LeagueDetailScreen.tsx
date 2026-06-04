import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { UserAvatar } from "@/components/UserAvatar";
import { openUserProfileNavigate } from "@/components/UsernameLink";
import { rarityColors, rarityHexBorderColors } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { BreedRarity } from "@/types/app";

const RARITY_ORDER: BreedRarity[] = ["common", "uncommon", "rare", "legendary"];

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

export function LeagueDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const leagueId = route.params.leagueId;
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const addLeagueFriendRequest = useSpotterStore((state) => state.addLeagueFriendRequest);
  const leagues = useSpotterStore((state) => state.leagues);
  const scans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);

  const breedRarityById = useMemo(() => {
    const map = new Map<string, BreedRarity>();
    for (const breed of breeds) map.set(breed.id, breed.rarity);
    return map;
  }, [breeds]);

  const league = useMemo(() => leagues.find((item) => item.id === leagueId) ?? null, [leagues, leagueId]);

  /**
   * Per-user, per-rarity scan counts AND total points **scoped to this
   * league's window** — from `league.createdAt` up to `league.endsAt`
   * (clamped to now if the season is still ongoing). Every non-pending
   * scan inside the window contributes its `pointsAwarded` to that user's
   * league total. Members with no in-window scans simply never appear in
   * the map, so the leaderboard fallback renders `0`.
   */
  const { scansByRarityByUser, pointsByUser } = useMemo(() => {
    const rarityCounts = new Map<string, Record<BreedRarity, number>>();
    const points = new Map<string, number>();
    if (!league) return { scansByRarityByUser: rarityCounts, pointsByUser: points };
    const startMs = Date.parse(league.createdAt);
    if (!Number.isFinite(startMs)) return { scansByRarityByUser: rarityCounts, pointsByUser: points };
    const endMs = league.endsAt
      ? Math.min(Date.now(), Date.parse(league.endsAt))
      : Date.now();
    if (!Number.isFinite(endMs)) return { scansByRarityByUser: rarityCounts, pointsByUser: points };

    for (const scan of scans) {
      if (scan.isPendingBreed) continue;
      if (!scan.breedId) continue;
      const rarity = breedRarityById.get(scan.breedId);
      if (!rarity) continue;
      const scanMs = Date.parse(scan.scannedAt);
      if (!Number.isFinite(scanMs)) continue;
      if (scanMs < startMs || scanMs > endMs) continue;

      let counts = rarityCounts.get(scan.userId);
      if (!counts) {
        counts = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
        rarityCounts.set(scan.userId, counts);
      }
      counts[rarity] += 1;
      points.set(scan.userId, (points.get(scan.userId) ?? 0) + (scan.pointsAwarded ?? 0));
    }
    return { scansByRarityByUser: rarityCounts, pointsByUser: points };
  }, [breedRarityById, league, scans]);

  const members = useMemo<Array<{ id: string; username: string; avatarUrl: string | null; city: string; country: string }>>(() => {
    if (!league) return [];
    const friendMembers = friends.slice(0, Math.max(0, league.memberCount - 1));
    return [currentUser, ...friendMembers];
  }, [currentUser, friends, league]);

  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);
  const friendUsernames = useMemo(() => new Set(friends.map((friend) => friend.username.toLowerCase())), [friends]);

  const leaderboard = useMemo(() => {
    return members
      .map((member) => ({
        userId: member.id,
        username: member.username,
        avatarUrl: member.avatarUrl,
        points: pointsByUser.get(member.id) ?? 0,
        rarityCounts:
          scansByRarityByUser.get(member.id) ?? {
            common: 0,
            uncommon: 0,
            rare: 0,
            legendary: 0,
          },
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.username.localeCompare(b.username);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [members, pointsByUser, scansByRarityByUser]);

  if (!league) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-ink">
        <Text className="text-base text-zinc-600 dark:text-zinc-300">League not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50 px-4 pt-4 dark:bg-ink">
      <Text className="mb-3 text-lg font-semibold text-black dark:text-white">Leaderboard</Text>
      {leaderboard.map((entry) => (
        <View
          key={`leader-${entry.userId}`}
          className="mb-3 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card"
        >
          <Pressable
            onPress={() => openUserProfileNavigate(navigation, currentUser.id, entry.userId)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${entry.username}'s profile`}
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <Text className="w-8 text-lg font-semibold text-amber">#{entry.rank}</Text>
            <View
              className="rounded-full"
              style={{ borderWidth: 2, borderColor: "#000" }}
            >
              <UserAvatar username={entry.username} avatarUrl={entry.avatarUrl} />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                className="text-2xl font-semibold text-black dark:text-white"
                numberOfLines={1}
              >
                {entry.username}
              </Text>
              <View className="mt-1.5 flex-row gap-1.5">
                {RARITY_ORDER.map((rarity) => (
                  <View
                    key={`${entry.userId}-${rarity}`}
                    className="items-center justify-center rounded-full"
                    style={{
                      width: 26,
                      height: 26,
                      backgroundColor: rarityColors[rarity],
                      borderWidth: 1.5,
                      borderColor: rarityHexBorderColors[rarity],
                    }}
                    accessibilityLabel={`${entry.rarityCounts[rarity]} ${rarity} scans`}
                  >
                    <Text className="text-[11px] font-bold text-white">
                      {entry.rarityCounts[rarity]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Pressable>
          <Text className="font-semibold text-black dark:text-white">{entry.points} pts</Text>
        </View>
      ))}

      <Text className="mb-3 mt-6 text-lg font-semibold text-black dark:text-white">Members</Text>
      {members.map((member) => (
        <View
          key={`member-${member.id}`}
          className="mb-3 flex-row items-center gap-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card"
        >
          <Pressable
            onPress={() => openUserProfileNavigate(navigation, currentUser.id, member.id)}
            accessibilityRole="link"
            accessibilityLabel={`Open ${member.username}'s profile`}
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <UserAvatar username={member.username} avatarUrl={member.avatarUrl} />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-black dark:text-white">{member.username}</Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                {member.city && member.country ? `${member.city}, ${member.country}` : "Location not set"}
              </Text>
            </View>
          </Pressable>
          {member.id !== currentUser.id ? (
            friendIds.has(member.id) || friendUsernames.has(member.username.toLowerCase()) ? (
              <View className="rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/30">
                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Friends</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => addLeagueFriendRequest(member.username)}
                className="rounded-full bg-amber px-3 py-1.5 active:opacity-90"
              >
                <Text className="text-xs font-semibold text-white">Add friend</Text>
              </Pressable>
            )
          ) : null}
        </View>
      ))}
      <View className="h-10" />
    </ScrollView>
  );
}
