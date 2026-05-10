import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

export function SettingsScreen() {
  const themeMode = useSpotterStore((state) => state.themeMode);
  const setThemeMode = useSpotterStore((state) => state.setThemeMode);
  const signOutDemo = useAuthStore((state) => state.signOutDemo);

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      <View className="px-4 pb-2 pt-4">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
          Notifications and appearance. Sign out from your account on this device.
        </Text>
      </View>

      <View className="mt-4 px-4">
        <View className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-border dark:bg-card">
          <View className="gap-4">
            <SettingRow label="Featured breed alerts" />
            <SettingRow label="League updates" />
            <SettingRow
              label="Dark mode"
              value={themeMode === "dark"}
              onValueChange={(value) => setThemeMode(value ? "dark" : "light")}
            />
          </View>
          <Pressable
            onPress={async () => {
              await supabase.auth.signOut().catch(() => undefined);
              signOutDemo();
            }}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50 py-3.5 dark:border-red-900/50 dark:bg-red-950/30"
          >
            <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
            <Text className="font-semibold text-red-700 dark:text-red-400">Sign out</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value = true,
  onValueChange,
}: {
  label: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/80">
      <Text className="text-black dark:text-white">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
