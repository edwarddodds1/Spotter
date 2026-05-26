import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootStackParamList } from "@/core/navigation/types";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
            <SettingRow label="Featured breed alerts" comingSoon />
            <SettingRow label="League updates" comingSoon />
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

      <View className="mt-6 flex-row justify-center gap-6 px-4">
        <Pressable onPress={() => navigation.navigate("Privacy")}>
          <Text className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">Privacy</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Terms")}>
          <Text className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">Terms</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value = true,
  onValueChange,
  comingSoon = false,
}: {
  label: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  comingSoon?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/80">
      <View>
        <Text className="text-black dark:text-white">{label}</Text>
        {comingSoon ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Coming soon</Text>
        ) : null}
      </View>
      {comingSoon ? (
        <Switch value={false} disabled />
      ) : (
        <Switch value={value} onValueChange={onValueChange} />
      )}
    </View>
  );
}
