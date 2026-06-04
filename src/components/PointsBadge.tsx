import { Text, View } from "react-native";

import { palette } from "@/constants/theme";

export function PointsBadge({ points, featured }: { points: number; featured?: boolean }) {
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: featured ? palette.amber : "#262626" }}>
      <Text className="text-xs font-semibold text-white">{points} pts</Text>
    </View>
  );
}
