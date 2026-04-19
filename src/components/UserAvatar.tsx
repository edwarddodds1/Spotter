import { Image, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function UserAvatar({
  username,
  avatarUrl,
  size = 40,
  onPress,
  showEditHint = false,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
  onPress?: () => void;
  /** Small pencil badge (use with onPress). */
  showEditHint?: boolean;
}) {
  const avatar =
    avatarUrl != null ? (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    ) : (
      <View
        className="items-center justify-center rounded-full bg-amber"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <Text className="font-semibold text-white" style={{ fontSize: Math.round(size * 0.36) }}>
          {username.slice(0, 1).toUpperCase()}
        </Text>
      </View>
    );

  const badgeSize = Math.max(22, Math.round(size * 0.36));
  const iconSize = Math.round(badgeSize * 0.45);

  const body = (
    <View className="relative">
      {avatar}
      {showEditHint ? (
        <View
          className="absolute items-center justify-center rounded-full border-2 border-white bg-amber shadow-sm dark:border-zinc-950"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: -2,
            bottom: -2,
          }}
        >
          <MaterialCommunityIcons name="pencil" size={iconSize} color="#ffffff" />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Edit profile photo">
        {body}
      </Pressable>
    );
  }

  return body;
}
