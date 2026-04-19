import { Text, View } from "react-native";

export function PointsBadge({ points, featured }: { points: number; featured?: boolean }) {
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: featured ? "#BA7517" : "#202020" }}>
      <Text className="text-xs font-semibold text-white">{points} pts</Text>
    </View>
  );
}
