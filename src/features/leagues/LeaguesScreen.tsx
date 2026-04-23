import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";

import { UserAvatar } from "@/components/UserAvatar";
import {
  LEAGUE_CAPACITY_PRESETS,
  leagueInviteUrl,
  type LeagueDurationPreset,
} from "@/constants/leagues";
import { badgeColors } from "@/constants/theme";
import type { League } from "@/types/app";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const tabs = ["Friends", "Area", "Global"] as const;

const DURATION_OPTIONS: { id: LeagueDurationPreset; label: string }[] = [
  { id: "ongoing", label: "Ongoing" },
  { id: "1w", label: "1 week" },
  { id: "4w", label: "4 weeks" },
  { id: "12w", label: "12 weeks" },
  { id: "custom", label: "Custom" },
];

function formatLeagueEnds(endsAt: string | null): string {
  if (!endsAt) return "No end date";
  try {
    const d = new Date(endsAt);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export function LeaguesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Friends");
  const [leagueName, setLeagueName] = useState("");
  const [maxMembers, setMaxMembers] = useState<number>(10);
  const [duration, setDuration] = useState<LeagueDurationPreset>("ongoing");
  const [customDays, setCustomDays] = useState("14");
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState("Unknown");
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const leagues = useSpotterStore((state) => state.leagues);
  const badges = useSpotterStore((state) => state.badges);
  const weeklyPoints = useSpotterStore((state) => state.weeklyPoints);
  const createLeague = useSpotterStore((state) => state.createLeague);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const leaderboard = useMemo(() => {
    const base = [
      { userId: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl, weeklyPoints, badges },
      ...friends.map((friend, index) => ({
        userId: friend.id,
        username: friend.username,
        avatarUrl: friend.avatarUrl,
        weeklyPoints: Math.max(weeklyPoints - (index + 1) * 3, 2),
        badges: badges.slice(0, Math.max(1, badges.length - index - 1)),
      })),
    ].sort((a, b) => b.weeklyPoints - a.weeklyPoints);

    return base.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [badges, currentUser, friends, weeklyPoints]);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status === "granted" ? "Precise (10km radius)" : "City fallback");
  };

  const submitCreateLeague = () => {
    const trimmed = leagueName.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your friends league a name.");
      return;
    }
    const daysNum = Math.max(1, Math.min(365, parseInt(customDays, 10) || 14));
    createLeague({
      name: trimmed,
      maxMembers,
      duration,
      customDays: duration === "custom" ? daysNum : undefined,
    });
    const fresh = useSpotterStore.getState().leagues[0];
    const url = fresh ? leagueInviteUrl(fresh.inviteCode) : "";
    setLeagueName("");
    setDuration("ongoing");
    setMaxMembers(10);
    setCustomDays("14");
    if (fresh && url) {
      const endsLine = fresh.endsAt ? `\nEnds: ${formatLeagueEnds(fresh.endsAt)}` : "";
      Alert.alert(
        "League created",
        `Invite link:\n${url}\n\nCode: ${fresh.inviteCode}\nCapacity: ${fresh.maxMembers}${endsLine}`,
        [
          {
            text: "Copy link",
            onPress: () => {
              void copyText(url);
            },
          },
          { text: "OK" },
        ],
      );
    }
  };

  const shareLeagueInvite = async (league: League) => {
    const url = leagueInviteUrl(league.inviteCode);
    try {
      await Share.share({
        title: `Join ${league.name}`,
        message: `Join "${league.name}" on Spotter (${league.memberCount}/${league.maxMembers} members). ${url}`,
        url,
      });
    } catch {
      /* user dismissed */
    }
  };

  const copyLeagueInvite = async (league: League) => {
    const copied = await copyText(leagueInviteUrl(league.inviteCode));
    if (!copied) {
      Alert.alert("Copy unavailable", "Use Share to send the invite link.");
      return;
    }
    setCopiedLeagueId(league.id);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => {
      setCopiedLeagueId((current) => (current === league.id ? null : current));
    }, 1600);
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <Text className="text-4xl font-black text-black dark:text-white">Leagues</Text>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Weekly leaderboards reset every Monday at 00:00 AEST. Friends leagues can cap members and end on a set date.
      </Text>

      <View className="mt-5 flex-row rounded-full bg-zinc-100 p-1 dark:bg-card">
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            className={`flex-1 rounded-full px-3 py-3 ${activeTab === tab ? "bg-amber" : ""}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`text-center font-semibold ${activeTab === tab ? "text-white" : "text-zinc-600 dark:text-zinc-400"}`}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "Friends" ? (
        <View className="mt-6">
          <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-border dark:bg-card">
            <Text className="text-lg font-semibold text-black dark:text-white">Create a friends league</Text>
            <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
              Set capacity and how long the season runs. Everyone joins with the invite link or code.
            </Text>

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</Text>
            <TextInput
              value={leagueName}
              onChangeText={setLeagueName}
              placeholder="e.g. Saturday Park Crew"
              placeholderTextColor="#71717a"
              className="mt-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Capacity</Text>
            <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Max members (you count as one).</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {LEAGUE_CAPACITY_PRESETS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setMaxMembers(n)}
                  className={`rounded-full px-3 py-2 ${maxMembers === n ? "bg-amber" : "bg-zinc-100 dark:bg-zinc-800"}`}
                >
                  <Text className={`text-sm font-semibold ${maxMembers === n ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={String(maxMembers)}
              onChangeText={(t) => {
                const v = parseInt(t.replace(/\D/g, ""), 10);
                if (!Number.isNaN(v)) setMaxMembers(Math.min(500, Math.max(2, v)));
                else if (t === "") setMaxMembers(2);
              }}
              keyboardType="number-pad"
              placeholder="Custom max"
              placeholderTextColor="#71717a"
              className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Duration</Text>
            <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">When the league “season” stops accepting weekly scores.</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setDuration(opt.id)}
                  className={`rounded-full px-3 py-2 ${duration === opt.id ? "bg-amber" : "bg-zinc-100 dark:bg-zinc-800"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${duration === opt.id ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {duration === "custom" ? (
              <View className="mt-3">
                <Text className="text-xs text-zinc-600 dark:text-zinc-400">Length in days (1–365)</Text>
                <TextInput
                  value={customDays}
                  onChangeText={setCustomDays}
                  keyboardType="number-pad"
                  placeholder="14"
                  placeholderTextColor="#71717a"
                  className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
                />
              </View>
            ) : null}

            <Pressable className="mt-5 rounded-2xl bg-amber px-4 py-3 active:opacity-90" onPress={submitCreateLeague}>
              <Text className="text-center font-semibold text-white">Create league</Text>
            </Pressable>
          </View>

          <Text className="mb-3 mt-8 text-lg font-semibold text-black dark:text-white">Your leagues</Text>
          {leagues.map((league) => (
            <Pressable
              key={league.id}
              onPress={() =>
                navigation.navigate("LeagueDetail", {
                  leagueId: league.id,
                  leagueName: league.name,
                  memberCount: league.memberCount,
                  maxMembers: league.maxMembers,
                })
              }
              className="mb-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 active:opacity-95 dark:border-border dark:bg-card"
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-black dark:text-white">{league.name}</Text>
                  <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {league.memberCount} / {league.maxMembers} members
                    {league.endsAt ? ` · ends ${formatLeagueEnds(league.endsAt)}` : ""}
                  </Text>
                </View>
              </View>
              <View className="mt-3 rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-900">
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Invite code</Text>
                <Text selectable className="mt-1 font-mono text-sm font-semibold text-black dark:text-white">
                  {league.inviteCode}
                </Text>
                <Text className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Link</Text>
                <Text selectable className="mt-1 text-xs leading-5 text-zinc-700 dark:text-zinc-300" numberOfLines={2}>
                  {leagueInviteUrl(league.inviteCode)}
                </Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  onPress={() => void copyLeagueInvite(league)}
                  accessibilityRole="button"
                  accessibilityLabel={`Copy invite link for ${league.name}`}
                  className="h-11 flex-1 items-center justify-center rounded-2xl border border-zinc-200 bg-white active:opacity-90 dark:border-border dark:bg-zinc-950"
                >
                  <Animated.View
                    layout={LinearTransition.springify().stiffness(260).damping(24)}
                    className="h-5 flex-row items-center justify-center gap-1.5"
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                  >
                    {copiedLeagueId === league.id ? (
                      <Animated.View
                        entering={FadeIn.duration(140)}
                        exiting={FadeOut.duration(140)}
                        className="h-5 flex-row items-center gap-1.5"
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <MaterialCommunityIcons name="check-circle" size={16} color="#16a34a" />
                        <Text numberOfLines={1} className="text-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          Link copied
                        </Text>
                      </Animated.View>
                    ) : (
                      <Animated.View
                        entering={FadeIn.duration(140)}
                        exiting={FadeOut.duration(140)}
                        className="h-5 flex-row items-center gap-1.5"
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <MaterialCommunityIcons name="link-variant" size={16} color="#3f3f46" />
                        <Text numberOfLines={1} className="text-center text-sm font-semibold text-black dark:text-white">
                          Copy invite
                        </Text>
                      </Animated.View>
                    )}
                  </Animated.View>
                </Pressable>
                <Pressable
                  onPress={() => void shareLeagueInvite(league)}
                  accessibilityRole="button"
                  accessibilityLabel={`Share invite for ${league.name}`}
                  className="h-11 flex-1 items-center justify-center rounded-2xl bg-amber active:opacity-90"
                >
                  <View
                    className="h-5 flex-row items-center justify-center gap-1.5"
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialCommunityIcons name="share-variant" size={16} color="#ffffff" />
                    <Text numberOfLines={1} className="text-center text-sm font-semibold text-white">
                      Share invite
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {activeTab === "Area" ? (
        <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-border dark:bg-card">
          <Text className="text-lg font-semibold text-black dark:text-white">Area leaderboard</Text>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Location status: {locationStatus}. The backend function will rank users inside a 10km radius and fall back to city-level when precise access is denied.
          </Text>
          <Pressable onPress={requestLocation} className="mt-4 rounded-2xl bg-amber px-4 py-3">
            <Text className="text-center font-semibold text-white">Request location</Text>
          </Pressable>
        </View>
      ) : null}

      {activeTab !== "Friends" ? (
        <View className="mt-6">
          {leaderboard.map((entry) => (
            <View key={entry.userId} className="mb-3 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card">
              <View className="flex-row items-center gap-3">
                <Text className="w-8 text-lg font-semibold text-amber">#{entry.rank}</Text>
                <UserAvatar username={entry.username} avatarUrl={entry.avatarUrl} />
                <View>
                  <Text className="font-semibold text-black dark:text-white">{entry.username}</Text>
                  <View className="mt-2 flex-row gap-1">
                    {entry.badges.slice(0, 4).map((badge) => (
                      <View key={badge} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: badgeColors[badge] }} />
                    ))}
                  </View>
                </View>
              </View>
              <Text className="font-semibold text-black dark:text-white">{entry.weeklyPoints} pts</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View className="h-20" />
    </ScrollView>
  );
}
