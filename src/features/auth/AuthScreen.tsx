import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppMark } from "@/components/AppMark";
import { friendlyAuthErrorMessage } from "@/lib/authErrorMessages";
import { signInWithApple, signInWithGoogle } from "@/lib/supabase/auth";
import { explainAuthNetworkFailure, isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/supabase/profile";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const authRedirectNotice = useAuthStore((state) => state.authRedirectNotice);
  const setAuthRedirectNotice = useAuthStore((state) => state.setAuthRedirectNotice);
  const setAuthSession = useAuthStore((state) => state.setSession);
  const setAuthReady = useAuthStore((state) => state.setReady);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  /** Extra scroll padding when keyboard is open — avoids shrinking the layout (no KeyboardAvoidingView). */
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const isWeb = Platform.OS === "web";
  /**
   * Force LTR + left-align so RTL system locales don't reverse the input.
   * `fontSize: 16` is critical on iOS Safari — anything smaller triggers the
   * zoom-on-focus that makes inputs feel broken on phone-sized browsers.
   */
  const inputBaseStyle = {
    writingDirection: "ltr" as const,
    textAlign: "left" as const,
    fontSize: 16,
  };

  useEffect(() => {
    /** Android uses `softwareKeyboardLayoutMode: "pan"` so the window pans — avoid extra inset + listeners. */
    if (isWeb || Platform.OS !== "ios") return;
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      setKeyboardBottomInset(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardBottomInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isWeb]);

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
    return friendlyAuthErrorMessage(message);
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const showAuthError = (message: string) => {
    setAuthInfo(null);
    setAuthError(normalizeAuthErrorMessage(message));
  };

  const showAuthInfo = (message: string) => {
    setAuthError(null);
    setAuthInfo(message);
  };

  const clearAuthMessages = () => {
    setAuthError(null);
    setAuthInfo(null);
  };

  useEffect(() => {
    if (!authRedirectNotice) return;
    showAuthError(authRedirectNotice);
    setAuthRedirectNotice(null);
  }, [authRedirectNotice, setAuthRedirectNotice]);

  const handleEmailAuth = async () => {
    if (loading) return;
    clearAuthMessages();
    if (!isSupabaseConfigured) {
      showAuthError(
        "Supabase is not configured. Set Supabase_URL and Supabase_Publishable_Key (or EXPO_PUBLIC_* / SUPABASE_*), then rebuild.",
      );
      return;
    }

    const nextEmail = normalizeEmail(email);
    const nextPassword = password.trim();
    if (!nextEmail || !nextPassword) {
      showAuthError("Enter both email and password.");
      return;
    }
    if (!isValidEmail(nextEmail)) {
      showAuthError("Enter a valid email address.");
      return;
    }
    if (nextPassword.length < 6) {
      showAuthError("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp) {
      const nextUsername = username.trim();
      if (!nextUsername) {
        showAuthError("Choose a username to create your account.");
        return;
      }
      if (nextUsername.length < 3 || nextUsername.length > 24) {
        showAuthError("Username must be between 3 and 24 characters.");
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
            data: {
              username: nextUsername,
            },
          },
        });

        if (error) {
          showAuthError(error.message);
          return;
        }

        if (data.user?.id && data.session) {
          try {
            await ensureUserProfile(data.user);
          } catch {
            /* Profile row is best-effort; still enter the app. */
          }
          setAuthSession(data.session);
          setAuthReady(true);
          clearAuthMessages();
          return;
        }

        showAuthError("Sign-up succeeded but no session was returned. Try signing in.");
        setIsSignUp(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: nextEmail,
        password: nextPassword,
      });
      if (signInError) {
        showAuthError(signInError.message);
        return;
      }
      let session: Session | null = signInData.session ?? null;
      if (!session?.user) {
        const { data: refreshed } = await supabase.auth.getSession();
        session = refreshed.session ?? null;
      }
      if (!session?.user) {
        showAuthError("Sign-in did not return a session. Try again or confirm your email if required.");
        return;
      }
      const activeSession = session;
      try {
        await ensureUserProfile(activeSession.user);
      } catch {
        /* Best-effort; auth succeeded regardless. */
      }
      setAuthSession(activeSession);
      setAuthReady(true);
      clearAuthMessages();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong. Try again.";
      showAuthError(raw);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      clearAuthMessages();
      if (!isSupabaseConfigured) {
        showAuthError(
          "Supabase is not configured. Set Supabase_URL and Supabase_Publishable_Key (or EXPO_PUBLIC_* / SUPABASE_*), then rebuild.",
        );
        return;
      }

      await signInWithGoogle();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      showAuthError(rawMessage);
    }
  };

  const handleAppleAuth = async () => {
    try {
      clearAuthMessages();
      if (!isSupabaseConfigured) {
        showAuthError(
          "Supabase is not configured. Set Supabase_URL and Supabase_Publishable_Key (or EXPO_PUBLIC_* / SUPABASE_*), then rebuild.",
        );
        return;
      }

      await signInWithApple();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown error";
      showAuthError(rawMessage);
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
                clearAuthMessages();
                setUsername(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="username"
              textContentType="username"
              style={inputBaseStyle}
              returnKeyType="next"
              blurOnSubmit={false}
              placeholder="Username"
              placeholderTextColor="#71717a"
              className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={(value) => {
              clearAuthMessages();
              setEmail(value);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="email"
            textContentType="emailAddress"
            inputMode="email"
            style={inputBaseStyle}
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            placeholder="Email"
            placeholderTextColor="#71717a"
            className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
          />
          <TextInput
            value={password}
            onChangeText={(value) => {
              clearAuthMessages();
              setPassword(value);
            }}
            secureTextEntry
            autoCorrect={false}
            spellCheck={false}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            textContentType={isSignUp ? "newPassword" : "password"}
            style={inputBaseStyle}
            returnKeyType={isWeb ? "go" : "done"}
            blurOnSubmit
            onSubmitEditing={() => {
              if (!loading) void handleEmailAuth();
            }}
            placeholder="Password"
            placeholderTextColor="#71717a"
            className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
          />
          <Pressable
            onPress={() => void handleEmailAuth()}
            disabled={loading}
            accessibilityRole="button"
            className="rounded-2xl bg-amber px-4 py-3 disabled:opacity-70"
          >
            <Text className="text-center font-semibold text-white">
              {loading ? "Working..." : isSignUp ? "Create account" : "Continue with email"}
            </Text>
          </Pressable>
          {authInfo ? (
            <Text className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{authInfo}</Text>
          ) : null}
          {authError ? <Text className="text-sm font-medium text-red-600 dark:text-red-400">{authError}</Text> : null}
          <View className="my-1 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-zinc-200 dark:bg-border" />
            <Text className="text-xs font-medium uppercase tracking-wide text-zinc-400">or</Text>
            <View className="h-px flex-1 bg-zinc-200 dark:bg-border" />
          </View>
          <Pressable
            onPress={handleAppleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 disabled:opacity-70"
          >
            <MaterialCommunityIcons name="apple" size={18} color="#ffffff" style={{ marginTop: -1 }} />
            <Text className="text-center font-semibold text-white">Continue with Apple</Text>
          </Pressable>
          <Pressable
            onPress={handleGoogleAuth}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            className="flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-border disabled:opacity-70"
          >
            <MaterialCommunityIcons name="google" size={18} color="#71717a" />
            <Text className="text-center font-semibold text-black dark:text-white">Continue with Google</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              clearAuthMessages();
              setIsSignUp((current) => !current);
            }}
            disabled={loading}
          >
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Text>
          </Pressable>
        </View>
        <Text className="mt-4 px-2 text-center text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          By continuing you agree to Spotter&apos;s Terms and Privacy Policy, including a zero-tolerance
          policy for objectionable content and abusive behaviour. Full text is in the app under Settings.
        </Text>
    </>
  );

  const scrollBottomPad = 24 + insets.bottom + (Platform.OS === "ios" ? keyboardBottomInset : 0);

  const authScrollProps = {
    className: "flex-1 px-6",
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
    contentContainerStyle: { flexGrow: 1 as const, paddingTop: 20, paddingBottom: scrollBottomPad },
    style: [...scrollViewStyle, !isWeb ? ({ flexGrow: 1 } satisfies ViewStyle) : undefined],
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  };

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <ScrollView {...authScrollProps}>{authScrollContent}</ScrollView>
    </View>
  );
}
