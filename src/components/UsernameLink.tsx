import { Pressable, Text, type TextStyle, View, type ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";

import { UserAvatar } from "@/components/UserAvatar";
import type { RootStackParamList } from "@/core/navigation/types";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Tappable text + (optional) avatar that opens the user's profile screen.
 * Tapping yourself navigates to the Profile tab instead of pushing a new screen.
 */

type RootNav = NavigationProp<RootStackParamList>;

type Common = {
  userId: string;
  username: string;
};

export function openUserProfileNavigate(
  navigation: NavigationProp<RootStackParamList & { Tabs: undefined }>,
  myUserId: string | null | undefined,
  userId: string,
) {
  if (myUserId && myUserId === userId) {
    (navigation as any).navigate("Tabs", { screen: "ProfileTab" });
    return;
  }
  navigation.navigate("UserProfile", { userId });
}

export function UsernameTextLink({
  userId,
  username,
  className,
  numberOfLines,
  style,
}: Common & {
  className?: string;
  numberOfLines?: number;
  style?: TextStyle;
}) {
  const navigation = useNavigation<RootNav>();
  const myUserId = useAuthStore((s) => s.session?.user?.id ?? null);
  return (
    <Pressable
      onPress={() => openUserProfileNavigate(navigation, myUserId, userId)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${username}'s profile`}
    >
      <Text className={className} numberOfLines={numberOfLines} style={style}>
        {username}
      </Text>
    </Pressable>
  );
}

export function UsernameRowLink({
  userId,
  username,
  avatarUrl,
  size = 40,
  rightSlot,
  subtitle,
}: Common & {
  avatarUrl: string | null;
  size?: number;
  rightSlot?: React.ReactNode;
  subtitle?: string;
}) {
  const navigation = useNavigation<RootNav>();
  const myUserId = useAuthStore((s) => s.session?.user?.id ?? null);
  const containerStyle: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12 };
  return (
    <Pressable
      onPress={() => openUserProfileNavigate(navigation, myUserId, userId)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${username}'s profile`}
      className="min-w-0 flex-1"
      style={containerStyle}
    >
      <UserAvatar username={username} avatarUrl={avatarUrl} size={size} />
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
          {username}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot}
    </Pressable>
  );
}
