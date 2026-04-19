import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { AppMark } from "@/components/AppMark";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthScreen() {
  const enableDemoMode = useAuthStore((state) => state.enableDemoMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!isSupabaseConfigured) {
      enableDemoMode();
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert("Could not sign in", error.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (!isSupabaseConfigured) {
        enableDemoMode();
        return;
      }

      await signInWithGoogle();
    } catch (error) {
      Alert.alert("Google sign-in failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-24 dark:bg-ink">
      <AppMark size={64} />
      <Text className="mt-5 text-4xl font-bold text-black dark:text-white">Spotter</Text>
      <Text className="mt-3 text-base leading-6 text-zinc-600 dark:text-zinc-400">
        Photograph dogs, tag the breed, and build your 50-breed Dogdex.
      </Text>

      <View className="mt-10 gap-3 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
        <Text className="text-lg font-semibold text-black dark:text-white">Sign in</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#71717a"
          className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#71717a"
          className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
        />
        <Pressable onPress={handleEmailAuth} className="rounded-2xl bg-amber px-4 py-3">
          <Text className="text-center font-semibold text-white">{loading ? "Working..." : "Continue with email"}</Text>
        </Pressable>
        <Pressable onPress={handleGoogleAuth} className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-border">
          <Text className="text-center font-semibold text-black dark:text-white">Continue with Google</Text>
        </Pressable>
        <Pressable onPress={enableDemoMode}>
          <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Continue in demo mode while Supabase credentials are being configured
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
