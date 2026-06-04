import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ContentActionSheet } from "@/components/ContentActionSheet";
import { HexBreedTile } from "@/components/HexBreedTile";
import { ScanPhoto } from "@/components/ScanPhoto";
import { UserAvatar } from "@/components/UserAvatar";
import { RarityCompletionBars } from "@/components/RarityCompletionBars";
import { buildDogdexBreedOrder, rarityOrder } from "@/constants/breeds";
import { palette } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import {
  acceptFriendRequestFrom,
  fetchFriendshipsForUser,
  removeFriendship,
  sendFriendRequestToUser,
} from "@/lib/supabase/friendshipsRemote";
import {
  blockUser,
  reportContent,
  unblockUser,
  type ReportReason,
} from "@/lib/supabase/moderationRemote";
import {
  fetchUserProfileBundle,
  type UserProfileBundle,
} from "@/lib/supabase/userProfileRemote";
import { useAuthStore } from "@/store/useAuthStore";
import { useModerationStore } from "@/store/useModerationStore";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { Breed } from "@/types/app";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

type Relation = "self" | "friend" | "incoming" | "outgoing" | "none";

const HEX_COLUMNS = 3;

function formatJoined(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function chunkRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

export function UserProfileScreen({ route, navigation }: Props) {
  const targetUserId = route.params.userId;
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const myUserId = session?.user?.id ?? null;
  const friends = useSpotterStore((s) => s.friends);
  const pendingFriendRequests = useSpotterStore((s) => s.pendingFriendRequests);
  const outgoingFriendRequests = useSpotterStore((s) => s.outgoingFriendRequests);
  const breeds = useSpotterStore((s) => s.breeds);
  const setFriendshipsFromServer = useSpotterStore((s) => s.setFriendshipsFromServer);
  const addOutgoingFriendRequest = useSpotterStore((s) => s.addOutgoingFriendRequest);
  const removeIncomingRequestById = useSpotterStore((s) => s.removeIncomingRequestById);
  const removeOutgoingRequestById = useSpotterStore((s) => s.removeOutgoingRequestById);
  const promoteIncomingRequestToFriend = useSpotterStore((s) => s.promoteIncomingRequestToFriend);
  const removeFriendById = useSpotterStore((s) => s.removeFriendById);

  const blockedUserIds = useModerationStore((s) => s.blockedUserIds);
  const addBlockedUserId = useModerationStore((s) => s.addBlockedUserId);
  const removeBlockedUserId = useModerationStore((s) => s.removeBlockedUserId);
  const isBlocked = blockedUserIds.includes(targetUserId);

  const [bundle, setBundle] = useState<UserProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unfriendOpen, setUnfriendOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);

  const isSelf = myUserId === targetUserId;

  const relation: Relation = useMemo(() => {
    if (isSelf) return "self";
    if (friends.some((f) => f.id === targetUserId)) return "friend";
    if (pendingFriendRequests.some((p) => p.id === targetUserId)) return "incoming";
    if (outgoingFriendRequests.some((p) => p.id === targetUserId)) return "outgoing";
    return "none";
  }, [friends, isSelf, outgoingFriendRequests, pendingFriendRequests, targetUserId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUserProfileBundle(targetUserId);
      setBundle(result);
    } catch (err) {
      console.warn("[UserProfile] fetch", err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshFriendships = useCallback(async () => {
    if (!myUserId) return;
    try {
      const next = await fetchFriendshipsForUser(myUserId);
      setFriendshipsFromServer(next);
    } catch (err) {
      console.warn("[UserProfile] refresh friendships", err);
    }
  }, [myUserId, setFriendshipsFromServer]);

  const onAdd = useCallback(async () => {
    if (!myUserId || !bundle) return;
    setBusy(true);
    try {
      const result = await sendFriendRequestToUser(myUserId, bundle.profile);
      if (!result.ok) {
        if (result.reason === "already") {
          await refreshFriendships();
          return;
        }
        Alert.alert("Couldn't send request", result.message);
        return;
      }
      addOutgoingFriendRequest(result.profile);
    } finally {
      setBusy(false);
    }
  }, [addOutgoingFriendRequest, bundle, myUserId, refreshFriendships]);

  const onAccept = useCallback(async () => {
    if (!myUserId || !bundle) return;
    setBusy(true);
    try {
      const result = await acceptFriendRequestFrom(myUserId, bundle.profile.id);
      if (!result.ok) {
        Alert.alert("Couldn't accept", result.message);
        return;
      }
      promoteIncomingRequestToFriend(bundle.profile.id);
      void refresh();
    } finally {
      setBusy(false);
    }
  }, [bundle, myUserId, promoteIncomingRequestToFriend, refresh]);

  const onCancelOutgoing = useCallback(async () => {
    if (!myUserId || !bundle) return;
    setBusy(true);
    try {
      const result = await removeFriendship(myUserId, bundle.profile.id);
      if (!result.ok) {
        Alert.alert("Couldn't cancel", result.message);
        return;
      }
      removeOutgoingRequestById(bundle.profile.id);
    } finally {
      setBusy(false);
    }
  }, [bundle, myUserId, removeOutgoingRequestById]);

  const onDeclineIncoming = useCallback(async () => {
    if (!myUserId || !bundle) return;
    setBusy(true);
    try {
      const result = await removeFriendship(myUserId, bundle.profile.id);
      if (!result.ok) {
        Alert.alert("Couldn't decline", result.message);
        return;
      }
      removeIncomingRequestById(bundle.profile.id);
    } finally {
      setBusy(false);
    }
  }, [bundle, myUserId, removeIncomingRequestById]);

  const onReport = useCallback(
    async (reason: ReportReason) => {
      if (!bundle) return;
      setModerationBusy(true);
      try {
        const result = await reportContent({ reason, reportedUserId: bundle.profile.id });
        setModerationOpen(false);
        if (result.ok) {
          Alert.alert("Report received", "Thanks — our team will review this account.");
        } else {
          Alert.alert("Couldn't send report", result.message);
        }
      } finally {
        setModerationBusy(false);
      }
    },
    [bundle],
  );

  const onToggleBlock = useCallback(async () => {
    if (!bundle) return;
    setModerationBusy(true);
    try {
      if (isBlocked) {
        const result = await unblockUser(bundle.profile.id);
        setModerationOpen(false);
        if (result.ok) {
          removeBlockedUserId(bundle.profile.id);
        } else {
          Alert.alert("Couldn't unblock", result.message);
        }
        return;
      }
      const result = await blockUser(bundle.profile.id);
      setModerationOpen(false);
      if (!result.ok) {
        Alert.alert("Couldn't block", result.message);
        return;
      }
      addBlockedUserId(bundle.profile.id);
      // Blocking implies removing any friendship so they lose access to your spots.
      if (myUserId && relation === "friend") {
        await removeFriendship(myUserId, bundle.profile.id).catch(() => undefined);
        removeFriendById(bundle.profile.id);
      }
      Alert.alert("User blocked", "You won't see their posts and they can't see yours.");
    } finally {
      setModerationBusy(false);
    }
  }, [addBlockedUserId, bundle, isBlocked, myUserId, relation, removeBlockedUserId, removeFriendById]);

  const onUnfriendConfirmed = useCallback(async () => {
    setUnfriendOpen(false);
    if (!myUserId || !bundle) return;
    setBusy(true);
    try {
      const result = await removeFriendship(myUserId, bundle.profile.id);
      if (!result.ok) {
        Alert.alert("Couldn't unfriend", result.message);
        return;
      }
      removeFriendById(bundle.profile.id);
      void refresh();
    } finally {
      setBusy(false);
    }
  }, [bundle, myUserId, refresh, removeFriendById]);

  const collectedBreedIds = useMemo(() => {
    if (!bundle) return new Set<string>();
    const ids = new Set<string>();
    for (const scan of bundle.scans) {
      if (scan.userId !== targetUserId) continue;
      if (scan.isPendingBreed) continue;
      if (!scan.breedId) continue;
      ids.add(scan.breedId);
    }
    return ids;
  }, [bundle, targetUserId]);

  const unlockedBreedsByRarity = useMemo(() => {
    const ordered = buildDogdexBreedOrder(breeds);
    const unlocked = ordered.filter((b) => collectedBreedIds.has(b.id));
    const byRarity = new Map<(typeof rarityOrder)[number], Breed[]>();
    for (const rarity of rarityOrder) {
      byRarity.set(
        rarity,
        unlocked.filter((b) => b.rarity === rarity),
      );
    }
    return byRarity;
  }, [breeds, collectedBreedIds]);

  const hasUnlockedBreeds = useMemo(
    () => Array.from(unlockedBreedsByRarity.values()).some((list) => list.length > 0),
    [unlockedBreedsByRarity],
  );

  const scrollBottomPad = 64;

  if (loading && !bundle) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-ink">
        <ActivityIndicator color={palette.amber} />
      </View>
    );
  }

  if (!bundle) {
    return (
      <View style={{ flex: 1, position: "relative" }} className="bg-zinc-50 dark:bg-ink">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white active:opacity-80 dark:border-border dark:bg-card"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            zIndex: 10,
          }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#3f3f46" />
        </Pressable>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-zinc-600 dark:text-zinc-300">
            We couldn't find that profile.
          </Text>
        </View>
      </View>
    );
  }

  const { profile, scans, breedsCollected } = bundle;

  return (
    <View style={{ flex: 1, position: "relative" }} className="bg-zinc-50 dark:bg-ink">
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white active:opacity-80 dark:border-border dark:bg-card"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          zIndex: 10,
        }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#3f3f46" />
      </Pressable>

      {!isSelf ? (
        <Pressable
          onPress={() => setModerationOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Report or block this user"
          className="h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white active:opacity-80 dark:border-border dark:bg-card"
          style={{
            position: "absolute",
            top: insets.top + 8,
            right: 16,
            zIndex: 10,
          }}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={22} color="#3f3f46" />
        </Pressable>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: scrollBottomPad,
        }}
      >
        <View className="items-center px-4">
          <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} size={96} />
          <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
            <Text className="text-2xl font-bold text-black dark:text-white">{profile.username}</Text>
            {relation === "friend" ? (
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-900/40">
                <MaterialCommunityIcons name="account-check" size={14} color="#15803d" />
                <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Friends</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Joined {formatJoined(profile.createdAt)}
          </Text>
        </View>

        <View className="mx-4 mt-5 flex-row gap-2">
          <StatPill label="Scans" value={String(profile.totalScans)} />
          <StatPill label="Breeds" value={String(breedsCollected)} />
          <StatPill label="Visible" value={String(scans.length)} />
        </View>

        <View className="mx-4 mt-3 rounded-3xl border border-zinc-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
          <Text className="text-base font-bold text-black dark:text-white">Rarity completion</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Progress by rarity (public spots).</Text>
          <View className="mt-2">
            <RarityCompletionBars variant="compact" breeds={breeds} scans={scans} userId={targetUserId} />
          </View>
        </View>

        {hasUnlockedBreeds ? (
          <View className="mx-4 mt-6">
            <Text className="mb-3 text-base font-semibold text-black dark:text-white">Unlocked dogs</Text>
            {rarityOrder.map((rarity) => {
              const list = unlockedBreedsByRarity.get(rarity) ?? [];
              if (list.length === 0) return null;
              /**
               * Chunk into full rows of HEX_COLUMNS so completed rows still keep
               * the standard spacing, while the final partial row lets
               * `justify-evenly` distribute the remaining tiles across the full
               * width instead of clumping them to the left with null padding.
               */
              const rows = chunkRows(list, HEX_COLUMNS);
              return (
                <View key={rarity} className="mb-2">
                  {rows.map((row, rowIndex) => (
                    <View key={`${rarity}-row-${rowIndex}`} className="flex-row justify-evenly">
                      {row.map((breed) => (
                        <HexBreedTile
                          key={breed.id}
                          breed={breed}
                          unlocked
                          onPress={() => navigation.navigate("BreedDetail", { breedId: breed.id })}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null}

        <View className="mt-8 px-4">
          <Text className="mb-3 text-base font-semibold text-black dark:text-white">Public spots</Text>
          {scans.length === 0 ? (
            <View className="items-center rounded-3xl border border-dashed border-zinc-300 bg-white py-10 dark:border-border dark:bg-card">
              <MaterialCommunityIcons name="paw" size={28} color={palette.muted} />
              <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {relation === "self" || relation === "friend"
                  ? "No public spots yet."
                  : "Become friends to see their public spots."}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {scans.map((scan) => {
                const breed = breeds.find((b) => b.id === scan.breedId);
                return (
                  <View
                    key={scan.id}
                    className="mb-3 w-[48%] overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-border dark:bg-card"
                  >
                    <ScanPhoto
                      scanId={scan.id}
                      photoUrl={scan.photoUrl}
                      className="aspect-square w-full bg-zinc-100 dark:bg-zinc-900"
                    />
                    {breed ? (
                      <View className="px-3 py-2">
                        <Text className="text-sm font-semibold text-black dark:text-white" numberOfLines={1}>
                          {breed.name}
                        </Text>
                        {scan.locationLabel ? (
                          <Text
                            className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400"
                            numberOfLines={1}
                          >
                            {scan.locationLabel}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {!isSelf && relation !== "friend" ? (
          <View className="mx-4 mt-6">
            {relation === "incoming" ? (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => void onAccept()}
                  disabled={busy}
                  className="flex-1 items-center rounded-2xl bg-amber py-3 disabled:opacity-60"
                >
                  <Text className="text-sm font-semibold text-white">{busy ? "Working…" : "Accept request"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void onDeclineIncoming()}
                  disabled={busy}
                  className="rounded-2xl border border-zinc-300 px-4 py-3 dark:border-border"
                >
                  <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Decline</Text>
                </Pressable>
              </View>
            ) : relation === "outgoing" ? (
              <View className="flex-row gap-2">
                <View className="flex-1 items-center rounded-2xl bg-zinc-100 py-3 dark:bg-zinc-900">
                  <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Request pending</Text>
                </View>
                <Pressable
                  onPress={() => void onCancelOutgoing()}
                  disabled={busy}
                  className="rounded-2xl border border-zinc-300 px-4 py-3 dark:border-border"
                >
                  <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => void onAdd()}
                disabled={busy}
                className="items-center rounded-2xl bg-amber py-3 disabled:opacity-60"
              >
                <Text className="text-sm font-semibold text-white">{busy ? "Sending…" : "Add friend"}</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {relation === "friend" ? (
          /**
           * Unfriend lives at the absolute end of the scroll content (not in
           * a fixed footer) so it's intentionally out of reach until the
           * user has seen the rest of the profile — destructive actions
           * shouldn't be the first thing your thumb lands on.
           */
          <View className="mx-4 mt-10 mb-2">
            <Pressable
              onPress={() => setUnfriendOpen(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Unfriend ${profile.username}`}
              className="w-full items-center rounded-2xl bg-red-600 py-3.5 active:opacity-90 disabled:opacity-60 dark:bg-red-700"
            >
              <Text className="text-base font-semibold text-white">Unfriend</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={unfriendOpen}
        title={`Unfriend ${profile.username}?`}
        message="They'll no longer see your public spots, and you won't see theirs. You can send a new request later."
        confirmLabel="Unfriend"
        destructive
        onCancel={() => setUnfriendOpen(false)}
        onConfirm={() => void onUnfriendConfirmed()}
      />

      <ContentActionSheet
        visible={moderationOpen}
        onClose={() => setModerationOpen(false)}
        subjectLabel={profile.username}
        busy={moderationBusy}
        isBlocked={isBlocked}
        onReport={(reason) => void onReport(reason)}
        onToggleBlock={() => void onToggleBlock()}
      />
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-zinc-200/80 bg-white py-3 dark:border-border dark:bg-card">
      <Text className="text-xl font-bold text-black dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
    </View>
  );
}
