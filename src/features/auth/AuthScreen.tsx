import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

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

  const getWebRedirectTo = () =>
    typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined;

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailAuth = async () => {
    if (loading) return;
    if (!isSupabaseConfigured) {
      Alert.alert(
        "Supabase not configured",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) first.",
      );
      return;
    }

    const nextEmail = normalizeEmail(email);
    const nextPassword = password.trim();
    if (!nextEmail || !nextPassword) {
      Alert.alert("Missing details", "Enter both email and password.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    if (nextPassword.length < 6) {
      Alert.alert("Password too short", "Password must be at least 6 characters.");
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

    try {
      setLoading(true);
      if (isSignUp) {
        const nextUsername = username.trim();
        const { data, error } = await supabase.auth.signUp({
          email: nextEmail,
          password: nextPassword,
          options: {
            emailRedirectTo: getWebRedirectTo(),
            data: {
              username: nextUsername,
            },
          },
        });

        if (error) {
          Alert.alert("Could not sign up", error.message);
          return;
        }

        if (data.user?.id && data.session) {
          const db = supabase as any;
          const { error: profileError } = await db.from("users").upsert(
            {
              id: data.user.id,
              username: nextUsername,
            },
            { onConflict: "id" },
          );
          if (profileError) {
            Alert.alert(
              "Account created",
              "Your auth account was created, but profile setup failed. Try signing in once, then update your profile.",
            );
            return;
          }
          Alert.alert("Account created", "You are now signed in.");
          return;
        }

        Alert.alert("Check your email", "We sent a confirmation link. Verify your email, then sign in.");
        setIsSignUp(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: nextEmail, password: nextPassword });
      if (error) {
        Alert.alert("Could not sign in", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        "Supabase not configured",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) first.",
      );
      return;
    }
    const nextEmail = normalizeEmail(email);
    if (!nextEmail) {
      Alert.alert("Email required", "Enter your email first, then tap Forgot password.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
    setLoading(true);
    const redirectTo = getWebRedirectTo();
    const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, redirectTo ? { redirectTo } : undefined);
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
        Alert.alert(
          "Supabase not configured",
          "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) first.",
        );
        return;
      }

      await signInWithGoogle();
    } catch (error) {
      Alert.alert("Google sign-in failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white dark:bg-ink" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 20, paddingBottom: 24 }}
      >
        <View className="items-center">
          <View className="rounded-3xl border border-zinc-200 bg-white px-5 py-4 dark:border-border dark:bg-card">
            <AppMark size={70} />
          </View>
          <Text className="mt-4 text-center text-[38px] font-black tracking-tight text-black dark:text-white">Spotter</Text>
          <Text className="mt-2 text-center text-base leading-6 text-zinc-600 dark:text-zinc-400">
            Photograph dogs, tag breeds, and build your Dogdex.
          </Text>
        </View>

        <View className="mt-6 gap-3 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-border dark:bg-card">
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
          <Pressable onPress={handleEmailAuth} disabled={loading} className="rounded-2xl bg-amber px-4 py-3 disabled:opacity-70">
            <Text className="text-center font-semibold text-white">
              {loading ? "Working..." : isSignUp ? "Create account" : "Continue with email"}
            </Text>
          </Pressable>
          {!isSignUp ? (
            <Pressable onPress={handleForgotPassword} disabled={loading}>
              <Text className="text-center text-sm font-medium text-amber">Forgot password?</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleGoogleAuth}
            disabled={loading}
            className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-border disabled:opacity-70"
          >
            <Text className="text-center font-semibold text-black dark:text-white">Continue with Google</Text>
          </Pressable>
          <Pressable onPress={() => setIsSignUp((current) => !current)} disabled={loading}>
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Text>
          </Pressable>
          <Pressable onPress={enableDemoMode} disabled={loading}>
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Continue in demo mode
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
