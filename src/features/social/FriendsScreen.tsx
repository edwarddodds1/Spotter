import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { UserAvatar } from "@/components/UserAvatar";
import { useSpotterStore } from "@/store/useSpotterStore";

export function FriendsScreen() {
  const [username, setUsername] = useState("");
  const friends = useSpotterStore((state) => state.friends);
  const addFriend = useSpotterStore((state) => state.addFriend);
  const pendingFriendRequests = useSpotterStore((state) => state.pendingFriendRequests);
  const acceptFriendRequest = useSpotterStore((state) => state.acceptFriendRequest);
  const declineFriendRequest = useSpotterStore((state) => state.declineFriendRequest);

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-8 dark:bg-ink">
      <Text className="text-3xl font-bold text-black dark:text-white">Friends</Text>
      <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Search usernames, send requests, and keep your social feed active.</Text>

      <View className="mt-5 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-border dark:bg-card">
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Search username"
          placeholderTextColor="#71717a"
          className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
        />
        <Pressable
          className="mt-3 rounded-2xl bg-amber px-4 py-3"
          onPress={() => {
            if (!username.trim()) return;
            addFriend(username.trim());
            setUsername("");
          }}
        >
          <Text className="text-center font-semibold text-white">Send request</Text>
        </Pressable>
      </View>

      <View className="mt-6">
        {pendingFriendRequests.length > 0 ? (
          <View className="mb-5">
            <Text className="mb-2 text-base font-semibold text-black dark:text-white">Friend requests</Text>
            {pendingFriendRequests.map((request) => (
              <View
                key={request.id}
                className="mb-3 flex-row items-center justify-between rounded-3xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900/50 dark:bg-red-950/20"
              >
                <View className="flex-row items-center gap-3">
                  <UserAvatar username={request.username} avatarUrl={request.avatarUrl} />
                  <View>
                    <Text className="font-semibold text-black dark:text-white">{request.username}</Text>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">Wants to connect from your league</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => declineFriendRequest(request.id)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
                  >
                    <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Decline</Text>
                  </Pressable>
                  <Pressable onPress={() => acceptFriendRequest(request.id)} className="rounded-full bg-amber px-3 py-1.5">
                    <Text className="text-xs font-semibold text-white">Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {friends.map((friend) => (
          <View key={friend.id} className="mb-3 flex-row items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card">
            <View className="flex-row items-center gap-3">
              <UserAvatar username={friend.username} avatarUrl={friend.avatarUrl} />
              <View>
                <Text className="font-semibold text-black dark:text-white">{friend.username}</Text>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">{friend.totalScans} scans</Text>
              </View>
            </View>
            <Text className="text-sm font-semibold text-amber">Accepted</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
