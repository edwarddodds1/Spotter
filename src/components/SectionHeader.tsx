import { Text, View } from "react-native";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <Text className="text-lg font-semibold text-black dark:text-white">{title}</Text>
      {subtitle ? <Text className="text-xs text-zinc-600 dark:text-zinc-400">{subtitle}</Text> : null}
    </View>
  );
}
