import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ComingSoonCard } from "@/components/ComingSoonCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { palette } from "@/constants/theme";
import { PILOT_FRIENDS_ENABLED } from "@/lib/pilotFeatures";
import { refreshFriendsScans } from "@/lib/syncFriendScans";
import {
  acceptFriendRequestFrom,
  fetchFriendshipsForUser,
  removeFriendship,
  searchUsersByUsername,
  sendFriendRequestByUsername,
  sendFriendRequestToUser,
} from "@/lib/supabase/friendshipsRemote";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { UserProfile } from "@/types/app";

function FriendsPilotComingSoon() {
  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      <Text className="text-3xl font-bold text-black dark:text-white">Friends</Text>
      <ComingSoonCard
        title="Friends are coming soon"
        body="For the pilot, build your Dogdex and share spots from your profile. Friend requests and a friends-only feed ship in v2."
      />
    </ScrollView>
  );
}

type SearchState = "idle" | "searching" | "ready" | "error";

function FriendsScreenContent() {
  const session = useAuthStore((state) => state.session);
  const myUserId = session?.user?.id ?? null;
  const currentUser = useSpotterStore((state) => state.currentUser);
  const friends = useSpotterStore((state) => state.friends);
  const pendingFriendRequests = useSpotterStore((state) => state.pendingFriendRequests);
  const outgoingFriendRequests = useSpotterStore((state) => state.outgoingFriendRequests);
  const setFriendshipsFromServer = useSpotterStore((state) => state.setFriendshipsFromServer);
  const addOutgoingFriendRequest = useSpotterStore((state) => state.addOutgoingFriendRequest);
  const removeIncomingRequestById = useSpotterStore((state) => state.removeIncomingRequestById);
  const removeOutgoingRequestById = useSpotterStore((state) => state.removeOutgoingRequestById);
  const promoteIncomingRequestToFriend = useSpotterStore((state) => state.promoteIncomingRequestToFriend);
  const removeFriendById = useSpotterStore((state) => state.removeFriendById);

  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unfriendTarget, setUnfriendTarget] = useState<UserProfile | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);
  const incomingIds = useMemo(
    () => new Set(pendingFriendRequests.map((p) => p.id)),
    [pendingFriendRequests],
  );
  const outgoingIds = useMemo(
    () => new Set(outgoingFriendRequests.map((p) => p.id)),
    [outgoingFriendRequests],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(timer);
  }, [notice]);

  const refreshFromServer = useCallback(async () => {
    if (!myUserId) return;
    try {
      const bundle = await fetchFriendshipsForUser(myUserId);
      setFriendshipsFromServer(bundle);
    } catch (err) {
      console.warn("[Friends] refresh failed", err);
    }
  }, [myUserId, setFriendshipsFromServer]);

  useEffect(() => {
    void refreshFromServer();
  }, [refreshFromServer]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = query.trim();
    if (!myUserId || term.length < 2) {
      setSearchResults([]);
      setSearchState("idle");
      return;
    }
    setSearchState("searching");
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsersByUsername(term, myUserId);
        setSearchResults(results);
        setSearchState("ready");
      } catch (err) {
        console.warn("[Friends] search failed", err);
        setSearchState("error");
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, myUserId]);

  const runWithLock = useCallback(
    async (userId: string, fn: () => Promise<void>) => {
      if (actionUserId) return;
      setActionUserId(userId);
      try {
        await fn();
      } finally {
        setActionUserId(null);
      }
    },
    [actionUserId],
  );

  const onSendRequest = useCallback(
    (profile: UserProfile) =>
      runWithLock(profile.id, async () => {
        if (!myUserId) return;
        const result = await sendFriendRequestToUser(myUserId, profile);
        if (!result.ok) {
          if (result.reason === "already") {
            await refreshFromServer();
            setNotice("Already pending or friends.");
            return;
          }
          Alert.alert("Couldn't send request", result.message);
          return;
        }
        addOutgoingFriendRequest(result.profile);
        setNotice(`Request sent to ${profile.username}.`);
      }),
    [addOutgoingFriendRequest, myUserId, refreshFromServer, runWithLock],
  );

  const onAccept = useCallback(
    (profile: UserProfile) =>
      runWithLock(profile.id, async () => {
        if (!myUserId) return;
        const result = await acceptFriendRequestFrom(myUserId, profile.id);
        if (!result.ok) {
          Alert.alert("Couldn't accept", result.message);
          return;
        }
        promoteIncomingRequestToFriend(profile.id);
        setNotice(`You and ${profile.username} are now friends.`);
        void refreshFriendsScans();
      }),
    [myUserId, promoteIncomingRequestToFriend, runWithLock],
  );

  const onDecline = useCallback(
    (profile: UserProfile) =>
      runWithLock(profile.id, async () => {
        if (!myUserId) return;
        const result = await removeFriendship(myUserId, profile.id);
        if (!result.ok) {
          Alert.alert("Couldn't decline", result.message);
          return;
        }
        removeIncomingRequestById(profile.id);
      }),
    [myUserId, removeIncomingRequestById, runWithLock],
  );

  const onCancelOutgoing = useCallback(
    (profile: UserProfile) =>
      runWithLock(profile.id, async () => {
        if (!myUserId) return;
        const result = await removeFriendship(myUserId, profile.id);
        if (!result.ok) {
          Alert.alert("Couldn't cancel", result.message);
          return;
        }
        removeOutgoingRequestById(profile.id);
      }),
    [myUserId, removeOutgoingRequestById, runWithLock],
  );

  const onUnfriendConfirmed = useCallback(async () => {
    const target = unfriendTarget;
    setUnfriendTarget(null);
    if (!target || !myUserId) return;
    await runWithLock(target.id, async () => {
      const result = await removeFriendship(myUserId, target.id);
      if (!result.ok) {
        Alert.alert("Couldn't unfriend", result.message);
        return;
      }
      removeFriendById(target.id);
      setNotice(`Unfriended ${target.username}.`);
    });
  }, [myUserId, removeFriendById, runWithLock, unfriendTarget]);

  const onAddByExactUsername = useCallback(async () => {
    if (!myUserId) return;
    const target = query.trim();
    if (!target) return;
    Keyboard.dismiss();
    const result = await sendFriendRequestByUsername(myUserId, currentUser.username, target);
    if (!result.ok) {
      Alert.alert("Couldn't send request", result.message);
      return;
    }
    addOutgoingFriendRequest(result.profile);
    setNotice(`Request sent to ${result.profile.username}.`);
    setQuery("");
    setSearchResults([]);
    setSearchState("idle");
  }, [addOutgoingFriendRequest, currentUser.username, myUserId, query]);

  if (!myUserId) {
    return (
      <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
        <Text className="text-3xl font-bold text-black dark:text-white">Friends</Text>
        <Text className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to find friends and share your Dogdex.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-ink"
      contentContainerStyle={{ paddingBottom: 96 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-4 pt-8">
        <Text className="text-3xl font-bold text-black dark:text-white">Friends</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Search by username to send a friend request. Accepted friends can see your public spots.
        </Text>
      </View>

      <View className="mt-5 px-4">
        <View className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-border dark:bg-card">
          <View className="flex-row items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-border dark:bg-zinc-950">
            <MaterialCommunityIcons name="account-search-outline" size={18} color={palette.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="search"
              onSubmitEditing={onAddByExactUsername}
              placeholder="Search username"
              placeholderTextColor="#71717a"
              className="flex-1 text-black dark:text-white"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery("");
                  setSearchResults([]);
                  setSearchState("idle");
                }}
                accessibilityLabel="Clear search"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={palette.muted} />
              </Pressable>
            ) : null}
          </View>
          <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Search starts after 2 characters. Press return to send a request to the exact username.
          </Text>
        </View>

        {searchState === "searching" ? (
          <View className="mt-3 flex-row items-center gap-2 px-1">
            <ActivityIndicator size="small" color={palette.amber} />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">Searching…</Text>
          </View>
        ) : null}
        {searchState === "ready" && searchResults.length === 0 && query.trim().length >= 2 ? (
          <Text className="mt-3 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            No users match “{query.trim()}”.
          </Text>
        ) : null}
        {searchState === "error" ? (
          <Text className="mt-3 px-1 text-xs text-red-600 dark:text-red-400">Search failed. Try again.</Text>
        ) : null}

        {searchResults.length > 0 ? (
          <View className="mt-3">
            {searchResults.map((profile) => {
              const isFriend = friendIds.has(profile.id);
              const isOutgoing = outgoingIds.has(profile.id);
              const isIncoming = incomingIds.has(profile.id);
              const isBusy = actionUserId === profile.id;
              return (
                <View
                  key={profile.id}
                  className="mb-2 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 dark:border-border dark:bg-card"
                >
                  <View className="min-w-0 flex-1 flex-row items-center gap-3">
                    <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                        {profile.username}
                      </Text>
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        {profile.totalScans} scan{profile.totalScans === 1 ? "" : "s"}
                      </Text>
                    </View>
                  </View>
                  {isFriend ? (
                    <View className="rounded-full bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/30">
                      <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Friends</Text>
                    </View>
                  ) : isIncoming ? (
                    <Pressable
                      onPress={() => void onAccept(profile)}
                      disabled={isBusy}
                      className="rounded-full bg-amber px-3 py-1.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-xs font-semibold text-white">{isBusy ? "Working…" : "Accept"}</Text>
                    </Pressable>
                  ) : isOutgoing ? (
                    <View className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
                      <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Pending</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => void onSendRequest(profile)}
                      disabled={isBusy}
                      className="rounded-full bg-amber px-3 py-1.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-xs font-semibold text-white">
                        {isBusy ? "Sending…" : "Add friend"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {notice ? (
        <View className="mx-4 mt-3 rounded-2xl bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
          <Text className="text-center text-xs font-medium text-emerald-800 dark:text-emerald-300">{notice}</Text>
        </View>
      ) : null}

      {pendingFriendRequests.length > 0 ? (
        <View className="mt-6 px-4">
          <Text className="mb-2 text-base font-semibold text-black dark:text-white">Friend requests</Text>
          {pendingFriendRequests.map((request) => {
            const isBusy = actionUserId === request.id;
            return (
              <View
                key={request.id}
                className="mb-3 flex-row items-center justify-between rounded-3xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20"
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  <UserAvatar username={request.username} avatarUrl={request.avatarUrl} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                      {request.username}
                    </Text>
                    <Text className="text-xs text-zinc-600 dark:text-zinc-400">Wants to be friends.</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => void onDecline(request)}
                    disabled={isBusy}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                  >
                    <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Decline</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onAccept(request)}
                    disabled={isBusy}
                    className="rounded-full bg-amber px-3 py-1.5 active:opacity-90 disabled:opacity-50"
                  >
                    <Text className="text-xs font-semibold text-white">{isBusy ? "Working…" : "Accept"}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {outgoingFriendRequests.length > 0 ? (
        <View className="mt-6 px-4">
          <Text className="mb-2 text-base font-semibold text-black dark:text-white">Sent requests</Text>
          {outgoingFriendRequests.map((request) => {
            const isBusy = actionUserId === request.id;
            return (
              <View
                key={request.id}
                className="mb-3 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 dark:border-border dark:bg-card"
              >
                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                  <UserAvatar username={request.username} avatarUrl={request.avatarUrl} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                      {request.username}
                    </Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">Awaiting their reply.</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => void onCancelOutgoing(request)}
                  disabled={isBusy}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                >
                  <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {isBusy ? "…" : "Cancel"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-6 px-4">
        <Text className="mb-2 text-base font-semibold text-black dark:text-white">
          Your friends {friends.length > 0 ? `(${friends.length})` : ""}
        </Text>
        {friends.length === 0 ? (
          <View className="rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-border dark:bg-card">
            <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              No friends yet. Search for a username above to get started.
            </Text>
          </View>
        ) : (
          friends.map((friend) => (
            <View
              key={friend.id}
              className="mb-3 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 dark:border-border dark:bg-card"
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <UserAvatar username={friend.username} avatarUrl={friend.avatarUrl} />
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                    {friend.username}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {friend.totalScans} scan{friend.totalScans === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setUnfriendTarget(friend)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                accessibilityLabel={`Unfriend ${friend.username}`}
              >
                <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Unfriend</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <ConfirmDialog
        visible={unfriendTarget !== null}
        title={unfriendTarget ? `Unfriend ${unfriendTarget.username}?` : "Unfriend?"}
        message="They will no longer see your public spots, and you won't see theirs. You can send a new request later."
        confirmLabel="Unfriend"
        destructive
        onCancel={() => setUnfriendTarget(null)}
        onConfirm={() => void onUnfriendConfirmed()}
      />
    </ScrollView>
  );
}

export function FriendsScreen() {
  if (!PILOT_FRIENDS_ENABLED) return <FriendsPilotComingSoon />;
  return <FriendsScreenContent />;
}
