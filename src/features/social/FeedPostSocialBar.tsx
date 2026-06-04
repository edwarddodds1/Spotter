import { useMemo, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { openUserProfileNavigate } from "@/components/UsernameLink";
import { MAX_FEED_COMMENT_LENGTH } from "@/constants/feedSocial";
import { palette } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { UserProfile } from "@/types/app";

function lookupUser(userId: string, currentUser: UserProfile, friends: UserProfile[]): UserProfile | null {
  if (userId === currentUser.id) return currentUser;
  return friends.find((f) => f.id === userId) ?? null;
}

export function FeedPostSocialBar({ scanId }: { scanId: string }) {
  const navigation = useNavigation<any>();
  const currentUser = useSpotterStore((s) => s.currentUser);
  const friends = useSpotterStore((s) => s.friends);
  /** Subscribe to stable array refs — filtered copies in selectors cause React 19 infinite update loops. */
  const feedReactions = useSpotterStore((s) => s.feedReactions);
  const feedComments = useSpotterStore((s) => s.feedComments);
  const reactions = useMemo(
    () => feedReactions.filter((r) => r.scanId === scanId),
    [feedReactions, scanId],
  );
  const comments = useMemo(
    () =>
      [...feedComments.filter((c) => c.scanId === scanId)].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [feedComments, scanId],
  );
  const toggleFeedReaction = useSpotterStore((s) => s.toggleFeedReaction);
  const addFeedComment = useSpotterStore((s) => s.addFeedComment);
  const removeFeedComment = useSpotterStore((s) => s.removeFeedComment);

  const [draft, setDraft] = useState("");

  /**
   * Heart is the only surfaced reaction for now. We still read existing
   * non-love reactions (paw/fire/wow) from the store so historical data
   * shows up in the count without forcing a migration, but only the love
   * kind can be toggled by tapping the heart.
   */
  const iLoved = useMemo(
    () => reactions.some((r) => r.userId === currentUser.id && r.kind === "love"),
    [reactions, currentUser.id],
  );
  const reactionCount = reactions.length;

  const submitComment = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    addFeedComment(scanId, trimmed);
    setDraft("");
    Keyboard.dismiss();
  };

  return (
    <View>
      {comments.length > 0 ? (
        <View className="mt-4 gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Comments ({comments.length})
          </Text>
          {comments.map((c) => {
            const author = lookupUser(c.userId, currentUser, friends);
            const isMine = c.userId === currentUser.id;
            const authorName = author?.username ?? "Someone";
            const goToAuthor = author
              ? () => openUserProfileNavigate(navigation, currentUser.id, author.id)
              : undefined;
            return (
              <View key={c.id} className="flex-row gap-2">
                <Pressable
                  onPress={goToAuthor}
                  disabled={!goToAuthor}
                  accessibilityRole={goToAuthor ? "link" : undefined}
                  accessibilityLabel={goToAuthor ? `Open ${authorName}'s profile` : undefined}
                  className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800"
                >
                  <Text className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {authorName.slice(0, 1).toUpperCase()}
                  </Text>
                </Pressable>
                <View className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950/80">
                  <View className="flex-row items-center justify-between gap-2">
                    <Pressable
                      onPress={goToAuthor}
                      disabled={!goToAuthor}
                      accessibilityRole={goToAuthor ? "link" : undefined}
                      accessibilityLabel={goToAuthor ? `Open ${authorName}'s profile` : undefined}
                      className="min-w-0 flex-1"
                    >
                      <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300" numberOfLines={1}>
                        {authorName}
                      </Text>
                    </Pressable>
                    {isMine ? (
                      <Pressable onPress={() => removeFeedComment(c.id)} hitSlop={8} accessibilityLabel="Remove comment">
                        <MaterialCommunityIcons name="close" size={16} color={palette.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-sm leading-5 text-black dark:text-white">{c.body}</Text>
                  <Text className="mt-1 text-[10px] text-zinc-500">
                    {new Date(c.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={() => toggleFeedReaction(scanId, "love")}
          accessibilityRole="button"
          accessibilityLabel={iLoved ? "Remove like" : "Like this spot"}
          accessibilityState={{ selected: iLoved }}
          className={`h-11 flex-row items-center justify-center gap-1.5 rounded-2xl border px-3 ${
            iLoved
              ? "border-amber bg-amber/15"
              : "border-zinc-200 bg-zinc-50 dark:border-border dark:bg-zinc-900"
          }`}
        >
          <MaterialCommunityIcons
            name={iLoved ? "heart" : "heart-outline"}
            size={20}
            color={iLoved ? palette.amber : "#71717a"}
          />
          {reactionCount > 0 ? (
            <Text
              className={`text-sm font-semibold ${
                iLoved ? "text-amber" : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {reactionCount}
            </Text>
          ) : null}
        </Pressable>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, MAX_FEED_COMMENT_LENGTH))}
          placeholder="Add a comment…"
          placeholderTextColor="#71717a"
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={submitComment}
          className="h-11 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-black dark:border-border dark:bg-zinc-950 dark:text-white"
        />
        <Pressable
          onPress={submitComment}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          className="h-11 items-center justify-center rounded-2xl bg-amber px-4 disabled:opacity-50"
        >
          <Text className="text-sm font-semibold text-white">Post</Text>
        </Pressable>
      </View>
    </View>
  );
}
