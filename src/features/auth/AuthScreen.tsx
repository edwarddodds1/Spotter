import { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";

import { AppMark } from "@/components/AppMark";
import { signInWithGoogle } from "@/lib/supabase/auth";
import { explainAuthNetworkFailure, isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/supabase/profile";
import { getWebAuthRedirectTo } from "@/lib/supabase/redirect";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthScreen() {
  const enableDemoMode = useAuthStore((state) => state.enableDemoMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const ltrInputStyle = { writingDirection: "ltr" as const, textAlign: "left" as const };
  const isWeb = Platform.OS === "web";

  const scrollViewStyle = [
    isWeb ? ({ width: "100%", flexGrow: 1, flexShrink: 1 } satisfies ViewStyle) : undefined,
    /** Web Chromium/Firefox: hide scroll chrome (still scrollable). */
    isWeb ? ({ scrollbarWidth: "none", msOverflowStyle: "none" } as ViewStyle) : undefined,
  ];

  const normalizeEmail = (value: string) => value.trim().toLowerCase();
  const normalizeAuthErrorMessage = (message: string) => {
    const normalized = message.trim().toLowerCase();
    if (normalized.includes("failed to fetch") || normalized.includes("network request failed")) {
      return `Unable to reach Supabase. ${explainAuthNetworkFailure()}`;
    }
    return message;
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleEmailAuth = async () => {
    if (loading) return;
    setAuthError(null);
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
            emailRedirectTo: getWebAuthRedirectTo("/"),
            data: {
              username: nextUsername,
            },
          },
        });

        if (error) {
          const message = normalizeAuthErrorMessage(error.message);
          setAuthError(message);
          Alert.alert("Could not sign up", message);
          return;
        }

        if (data.user?.id && data.session) {
          try {
            await ensureUserProfile(data.user);
          } catch {
            Alert.alert(
              "Account created",
              "Your auth account was created, but profile setup failed. Try signing in once, then update your profile.",
            );
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
        const message = normalizeAuthErrorMessage(error.message);
        setAuthError(message);
        Alert.alert("Could not sign in", message);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        try {
          await ensureUserProfile(sessionData.session.user);
        } catch {
          /* Best-effort; auth succeeded regardless. */
        }
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
    try {
      setAuthError(null);
      setLoading(true);
      const redirectTo = getWebAuthRedirectTo("/");
      const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, redirectTo ? { redirectTo } : undefined);
      if (error) {
        const message = normalizeAuthErrorMessage(error.message);
        setAuthError(message);
        Alert.alert("Reset failed", message);
        return;
      }
    } finally {
      setLoading(false);
    }
    Alert.alert("Password reset sent", "Check your inbox for the reset link.");
  };

  const handleGoogleAuth = async () => {
    try {
      setAuthError(null);
      if (!isSupabaseConfigured) {
        Alert.alert(
          "Supabase not configured",
          "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) first.",
        );
        return;
      }

      await signInWithGoogle();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      const message = normalizeAuthErrorMessage(rawMessage);
      setAuthError(message);
      Alert.alert("Google sign-in failed", message);
    }
  };

  const authScrollContent = (
    <>
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
              onChangeText={(value) => {
                setAuthError(null);
                setUsername(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              style={ltrInputStyle}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              placeholder="Username"
              placeholderTextColor="#71717a"
              className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={(value) => {
              setAuthError(null);
              setEmail(value);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={ltrInputStyle}
            keyboardType="email-address"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Email"
            placeholderTextColor="#71717a"
            className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
          />
          <TextInput
            value={password}
            onChangeText={(value) => {
              setAuthError(null);
              setPassword(value);
            }}
            secureTextEntry
            autoCorrect={false}
            spellCheck={false}
            style={ltrInputStyle}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Password"
            placeholderTextColor="#71717a"
            className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
          />
          <Pressable onPress={handleEmailAuth} disabled={loading} className="rounded-2xl bg-amber px-4 py-3 disabled:opacity-70">
            <Text className="text-center font-semibold text-white">
              {loading ? "Working..." : isSignUp ? "Create account" : "Continue with email"}
            </Text>
          </Pressable>
          {authError ? <Text className="text-sm font-medium text-red-600 dark:text-red-400">{authError}</Text> : null}
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
          <Pressable
            onPress={() => {
              setAuthError(null);
              setIsSignUp((current) => !current);
            }}
            disabled={loading}
          >
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
    </>
  );

  const authScrollProps = {
    className: "flex-1 px-6",
    keyboardShouldPersistTaps: "handled" as const,
    contentContainerStyle: { flexGrow: 1 as const, paddingTop: 20, paddingBottom: 24 },
    style: [...scrollViewStyle, !isWeb ? ({ flexGrow: 1 } satisfies ViewStyle) : undefined],
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-white dark:bg-ink" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView {...authScrollProps}>{authScrollContent}</ScrollView>
    </KeyboardAvoidingView>
  );
}
