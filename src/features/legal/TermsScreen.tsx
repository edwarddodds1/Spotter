import { ScrollView, Text, View } from "react-native";

import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/features/legal/legalContent";

export function TermsScreen() {
  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ paddingBottom: 64 }}>
      <View className="px-5 pb-4 pt-6">
        <Text className="text-3xl font-black text-black dark:text-white">Terms</Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Last updated {TERMS_LAST_UPDATED}</Text>
      </View>
      <View className="gap-4 px-5">
        {TERMS_SECTIONS.map((section) => (
          <View key={section.heading} className="rounded-3xl border border-zinc-200/80 bg-white p-4 dark:border-border dark:bg-card">
            <Text className="text-base font-semibold text-black dark:text-white">{section.heading}</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">{section.body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
