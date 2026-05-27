import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { UserAvatar } from "@/components/UserAvatar";
import { openUserProfileNavigate } from "@/components/UsernameLink";
import { badgeColors } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { useSpotterStore } from "@/store/useSpotterStore";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

export function LeagueDetailScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const leagueId = route.params.leagueId;
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const addLeagueFriendRequest = useSpotterStore((state) => state.addLeagueFriendRequest);
  const leagues = useSpotterStore((state) => state.leagues);
  const badges = useSpotterStore((state) => state.badges);
  const weeklyPoints = useSpotterStore((state) => state.weeklyPoints);

  const league = useMemo(() => leagues.find((item) => item.id === leagueId) ?? null, [leagues, leagueId]);

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
        badges: member.id === currentUser.id ? badges : [],
        weeklyPoints: member.id === currentUser.id ? weeklyPoints : 0,
      }))
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [badges, currentUser.id, members, weeklyPoints]);

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
            <UserAvatar username={entry.username} avatarUrl={entry.avatarUrl} />
            <View>
              <Text className="font-semibold text-black dark:text-white">{entry.username}</Text>
              <View className="mt-2 flex-row gap-1">
                {entry.badges.slice(0, 4).map((badge) => (
                  <View key={`${entry.userId}-${badge}`} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: badgeColors[badge] }} />
                ))}
              </View>
            </View>
          </Pressable>
          <Text className="font-semibold text-black dark:text-white">{entry.weeklyPoints} pts</Text>
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
