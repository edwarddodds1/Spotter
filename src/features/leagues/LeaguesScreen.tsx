import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { ComingSoonCard } from "@/components/ComingSoonCard";
import { SegmentedSlider, type SegmentOption } from "@/components/SegmentedSlider";
import { openUserProfileNavigate } from "@/components/UsernameLink";
import { UserAvatar } from "@/components/UserAvatar";
import { PILOT_SOCIAL_ENABLED } from "@/lib/pilotFeatures";
import {
  LEAGUE_CAPACITY_PRESETS,
  leagueInviteUrl,
  type LeagueDurationPreset,
} from "@/constants/leagues";
import { FEATURED_MULTIPLIER } from "@/constants/app";
import { RARITY_POINTS } from "@/constants/breeds";
import { refreshPublicScans } from "@/lib/syncPublicScans";
import { getStartOfCurrentWeek } from "@/lib/utils/dates";
import {
  medalColorForRank,
  rarityColors,
  rarityHexBorderColors,
} from "@/constants/theme";
import type { BreedRarity, League, ScanRecord } from "@/types/app";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

/**
 * Area leaderboards depend on richer map / geofencing UX that isn't ready yet,
 * so the tab is hidden for now. Re-add "Area" here when the location-based
 * ranking experience is brought back.
 */
const tabs = ["Friends", "Global"] as const;

type ScopeId = (typeof tabs)[number];

const SCOPE_OPTIONS: readonly SegmentOption<ScopeId>[] = [
  { id: "Friends", label: "Friends", icon: "account-group" },
  { id: "Global", label: "Global", icon: "earth" },
];

const RARITY_ORDER: BreedRarity[] = ["common", "uncommon", "rare", "legendary"];

const DURATION_OPTIONS: { id: LeagueDurationPreset; label: string }[] = [
  { id: "ongoing", label: "Ongoing" },
  { id: "1w", label: "1 week" },
  { id: "4w", label: "4 weeks" },
  { id: "12w", label: "12 weeks" },
  { id: "custom", label: "Custom" },
];

type LeaderboardRange = "all" | "year" | "month" | "week";

const RANGE_OPTIONS: readonly SegmentOption<LeaderboardRange>[] = [
  { id: "all", label: "All time" },
  { id: "year", label: "Year" },
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
];

/**
 * Inclusive start-of-range timestamp (ms) used to filter `scan.scannedAt`.
 * `all` returns 0 (everything in). Year/Month/Week align to the current
 * local calendar year/month/ISO-style week (week starts Monday).
 */
function rangeStartMs(range: LeaderboardRange): number {
  if (range === "all") return 0;
  const now = new Date();
  if (range === "year") return new Date(now.getFullYear(), 0, 1).getTime();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  return start.getTime();
}

/**
 * The PRIOR comparable window used to compute the green/red points delta
 * shown next to each leaderboard row. For All-time we fall back to a rolling
 * 7-day comparison ("last 7 days vs the prior 7 days") so users still get a
 * sense of recent momentum even though "all time" has no real previous window.
 */
function previousRangeBounds(range: LeaderboardRange): { startMs: number; endMs: number } {
  const now = new Date();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  if (range === "all" || range === "week") {
    if (range === "all") {
      const endMs = Date.now() - WEEK_MS;
      return { startMs: endMs - WEEK_MS, endMs };
    }
    const day = now.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).getTime();
    return { startMs: startOfThisWeek - WEEK_MS, endMs: startOfThisWeek };
  }
  if (range === "year") {
    return {
      startMs: new Date(now.getFullYear() - 1, 0, 1).getTime(),
      endMs: new Date(now.getFullYear(), 0, 1).getTime(),
    };
  }
  return {
    startMs: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
    endMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
  };
}

/**
 * Aggregate per-user totals for every non-pending scan whose `breedId`
 * resolves to a known rarity and whose `scannedAt` falls in `[startMs, endMs)`.
 * Returns total points, total scan count, and a per-rarity scan breakdown
 * (used to render the small coloured dots next to each username).
 */
function aggregateScansInRange(
  scans: ScanRecord[],
  breedRarityById: Map<string, BreedRarity>,
  startMs: number,
  endMs: number = Number.POSITIVE_INFINITY,
): {
  points: Map<string, number>;
  totalScans: Map<string, number>;
  rarityCounts: Map<string, Record<BreedRarity, number>>;
} {
  const points = new Map<string, number>();
  const totalScans = new Map<string, number>();
  const rarityCounts = new Map<string, Record<BreedRarity, number>>();
  const constrained = startMs > 0 || endMs !== Number.POSITIVE_INFINITY;
  for (const scan of scans) {
    if (scan.isPendingBreed) continue;
    if (!scan.breedId) continue;
    const rarity = breedRarityById.get(scan.breedId);
    if (!rarity) continue;
    if (constrained) {
      const ts = Date.parse(scan.scannedAt);
      if (!Number.isFinite(ts)) continue;
      if (ts < startMs || ts >= endMs) continue;
    }
    points.set(scan.userId, (points.get(scan.userId) ?? 0) + (scan.pointsAwarded ?? 0));
    totalScans.set(scan.userId, (totalScans.get(scan.userId) ?? 0) + 1);
    let bucket = rarityCounts.get(scan.userId);
    if (!bucket) {
      bucket = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
      rarityCounts.set(scan.userId, bucket);
    }
    bucket[rarity] += 1;
  }
  return { points, totalScans, rarityCounts };
}

const ZERO_RARITY_COUNTS: Record<BreedRarity, number> = {
  common: 0,
  uncommon: 0,
  rare: 0,
  legendary: 0,
};

/**
 * Source colours kept for the legacy code path; new render sites should call
 * `medalColorForRank(rank, isDark)` so silver brightens automatically on dark
 * mode. Re-derived per render below from the live theme.
 */
function buildMedalByRank(isDark: boolean): Record<number, { color: string; iconColor: string }> {
  return {
    1: { color: medalColorForRank(1, isDark), iconColor: "#ffffff" },
    2: { color: medalColorForRank(2, isDark), iconColor: isDark ? "#0f172a" : "#ffffff" },
    3: { color: medalColorForRank(3, isDark), iconColor: "#ffffff" },
  };
}

/**
 * Deterministic per-league accent + icon. Picked by hashing `league.id` so
 * the same league always gets the same tile colour across launches.
 */
const LEAGUE_ACCENTS: Array<{
  bg: string;
  color: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { bg: "#dcfce7", color: "#16a34a", icon: "pine-tree" },
  { bg: "#f3e8ff", color: "#9333ea", icon: "paw" },
  { bg: "#dbeafe", color: "#2563eb", icon: "image-filter-hdr" },
  { bg: "#ffedd5", color: "#ea580c", icon: "dog-side" },
  { bg: "#fef9c3", color: "#ca8a04", icon: "bone" },
];

function leagueAccent(leagueId: string): (typeof LEAGUE_ACCENTS)[number] {
  let h = 0;
  for (let i = 0; i < leagueId.length; i++) h = (h * 31 + leagueId.charCodeAt(i)) >>> 0;
  return LEAGUE_ACCENTS[h % LEAGUE_ACCENTS.length];
}

/** "Jun 3, 2026" — locale long-ish form used on league cards. */
function formatLongDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

/**
 * Season progress meter for a league. Returns a 0..1 ratio, a human-readable
 * "X weeks left" / "X days left" / "Ended" label, and a flag for the special
 * "Ongoing" case (open-ended leagues with no `endsAt`).
 */
function seasonProgress(createdAt: string, endsAt: string | null): {
  progress: number;
  label: string;
  ended: boolean;
  ongoing: boolean;
} {
  const startMs = Date.parse(createdAt);
  if (!endsAt) return { progress: 0, label: "Ongoing", ended: false, ongoing: true };
  if (!Number.isFinite(startMs)) {
    return { progress: 0, label: "Ongoing", ended: false, ongoing: true };
  }
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(endMs)) {
    return { progress: 0, label: "Ongoing", ended: false, ongoing: true };
  }
  const nowMs = Date.now();
  if (nowMs >= endMs) return { progress: 1, label: "Ended", ended: true, ongoing: false };
  const ratio = Math.max(0, Math.min(1, (nowMs - startMs) / (endMs - startMs)));
  const daysLeft = Math.max(1, Math.ceil((endMs - nowMs) / 86_400_000));
  const weeksLeft = Math.floor(daysLeft / 7);
  let label: string;
  if (daysLeft >= 14) label = `${weeksLeft} weeks left`;
  else if (daysLeft === 1) label = "1 day left";
  else label = `${daysLeft} days left`;
  return { progress: ratio, label, ended: false, ongoing: false };
}

/** "13/5" — short day/month with no leading zeros. */
function formatShortDayMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Whole days remaining from now to `endsAt`, never negative. */
function daysLeftUntil(endsAt: string): number {
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return 0;
  const diffMs = end - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 86_400_000);
}

/**
 * Compact league date summary:
 *   - Ongoing leagues  → "from 13/5"
 *   - Fixed-window     → "13/5 – 20/5 (5 days left)" or "13/5 – 20/5 (ended)".
 */
function formatLeagueWindow(createdAt: string, endsAt: string | null): string {
  const start = formatShortDayMonth(createdAt);
  if (!endsAt) return `from ${start}`;
  const end = formatShortDayMonth(endsAt);
  const days = daysLeftUntil(endsAt);
  if (days <= 0) return `${start} – ${end} (ended)`;
  return `${start} – ${end} (${days} day${days === 1 ? "" : "s"} left)`;
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

function LeaguesPilotComingSoon() {
  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      <Text className="text-4xl font-black text-black dark:text-white">Leagues</Text>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Compete with friends on weekly points — arriving in a future update.
      </Text>
      <ComingSoonCard
        title="Leagues are coming soon"
        body="The pilot focuses on spotting and your Dogdex. Invite friends and league seasons will land in v2."
      />
    </ScrollView>
  );
}

/**
 * @refresh reset
 * Leaderboard uses RarityDotsRow (not titleForScans). Bump LEAGUES_UI_REV after
 * refactors so Metro invalidates any stale fast-refresh bundle.
 */
const LEAGUES_UI_REV = 4;

function LeaguesScreenContent() {
  void LEAGUES_UI_REV;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Friends");
  const [leagueName, setLeagueName] = useState("");
  const [maxMembers, setMaxMembers] = useState<number>(10);
  /**
   * Mirror of `maxMembers` as raw text so the user can type intermediate
   * values like "1" on the way to "15" without the input snapping to the
   * minimum on every keystroke. We only clamp on blur / submit.
   */
  const [maxMembersText, setMaxMembersText] = useState<string>("10");
  const [duration, setDuration] = useState<LeagueDurationPreset>("ongoing");
  const [customDays, setCustomDays] = useState("14");
  const [showCreate, setShowCreate] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [range, setRange] = useState<LeaderboardRange>("all");
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const knownUsers = useSpotterStore((state) => state.knownUsers);
  const leagues = useSpotterStore((state) => state.leagues);
  const scans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const themeMode = useSpotterStore((state) => state.themeMode);
  const isDark = themeMode === "dark";
  const medalByRank = useMemo(() => buildMedalByRank(isDark), [isDark]);
  const createLeague = useSpotterStore((state) => state.createLeague);
  const inviteFriendsToLeague = useSpotterStore((state) => state.inviteFriendsToLeague);

  const breedRarityById = useMemo(() => {
    const map = new Map<string, BreedRarity>();
    for (const breed of breeds) map.set(breed.id, breed.rarity);
    return map;
  }, [breeds]);

  /**
   * Two parallel aggregates over the visible scan set:
   * - `windowed`        — points, scan count, and per-rarity counts inside the
   *                       active `range`. Drives the row points/dogs columns
   *                       and the small coloured dots next to each username.
   * - `previousWindow`  — points only, scoped to the prior comparable window
   *                       so we can render a green/red `+/-N` delta per row.
   */
  const aggregates = useMemo(() => {
    const windowed = aggregateScansInRange(scans, breedRarityById, rangeStartMs(range));
    const prev = previousRangeBounds(range);
    const previousWindow = aggregateScansInRange(scans, breedRarityById, prev.startMs, prev.endMs);
    return { windowed, previousWindow };
  }, [breedRarityById, scans, range]);

  /**
   * Pull the latest public scans whenever the Leagues screen comes into
   * focus so the Global leaderboard reflects activity from every user who
   * has posted to the public feed since the last refresh.
   */
  useFocusEffect(
    useCallback(() => {
      void refreshPublicScans();
    }, []),
  );

  /**
   * Build both leaderboards in a single pass:
   * - `globalLeaderboard`: every user we've seen a scan from. `currentUser`,
   *   `friends`, and `knownUsers` are all considered. Any scan author missing
   *   from those three lists is still ranked (with a Spotter placeholder
   *   username) so they never drop off the board.
   * - `friendsLeaderboard`: scoped to the current user + accepted friends.
   *
   * Each entry carries the windowed `points`, `dogs` (scans in range), and
   * `delta` vs the previous comparable window.
   */
  const { globalLeaderboard, friendsLeaderboard } = useMemo(() => {
    const profileById = new Map<string, { id: string; username: string; avatarUrl: string | null }>();
    profileById.set(currentUser.id, {
      id: currentUser.id,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
    });
    for (const f of friends) {
      profileById.set(f.id, { id: f.id, username: f.username, avatarUrl: f.avatarUrl });
    }
    for (const u of knownUsers) {
      if (!profileById.has(u.id)) {
        profileById.set(u.id, { id: u.id, username: u.username, avatarUrl: u.avatarUrl });
      }
    }
    for (const userId of aggregates.windowed.points.keys()) {
      if (!profileById.has(userId)) {
        profileById.set(userId, { id: userId, username: "Spotter", avatarUrl: null });
      }
    }

    const friendIds = new Set<string>([currentUser.id, ...friends.map((f) => f.id)]);

    const sortAndRank = (filterIds?: Set<string>) => {
      const base = Array.from(profileById.values())
        .filter((p) => !filterIds || filterIds.has(p.id))
        .map((profile) => {
          const points = aggregates.windowed.points.get(profile.id) ?? 0;
          const prevPoints = aggregates.previousWindow.points.get(profile.id) ?? 0;
          return {
            userId: profile.id,
            username: profile.username,
            avatarUrl: profile.avatarUrl,
            points,
            dogs: aggregates.windowed.totalScans.get(profile.id) ?? 0,
            delta: points - prevPoints,
            rarityCounts:
              aggregates.windowed.rarityCounts.get(profile.id) ?? ZERO_RARITY_COUNTS,
          };
        });
      base.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.username.localeCompare(b.username);
      });
      return base.map((entry, index) => ({ ...entry, rank: index + 1 }));
    };

    return {
      globalLeaderboard: sortAndRank(),
      friendsLeaderboard: sortAndRank(friendIds),
    };
  }, [currentUser, friends, knownUsers, aggregates]);

  const activeLeaderboard = activeTab === "Friends" ? friendsLeaderboard : globalLeaderboard;
  const youEntry = activeLeaderboard.find((entry) => entry.userId === currentUser.id);

  /**
   * Per-league stats used by the horizontal "Your leagues" cards:
   *   - `myPoints` : current user's points scored inside the league's window.
   *   - `myRank`   : current user's rank among the league's members.
   *   - `totalRanked` : league member count (denominator shown as "X / Y").
   *
   * Mirrors `LeagueDetailScreen`'s membership rule (currentUser + first N-1
   * friends) so the rank shown on the card matches the leaderboard inside.
   */
  const leagueStats = useMemo(() => {
    const map = new Map<string, { myPoints: number; myRank: number; totalRanked: number }>();
    for (const league of leagues) {
      const startMs = Date.parse(league.createdAt);
      const endMs = league.endsAt
        ? Math.min(Date.now(), Date.parse(league.endsAt))
        : Date.now();
      const memberIds = [
        currentUser.id,
        ...friends.slice(0, Math.max(0, league.memberCount - 1)).map((f) => f.id),
      ];
      const memberPoints = new Map<string, number>();
      for (const id of memberIds) memberPoints.set(id, 0);
      if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
        for (const scan of scans) {
          if (scan.isPendingBreed) continue;
          if (!scan.breedId) continue;
          if (!memberPoints.has(scan.userId)) continue;
          const ts = Date.parse(scan.scannedAt);
          if (!Number.isFinite(ts)) continue;
          if (ts < startMs || ts > endMs) continue;
          memberPoints.set(scan.userId, (memberPoints.get(scan.userId) ?? 0) + (scan.pointsAwarded ?? 0));
        }
      }
      const sorted = Array.from(memberPoints.entries()).sort((a, b) => b[1] - a[1]);
      const myRank = sorted.findIndex(([id]) => id === currentUser.id) + 1;
      map.set(league.id, {
        myPoints: memberPoints.get(currentUser.id) ?? 0,
        myRank: myRank || memberIds.length,
        totalRanked: league.memberCount,
      });
    }
    return map;
  }, [leagues, currentUser.id, friends, scans]);

  /**
   * "Top dogs this week" — same aggregation as `TopDogsScreen` (scans grouped
   * by `dogProfileId`, restricted to this calendar week starting Monday). The
   * Leagues page only renders the top 5; users can tap "Full leaderboard" to
   * navigate to the dedicated screen.
   */
  const topDogsThisWeek = useMemo(() => {
    const weekStart = getStartOfCurrentWeek();
    const weeklyCounts = new Map<string, number>();
    for (const scan of scans) {
      if (!scan.dogProfileId) continue;
      if (new Date(scan.scannedAt) < weekStart) continue;
      weeklyCounts.set(scan.dogProfileId, (weeklyCounts.get(scan.dogProfileId) ?? 0) + 1);
    }
    return [...dogProfiles]
      .map((dog) => ({ ...dog, weeklyScans: weeklyCounts.get(dog.id) ?? 0 }))
      .sort((a, b) =>
        b.weeklyScans === a.weeklyScans ? b.totalScans - a.totalScans : b.weeklyScans - a.weeklyScans,
      )
      .slice(0, 5);
  }, [dogProfiles, scans]);

  const submitCreateLeague = () => {
    const trimmed = leagueName.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your friends league a name.");
      return;
    }
    const daysNum = Math.max(1, Math.min(365, parseInt(customDays, 10) || 14));
    const parsedMax = parseInt(maxMembersText, 10);
    const cap = Math.min(
      500,
      Math.max(2, Number.isNaN(parsedMax) ? maxMembers || 10 : parsedMax),
    );
    createLeague({
      name: trimmed,
      maxMembers: cap,
      duration,
      customDays: duration === "custom" ? daysNum : undefined,
    });
    const fresh = useSpotterStore.getState().leagues[0];
    const url = fresh ? leagueInviteUrl(fresh.inviteCode) : "";
    const invitedIds = selectedInviteIds;
    if (fresh && invitedIds.length > 0) {
      inviteFriendsToLeague({
        leagueId: fresh.id,
        leagueName: fresh.name,
        friendUserIds: invitedIds,
      });
    }
    setLeagueName("");
    setDuration("ongoing");
    setMaxMembers(10);
    setMaxMembersText("10");
    setCustomDays("14");
    setSelectedInviteIds([]);
    setShowCreate(false);
    if (fresh && url) {
      const endsLine = `\nDates: ${formatLeagueWindow(fresh.createdAt, fresh.endsAt)}`;
      const invitedLine = invitedIds.length > 0
        ? `\nInvited: ${invitedIds.length} friend${invitedIds.length === 1 ? "" : "s"}`
        : "";
      Alert.alert(
        "League created",
        `Invite link:\n${url}\n\nCode: ${fresh.inviteCode}\nCapacity: ${fresh.maxMembers}${endsLine}${invitedLine}`,
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

  const toggleInviteSelection = (friendId: string) => {
    setSelectedInviteIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setSelectedInviteIds([]);
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

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-4xl font-black text-black dark:text-white">Leagues</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowRules(true)}
            accessibilityRole="button"
            accessibilityLabel="How leagues work"
            className="h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white active:opacity-80 dark:border-border dark:bg-card"
          >
            <MaterialCommunityIcons name="help-circle-outline" size={22} color="#3f3f46" />
          </Pressable>
          <Pressable
            onPress={() => setShowCreate(true)}
            accessibilityRole="button"
            accessibilityLabel="Create a new league"
            className="h-10 flex-row items-center gap-1.5 rounded-full bg-amber px-4 active:opacity-90"
          >
            <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">New league</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-5">
        <SegmentedSlider
          options={SCOPE_OPTIONS}
          value={activeTab}
          onChange={setActiveTab}
          size="md"
          accessibilityLabelPrefix="Show"
        />
      </View>

      <View className="mt-3">
        <SegmentedSlider
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          size="sm"
          accessibilityLabelPrefix="Filter by"
        />
      </View>

      {youEntry ? (
        <View className="mt-5 overflow-hidden rounded-3xl border border-amber/40 bg-amber/10 dark:border-amber/40 dark:bg-amber/15">
          <View className="px-4 pt-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-amber">
              Your rank
            </Text>
          </View>
          <View className="h-px bg-amber/30" />
          <View className="flex-row items-center gap-3 px-4 py-3">
            <View className="relative">
              <View
                className="rounded-full"
                style={{ borderWidth: 2, borderColor: "#000" }}
              >
                <UserAvatar username={youEntry.username} avatarUrl={youEntry.avatarUrl} size={56} />
              </View>
              <View
                className="absolute -bottom-1 -left-1 h-6 min-w-[24px] items-center justify-center rounded-full bg-amber px-1.5"
                style={{ borderWidth: 2, borderColor: "#ffffff" }}
              >
                <Text className="text-[11px] font-bold text-white">{youEntry.rank}</Text>
              </View>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-bold text-black dark:text-white" numberOfLines={1}>
                You
              </Text>
              <RarityDotsRow counts={youEntry.rarityCounts} className="mt-1" />
            </View>
            <View className="items-end">
              <View className="flex-row items-baseline gap-1">
                <Text className="text-xl font-black text-black dark:text-white">
                  {youEntry.points.toLocaleString()}
                </Text>
                <Text className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">pts</Text>
              </View>
              <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                {youEntry.dogs} dog{youEntry.dogs === 1 ? "" : "s"} spotted
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View className="mt-5 flex-row items-center px-4 pb-2">
        <Text className="w-8 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">#</Text>
        <Text className="ml-2 flex-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Spotter
        </Text>
        <Text className="w-28 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Breakdown
        </Text>
        <Text className="w-16 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Points
        </Text>
        <Text className="w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Dogs
        </Text>
      </View>

      <View>
        {activeLeaderboard.map((entry) => {
          const isYou = entry.userId === currentUser.id;
          const medal = medalByRank[entry.rank];
          const deltaAbs = Math.abs(entry.delta);
          const showDelta = deltaAbs > 0;
          const deltaPositive = entry.delta > 0;
          return (
            <Pressable
              key={entry.userId}
              onPress={() => openUserProfileNavigate(navigation as any, currentUser.id, entry.userId)}
              accessibilityRole="link"
              accessibilityLabel={`Open ${entry.username}'s profile`}
              className={`mb-2 flex-row items-center rounded-2xl px-3 py-3 active:opacity-90 ${
                isYou
                  ? "border border-amber/40 bg-amber/10 dark:border-amber/40 dark:bg-amber/15"
                  : "border border-zinc-200 bg-white dark:border-border dark:bg-card"
              }`}
            >
              <View className="w-8 items-center">
                {medal ? (
                  <View
                    className="h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: medal.color }}
                  >
                    <Text className="text-xs font-bold" style={{ color: medal.iconColor }}>
                      {entry.rank}
                    </Text>
                  </View>
                ) : isYou ? (
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-amber">
                    <Text className="text-xs font-bold text-white">{entry.rank}</Text>
                  </View>
                ) : (
                  <Text className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    {entry.rank}
                  </Text>
                )}
              </View>
              <View className="ml-2 flex-1 flex-row items-center gap-2 min-w-0">
                <View
                  className="rounded-full"
                  style={{ borderWidth: 2, borderColor: "#000" }}
                >
                  <UserAvatar username={entry.username} avatarUrl={entry.avatarUrl} />
                </View>
                <View className="flex-1 flex-row items-center gap-2 min-w-0">
                  <Text
                    className="shrink text-sm font-semibold text-black dark:text-white"
                    numberOfLines={1}
                  >
                    {isYou ? "You" : entry.username}
                  </Text>
                  {entry.rank === 1 ? (
                    <MaterialCommunityIcons name="crown" size={16} color="#f5b301" />
                  ) : null}
                </View>
              </View>
              <View className="w-28 items-center">
                <RarityDotsRow counts={entry.rarityCounts} size={20} />
              </View>
              <View className="w-16 items-end">
                <Text className="text-sm font-bold text-black dark:text-white">
                  {entry.points.toLocaleString()}
                </Text>
                {showDelta ? (
                  <View className="mt-0.5 flex-row items-center gap-0.5">
                    <MaterialCommunityIcons
                      name={deltaPositive ? "arrow-top-right" : "arrow-bottom-right"}
                      size={11}
                      color={deltaPositive ? "#16a34a" : "#dc2626"}
                    />
                    <Text
                      className="text-[11px] font-semibold"
                      style={{ color: deltaPositive ? "#16a34a" : "#dc2626" }}
                    >
                      {deltaAbs.toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="w-12 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {entry.dogs}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "Friends" ? (
        <View className="mt-2">
          <Text className="mb-3 text-lg font-semibold text-black dark:text-white">Your leagues</Text>
          {leagues.length === 0 ? (
            <View className="mb-3 rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-6 dark:border-border dark:bg-card">
              <Text className="text-center text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                You haven't started a league yet. Tap{" "}
                <Text className="font-semibold text-amber">New league</Text> above to create one and
                invite friends.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 4 }}
            >
              {leagues.map((league, index) => {
                const stats = leagueStats.get(league.id);
                const accent = leagueAccent(league.id);
                const season = seasonProgress(league.createdAt, league.endsAt);
                const endsLine = season.ongoing
                  ? "Open-ended season"
                  : `Season ends ${league.endsAt ? formatLongDate(league.endsAt) : "—"}`;
                return (
                  <View
                    key={league.id}
                    className="mr-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-border dark:bg-card"
                    style={{ width: 280, marginLeft: index === 0 ? 0 : 0 }}
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: accent.bg }}
                      >
                        <MaterialCommunityIcons name={accent.icon} size={24} color={accent.color} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-base font-bold text-black dark:text-white"
                          numberOfLines={2}
                        >
                          {league.name}
                        </Text>
                        <View className="mt-1 flex-row items-center gap-1">
                          <MaterialCommunityIcons name="account-group" size={14} color="#71717a" />
                          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                            {league.memberCount} members
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="mt-4">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text
                          className="flex-1 text-xs text-zinc-600 dark:text-zinc-400"
                          numberOfLines={1}
                        >
                          {endsLine}
                        </Text>
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: accent.bg }}
                        >
                          <Text
                            className="text-[10px] font-semibold"
                            style={{ color: accent.color }}
                          >
                            {season.label}
                          </Text>
                        </View>
                      </View>
                      <View
                        className="mt-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                        style={{ height: 6 }}
                      >
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((season.ongoing ? 0.35 : season.progress) * 100)}%`,
                            backgroundColor: accent.color,
                          }}
                        />
                      </View>
                    </View>

                    <View className="mt-4 flex-row gap-3">
                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Your rank
                        </Text>
                        <Text className="mt-1 text-lg font-bold text-black dark:text-white">
                          {stats?.myRank ?? "—"}
                          <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {" "}
                            / {stats?.totalRanked ?? league.memberCount}
                          </Text>
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Your points
                        </Text>
                        <Text className="mt-1 text-lg font-bold text-black dark:text-white">
                          {(stats?.myPoints ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row gap-2">
                      <Pressable
                        onPress={() =>
                          navigation.navigate("LeagueDetail", {
                            leagueId: league.id,
                            leagueName: league.name,
                            memberCount: league.memberCount,
                            maxMembers: league.maxMembers,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Leaderboard for ${league.name}`}
                        className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white active:opacity-90 dark:border-border dark:bg-zinc-950"
                      >
                        <MaterialCommunityIcons name="podium" size={16} color="#3f3f46" />
                        <Text numberOfLines={1} className="text-center text-sm font-semibold text-black dark:text-white">
                          Leaderboard
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void shareLeagueInvite(league)}
                        accessibilityRole="button"
                        accessibilityLabel={`Share invite for ${league.name}`}
                        className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-amber active:opacity-90"
                      >
                        <MaterialCommunityIcons name="share-variant" size={16} color="#ffffff" />
                        <Text numberOfLines={1} className="text-center text-sm font-semibold text-white">
                          Share invite
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View className="mt-8">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-lg font-semibold text-black dark:text-white">Top dogs this week</Text>
          <Pressable
            onPress={() => navigation.navigate("TopDogs")}
            accessibilityRole="button"
            accessibilityLabel="View full top dogs leaderboard"
            hitSlop={8}
          >
            <Text className="text-xs font-semibold text-amber">Full leaderboard</Text>
          </Pressable>
        </View>
        <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Dogs ranked by this week&apos;s scans across all users.
        </Text>

        <View className="mt-3 overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-border dark:bg-card">
          {topDogsThisWeek.length === 0 ? (
            <View className="items-center px-4 py-8">
              <MaterialCommunityIcons name="dog-side" size={28} color="#a1a1aa" />
              <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No dog scans yet this week.
              </Text>
            </View>
          ) : (
            topDogsThisWeek.map((dog, index) => {
              const breed = breeds.find((b) => b.id === dog.breedId);
              const medal =
                index === 0
                  ? medalColorForRank(1, isDark)
                  : index === 1
                    ? medalColorForRank(2, isDark)
                    : index === 2
                      ? medalColorForRank(3, isDark)
                      : null;
              return (
                <Pressable
                  key={dog.id}
                  onPress={() => navigation.navigate("DogProfile", { dogProfileId: dog.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${dog.name}'s profile`}
                  className={`flex-row items-center gap-3 px-4 py-3 ${
                    index === topDogsThisWeek.length - 1 ? "" : "border-b border-zinc-200 dark:border-border"
                  }`}
                >
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: medal ?? "transparent", borderWidth: medal ? 0 : 1, borderColor: "#e4e4e7" }}
                  >
                    <Text
                      className={`text-xs font-bold ${medal ? "text-white" : "text-zinc-600 dark:text-zinc-300"}`}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-semibold text-black dark:text-white" numberOfLines={1}>
                      {dog.name}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
                      {breed?.name ?? "Unknown breed"} · {dog.totalScans.toLocaleString()} all-time
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-black dark:text-white">{dog.weeklyScans}</Text>
                    <Text className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      this week
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      <View className="h-20" />

      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-4"
          onPress={closeCreateModal}
        >
          <Pressable
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-bold text-black dark:text-white">
                  Create a friends league
                </Text>
                <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                  Everyone joins with the invite link or code.
                </Text>
              </View>
              <Pressable
                onPress={closeCreateModal}
                accessibilityRole="button"
                accessibilityLabel="Close create league"
                className="-mr-1 h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              >
                <MaterialCommunityIcons name="close" size={22} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              className="mt-1 max-h-[70vh]"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Name
              </Text>
              <TextInput
                value={leagueName}
                onChangeText={setLeagueName}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                placeholder="e.g. Saturday Park Crew"
                placeholderTextColor="#71717a"
                className="mt-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
              />

              <View className="mt-4 flex-row items-baseline justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Invite friends
                </Text>
                {selectedInviteIds.length > 0 ? (
                  <Pressable
                    onPress={() => setSelectedInviteIds([])}
                    accessibilityRole="button"
                    accessibilityLabel="Clear selected invites"
                    hitSlop={6}
                  >
                    <Text className="text-xs font-semibold text-amber">
                      Clear ({selectedInviteIds.length})
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Tap a friend to invite. They'll get a notification to accept.
              </Text>
              {friends.length === 0 ? (
                <View className="mt-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 dark:border-border dark:bg-zinc-950">
                  <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Add friends first to invite them directly.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-2"
                  contentContainerStyle={{ paddingVertical: 4, paddingRight: 4 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {friends.map((friend) => {
                    const selected = selectedInviteIds.includes(friend.id);
                    return (
                      <Pressable
                        key={friend.id}
                        onPress={() => toggleInviteSelection(friend.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${selected ? "Remove" : "Invite"} ${friend.username}`}
                        accessibilityState={{ selected }}
                        className="mr-3 items-center"
                        style={{ width: 64 }}
                      >
                        <View
                          className="rounded-full"
                          style={{
                            borderWidth: 2,
                            borderColor: selected ? "#f5b301" : "transparent",
                            padding: 2,
                          }}
                        >
                          <View className="relative">
                            <UserAvatar
                              username={friend.username}
                              avatarUrl={friend.avatarUrl}
                              size={48}
                            />
                            {selected ? (
                              <View
                                className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-amber"
                                style={{ borderWidth: 2, borderColor: "#ffffff" }}
                              >
                                <MaterialCommunityIcons name="check" size={12} color="#ffffff" />
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Text
                          className={`mt-1.5 text-center text-[11px] font-semibold ${
                            selected ? "text-amber" : "text-zinc-700 dark:text-zinc-300"
                          }`}
                          numberOfLines={1}
                        >
                          {friend.username}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Capacity
              </Text>
              <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Max members (you count as one).
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {LEAGUE_CAPACITY_PRESETS.map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      setMaxMembers(n);
                      setMaxMembersText(String(n));
                    }}
                    className={`rounded-full px-3 py-2 ${maxMembers === n ? "bg-amber" : "bg-zinc-100 dark:bg-zinc-800"}`}
                  >
                    <Text
                      className={`text-sm font-semibold ${maxMembers === n ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={maxMembersText}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, "").slice(0, 3);
                  setMaxMembersText(digits);
                  if (digits === "") return;
                  const v = parseInt(digits, 10);
                  if (!Number.isNaN(v)) setMaxMembers(v);
                }}
                onBlur={() => {
                  const v = parseInt(maxMembersText, 10);
                  const clamped = Number.isNaN(v) ? 2 : Math.min(500, Math.max(2, v));
                  setMaxMembers(clamped);
                  setMaxMembersText(String(clamped));
                }}
                keyboardType="number-pad"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Custom max (2–500)"
                placeholderTextColor="#71717a"
                className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
              />

              <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Duration
              </Text>
              <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                When the league "season" stops accepting weekly scores.
              </Text>
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
                  <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                    Length in days (1–365)
                  </Text>
                  <TextInput
                    value={customDays}
                    onChangeText={setCustomDays}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    placeholder="14"
                    placeholderTextColor="#71717a"
                    className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
                  />
                </View>
              ) : null}
            </ScrollView>

            <View className="mt-5 flex-row gap-2">
              <Pressable
                onPress={closeCreateModal}
                className="flex-1 items-center rounded-2xl border border-zinc-200 py-3 active:opacity-80 dark:border-border"
              >
                <Text className="font-semibold text-zinc-700 dark:text-zinc-300">Cancel</Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center rounded-2xl bg-amber py-3 active:opacity-90"
                onPress={submitCreateLeague}
              >
                <Text className="font-semibold text-white">
                  {selectedInviteIds.length > 0
                    ? `Create & invite ${selectedInviteIds.length}`
                    : "Create league"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showRules}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRules(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-4"
          onPress={() => setShowRules(false)}
        >
          <Pressable
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xl font-bold text-black dark:text-white">
                  How leagues work
                </Text>
                <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                  Spot dogs, score points, climb the board.
                </Text>
              </View>
              <Pressable
                onPress={() => setShowRules(false)}
                accessibilityRole="button"
                accessibilityLabel="Close rules"
                className="-mr-1 h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              >
                <MaterialCommunityIcons name="close" size={22} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              className="mt-3 max-h-[70vh]"
              showsVerticalScrollIndicator={false}
            >
              <RulesSection title="Friends vs. Global">
                <RulesBullet>
                  <Text className="font-semibold">Friends leagues</Text> are private — you invite
                  people by link or 8-character code. Each league has its own member cap and date
                  window.
                </RulesBullet>
                <RulesBullet>
                  The <Text className="font-semibold">Global</Text> board ranks every Spotter user
                  whose public spots you've seen, by lifetime points.
                </RulesBullet>
              </RulesSection>

              <RulesSection title="Points per scan">
                <RulesBullet>
                  Common breed: <Text className="font-semibold">{RARITY_POINTS.common} pt</Text>
                </RulesBullet>
                <RulesBullet>
                  Uncommon breed: <Text className="font-semibold">{RARITY_POINTS.uncommon} pts</Text>
                </RulesBullet>
                <RulesBullet>
                  Rare breed: <Text className="font-semibold">{RARITY_POINTS.rare} pts</Text>
                </RulesBullet>
                <RulesBullet>
                  Legendary breed: <Text className="font-semibold">{RARITY_POINTS.legendary} pts</Text>
                </RulesBullet>
                <RulesBullet>
                  Today's <Text className="font-semibold">featured breed</Text> multiplies your
                  points by <Text className="font-semibold">{FEATURED_MULTIPLIER}×</Text> for that
                  scan.
                </RulesBullet>
                <RulesBullet>
                  Private spots and untagged (pending breed) spots don't earn league points.
                </RulesBullet>
              </RulesSection>

              <RulesSection title="Seasons & windows">
                <RulesBullet>
                  Pick <Text className="font-semibold">Ongoing</Text> for a no-end league, or a
                  fixed window (1 / 4 / 12 weeks, or any custom 1–365 day length).
                </RulesBullet>
                <RulesBullet>
                  Only scans inside the league's window count toward its leaderboard.
                </RulesBullet>
                <RulesBullet>
                  When the window ends the standings freeze and the league shows{" "}
                  <Text className="font-semibold">ended</Text>.
                </RulesBullet>
              </RulesSection>

              <RulesSection title="Inviting & joining">
                <RulesBullet>
                  Share the league's invite link, or send the 8-character code. Both lead straight
                  to a join screen.
                </RulesBullet>
                <RulesBullet>
                  Leagues fill up to the capacity you set (2–500). The creator counts as one
                  member.
                </RulesBullet>
              </RulesSection>
            </ScrollView>

            <Pressable
              onPress={() => setShowRules(false)}
              className="mt-5 items-center rounded-2xl bg-amber py-3 active:opacity-90"
            >
              <Text className="font-semibold text-white">Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function RulesSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </Text>
      <View className="gap-1.5">{children}</View>
    </View>
  );
}

function RulesBullet({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">•</Text>
      <Text className="flex-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{children}</Text>
    </View>
  );
}

/**
 * Compact row of four rarity-coloured dots (common → legendary) each
 * showing the scan count inside. Default size matches the "Your rank"
 * card; pass a larger `size` (e.g. 24) when sitting inline next to the
 * username on a leaderboard row.
 */
function RarityDotsRow({
  counts,
  className,
  size = 18,
}: {
  counts: Record<BreedRarity, number>;
  className?: string;
  size?: number;
}) {
  const fontSize = Math.max(9, Math.round(size * 0.45));
  return (
    <View className={`flex-row gap-1 ${className ?? ""}`}>
      {RARITY_ORDER.map((rarity) => (
        <View
          key={rarity}
          className="items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: rarityColors[rarity],
            borderWidth: 1,
            borderColor: rarityHexBorderColors[rarity],
          }}
          accessibilityLabel={`${counts[rarity]} ${rarity} scans`}
        >
          <Text className="font-bold text-white" style={{ fontSize }}>
            {counts[rarity]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function LeaguesScreen() {
  if (!PILOT_SOCIAL_ENABLED) return <LeaguesPilotComingSoon />;
  return <LeaguesScreenContent />;
}
