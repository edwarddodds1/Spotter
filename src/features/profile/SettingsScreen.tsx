import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { RootStackParamList } from "@/core/navigation/types";
import { deleteAccount } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const themeMode = useSpotterStore((state) => state.themeMode);
  const setThemeMode = useSpotterStore((state) => state.setThemeMode);
  const signOut = useAuthStore((state) => state.signOut);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteOpen(false);
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        Alert.alert("Couldn't delete account", result.message);
        return;
      }
      await supabase.auth.signOut().catch(() => undefined);
      signOut();
    } finally {
      setDeleting(false);
    }
  };

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
              description="Off uses the light cream theme with the moss-green accent. On uses the dark grey theme."
              value={themeMode === "dark"}
              onValueChange={(value) => setThemeMode(value ? "dark" : "light")}
            />
          </View>
          <Pressable
            onPress={async () => {
              await supabase.auth.signOut().catch(() => undefined);
              signOut();
            }}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50 py-3.5 dark:border-red-900/50 dark:bg-red-950/30"
          >
            <MaterialCommunityIcons name="logout" size={18} color="#dc2626" />
            <Text className="font-semibold text-red-700 dark:text-red-400">Sign out</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-6 px-4">
        <View className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-border dark:bg-card">
          <Text className="text-sm font-semibold text-black dark:text-white">Delete account</Text>
          <Text className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Permanently delete your account, scans, and profile. This can't be undone.
          </Text>
          <Pressable
            onPress={() => setDeleteOpen(true)}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 active:opacity-90 disabled:opacity-60 dark:bg-red-700"
          >
            {deleting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ffffff" />
            )}
            <Text className="font-semibold text-white">{deleting ? "Deleting…" : "Delete account"}</Text>
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

      <ConfirmDialog
        visible={deleteOpen}
        title="Delete your account?"
        message="This permanently deletes your account, scans, photos, and profile across all your devices. This cannot be undone."
        confirmLabel="Delete account"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
      />
    </ScrollView>
  );
}

function SettingRow({
  label,
  description,
  value = true,
  onValueChange,
  comingSoon = false,
}: {
  label: string;
  description?: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  comingSoon?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/80">
      <View className="mr-3 flex-1">
        <Text className="text-black dark:text-white">{label}</Text>
        {comingSoon ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Coming soon</Text>
        ) : description ? (
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</Text>
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
