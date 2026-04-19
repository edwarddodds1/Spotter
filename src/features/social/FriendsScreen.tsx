import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { UserAvatar } from "@/components/UserAvatar";
import { useSpotterStore } from "@/store/useSpotterStore";

export function FriendsScreen() {
  const [username, setUsername] = useState("");
  const friends = useSpotterStore((state) => state.friends);
  const addFriend = useSpotterStore((state) => state.addFriend);

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-14 dark:bg-ink">
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
