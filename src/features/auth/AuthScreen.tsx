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
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase not configured", "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
      return;
    }
    if (isSignUp) {
      const nextUsername = username.trim();
      if (!nextUsername) {
        Alert.alert("Username required", "Choose a username to create your account.");
        return;
      }
      if (nextUsername.length < 3 || nextUsername.length > 24) {
        Alert.alert("Username length", "Username must be between 3 and 24 characters.");
        return;
      }
    }

    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert(isSignUp ? "Could not sign up" : "Could not sign in", error.message);
      return;
    }
    if (isSignUp) {
      Alert.alert("Check your email", "We sent a confirmation link. Verify your email, then sign in.");
      setIsSignUp(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert("Supabase not configured", "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Email required", "Enter your email first, then tap Forgot password.");
      return;
    }
    setLoading(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
    setLoading(false);
    if (error) {
      Alert.alert("Reset failed", error.message);
      return;
    }
    Alert.alert("Password reset sent", "Check your inbox for the reset link.");
  };

  const handleGoogleAuth = async () => {
    try {
      if (!isSupabaseConfigured) {
        Alert.alert("Supabase not configured", "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY first.");
        return;
      }

      await signInWithGoogle();
    } catch (error) {
      Alert.alert("Google sign-in failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-24 dark:bg-ink">
      <View className="items-center">
        <View className="rounded-3xl border border-zinc-200 bg-white px-6 py-5 dark:border-border dark:bg-card">
          <AppMark size={76} />
        </View>
        <Text className="mt-6 text-center text-[40px] font-black tracking-tight text-black dark:text-white">Spotter</Text>
        <Text className="mt-2 text-center text-base leading-6 text-zinc-600 dark:text-zinc-400">
          Photograph dogs, tag breeds, and build your Dogdex.
        </Text>
      </View>

      <View className="mt-10 gap-3 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
        <Text className="text-lg font-semibold text-black dark:text-white">{isSignUp ? "Sign up" : "Sign in"}</Text>
        {isSignUp ? (
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Username"
            placeholderTextColor="#71717a"
            className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
          />
        ) : null}
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
          <Text className="text-center font-semibold text-white">
            {loading ? "Working..." : isSignUp ? "Create account" : "Continue with email"}
          </Text>
        </Pressable>
        {!isSignUp ? (
          <Pressable onPress={handleForgotPassword}>
            <Text className="text-center text-sm font-medium text-amber">Forgot password?</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={handleGoogleAuth} className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-border">
          <Text className="text-center font-semibold text-black dark:text-white">Continue with Google</Text>
        </Pressable>
        <Pressable onPress={() => setIsSignUp((current) => !current)}>
          <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </Text>
        </Pressable>
        <Pressable onPress={enableDemoMode}>
          <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Continue in demo mode
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
