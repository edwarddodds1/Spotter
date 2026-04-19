import { Text, View } from "react-native";

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
      <Text className="text-lg font-semibold text-black dark:text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{message}</Text>
    </View>
  );
}
