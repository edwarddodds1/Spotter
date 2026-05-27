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

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ScanPhoto } from "@/components/ScanPhoto";
import { UserAvatar } from "@/components/UserAvatar";
import { palette } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import {
  acceptFriendRequestFrom,
  fetchFriendshipsForUser,
  removeFriendship,
  sendFriendRequestToUser,
} from "@/lib/supabase/friendshipsRemote";
import {
  fetchUserProfileBundle,
  type UserProfileBundle,
} from "@/lib/supabase/userProfileRemote";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

type Relation = "self" | "friend" | "incoming" | "outgoing" | "none";

function formatJoined(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function UserProfileScreen({ route, navigation }: Props) {
  const targetUserId = route.params.userId;
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

  const [bundle, setBundle] = useState<UserProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unfriendOpen, setUnfriendOpen] = useState(false);

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

  useEffect(() => {
    if (bundle?.profile?.username) {
      navigation.setOptions({ title: bundle.profile.username });
    }
  }, [bundle?.profile?.username, navigation]);

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

  if (loading && !bundle) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-ink">
        <ActivityIndicator color={palette.amber} />
      </View>
    );
  }

  if (!bundle) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-ink">
        <Text className="text-center text-base text-zinc-600 dark:text-zinc-300">
          We couldn't find that profile.
        </Text>
      </View>
    );
  }

  const { profile, scans, breedsCollected } = bundle;

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-ink"
      contentContainerStyle={{ paddingBottom: 64 }}
    >
      <View className="items-center px-4 pt-6">
        <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} size={96} />
        <Text className="mt-3 text-2xl font-bold text-black dark:text-white">{profile.username}</Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Joined {formatJoined(profile.createdAt)}
        </Text>
      </View>

      <View className="mx-4 mt-5 flex-row gap-2">
        <StatPill label="Scans" value={String(profile.totalScans)} />
        <StatPill label="Breeds" value={String(breedsCollected)} />
        <StatPill label="Visible" value={String(scans.length)} />
      </View>

      {!isSelf ? (
        <View className="mx-4 mt-4">
          {relation === "friend" ? (
            <View className="flex-row gap-2">
              <View className="flex-1 items-center rounded-2xl bg-emerald-100 py-3 dark:bg-emerald-900/30">
                <Text className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Friends</Text>
              </View>
              <Pressable
                onPress={() => setUnfriendOpen(true)}
                disabled={busy}
                className="rounded-2xl border border-zinc-300 px-4 py-3 dark:border-border"
              >
                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Unfriend</Text>
              </Pressable>
            </View>
          ) : relation === "incoming" ? (
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

      <ConfirmDialog
        visible={unfriendOpen}
        title={`Unfriend ${profile.username}?`}
        message="They'll no longer see your public spots, and you won't see theirs. You can send a new request later."
        confirmLabel="Unfriend"
        destructive
        onCancel={() => setUnfriendOpen(false)}
        onConfirm={() => void onUnfriendConfirmed()}
      />
    </ScrollView>
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
