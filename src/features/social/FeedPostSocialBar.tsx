import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { FEED_REACTION_OPTIONS, MAX_FEED_COMMENT_LENGTH } from "@/constants/feedSocial";
import { palette } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { FeedReactionKind, UserProfile } from "@/types/app";

function lookupUser(userId: string, currentUser: UserProfile, friends: UserProfile[]): UserProfile | null {
  if (userId === currentUser.id) return currentUser;
  return friends.find((f) => f.id === userId) ?? null;
}

export function FeedPostSocialBar({ scanId }: { scanId: string }) {
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

  const myKind = useMemo(
    () => reactions.find((r) => r.userId === currentUser.id)?.kind,
    [reactions, currentUser.id],
  );

  const counts = useMemo(() => {
    const m = new Map<FeedReactionKind, number>();
    for (const r of reactions) {
      m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    }
    return m;
  }, [reactions]);

  return (
    <View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {FEED_REACTION_OPTIONS.map(({ kind, emoji, accessibilityLabel }) => {
          const count = counts.get(kind) ?? 0;
          const active = myKind === kind;
          return (
            <Pressable
              key={kind}
              onPress={() => toggleFeedReaction(scanId, kind)}
              className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1.5 ${
                active ? "border-amber bg-amber/15" : "border-zinc-200 bg-zinc-50 dark:border-border dark:bg-zinc-900"
              }`}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
            >
              <Text className="text-base">{emoji}</Text>
              {count > 0 ? (
                <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {comments.length > 0 ? (
        <View className="mt-4 gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Comments ({comments.length})
          </Text>
          {comments.map((c) => {
            const author = lookupUser(c.userId, currentUser, friends);
            const isMine = c.userId === currentUser.id;
            return (
              <View key={c.id} className="flex-row gap-2">
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <Text className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    {(author?.username ?? "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950/80">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300" numberOfLines={1}>
                      {author?.username ?? "Someone"}
                    </Text>
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

      <View className="mt-4 flex-row items-end gap-2">
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, MAX_FEED_COMMENT_LENGTH))}
          placeholder="Add a comment…"
          placeholderTextColor="#71717a"
          multiline
          className="max-h-24 min-h-[44px] flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-black dark:border-border dark:bg-zinc-950 dark:text-white"
        />
        <Pressable
          onPress={() => {
            if (!draft.trim()) return;
            addFeedComment(scanId, draft);
            setDraft("");
          }}
          className="rounded-2xl bg-amber px-4 py-3"
        >
          <Text className="text-sm font-semibold text-white">Post</Text>
        </Pressable>
      </View>
    </View>
  );
}
