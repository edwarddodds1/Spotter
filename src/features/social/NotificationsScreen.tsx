import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { UserAvatar } from "@/components/UserAvatar";
import { openUserProfileNavigate } from "@/components/UsernameLink";
import { palette } from "@/constants/theme";
import type { RootStackParamList } from "@/core/navigation/types";
import { markAllNotificationsRead } from "@/lib/supabase/notificationsRemote";
import { refreshNotifications } from "@/lib/syncNotifications";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { AppNotification, NotificationKind } from "@/types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

const KIND_COPY: Record<NotificationKind, { title: (actor: string) => string; cta: string }> = {
  friend_request: {
    title: (a) => `${a} sent you a friend request`,
    cta: "Review request",
  },
  friend_request_accepted: {
    title: (a) => `${a} accepted your friend request`,
    cta: "View profile",
  },
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const delta = Date.now() - t;
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsScreen({ navigation }: Props) {
  const session = useAuthStore((s) => s.session);
  const myUserId = session?.user?.id ?? null;
  const notifications = useSpotterStore((s) => s.notifications);
  const markAllNotificationsReadLocal = useSpotterStore((s) => s.markAllNotificationsRead);

  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = useMemo(() => notifications.some((n) => n.readAt === null), [notifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, []),
  );

  useEffect(() => {
    if (!myUserId || !hasUnread) return;
    markAllNotificationsReadLocal();
    void markAllNotificationsRead(myUserId);
  }, [hasUnread, markAllNotificationsReadLocal, myUserId]);

  const openActor = useCallback(
    (notification: AppNotification) => {
      if (!notification.actor) return;
      openUserProfileNavigate(navigation as any, myUserId, notification.actor.id);
    },
    [myUserId, navigation],
  );

  const openCta = useCallback(
    (notification: AppNotification) => {
      if (notification.kind === "friend_request") {
        navigation.navigate("Friends");
      } else if (notification.kind === "friend_request_accepted") {
        if (notification.actor) {
          openUserProfileNavigate(navigation as any, myUserId, notification.actor.id);
        }
      }
    },
    [myUserId, navigation],
  );

  return (
    <ScrollView
      className="flex-1 bg-zinc-50 dark:bg-ink"
      contentContainerStyle={{ paddingBottom: 64, paddingTop: 4 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.amber} />}
    >
      <View className="px-4 pt-4">
        <Text className="text-3xl font-bold text-black dark:text-white">Notifications</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Activity from friends, requests, and accepted invites.
        </Text>
      </View>

      <View className="mt-5 px-4">
        {notifications.length === 0 ? (
          <View className="items-center rounded-3xl border border-dashed border-zinc-300 bg-white py-12 dark:border-border dark:bg-card">
            <MaterialCommunityIcons name="bell-outline" size={28} color={palette.muted} />
            <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
              You're all caught up.
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const actorName = n.actor?.username ?? "Someone";
            const copy = KIND_COPY[n.kind];
            return (
              <View
                key={n.id}
                className={`mb-2 flex-row items-center gap-3 rounded-3xl border px-3 py-3 ${
                  n.readAt
                    ? "border-zinc-200 bg-white dark:border-border dark:bg-card"
                    : "border-amber/30 bg-amber/5 dark:border-amber/40 dark:bg-amber/10"
                }`}
              >
                <Pressable
                  onPress={() => openActor(n)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${actorName}'s profile`}
                >
                  <UserAvatar username={actorName} avatarUrl={n.actor?.avatarUrl ?? null} size={42} />
                </Pressable>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm text-black dark:text-white" numberOfLines={2}>
                    {copy.title(actorName)}
                  </Text>
                  <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatRelative(n.createdAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => openCta(n)}
                  className="rounded-full bg-amber px-3 py-1.5 active:opacity-90"
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-semibold text-white">{copy.cta}</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
