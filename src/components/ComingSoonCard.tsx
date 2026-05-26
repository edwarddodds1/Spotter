import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { palette } from "@/constants/theme";

type Props = {
  title: string;
  body: string;
};

export function ComingSoonCard({ title, body }: Props) {
  return (
    <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-border dark:bg-card">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-amber/15">
        <MaterialCommunityIcons name="clock-outline" size={26} color={palette.amber} />
      </View>
      <Text className="text-xl font-bold text-black dark:text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{body}</Text>
    </View>
  );
}
