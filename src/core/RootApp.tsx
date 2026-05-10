import { useEffect } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";

import { AppMark } from "@/components/AppMark";
import { WebPhoneFrame } from "@/components/WebPhoneFrame";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { AppNavigator } from "@/core/navigation/AppNavigator";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { recoverWebSessionFromUrl } from "@/lib/supabase/recoverSessionFromUrl";
import { ensureUserProfile } from "@/lib/supabase/profile";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

export default function RootApp() {
  const session = useAuthStore((state) => state.session);
  const isReady = useAuthStore((state) => state.isReady);
  const demoMode = useAuthStore((state) => state.demoMode);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const themeMode = useSpotterStore((state) => state.themeMode);
  const refreshFeaturedBreedForToday = useSpotterStore((state) => state.refreshFeaturedBreedForToday);
  const setCurrentUserIdentity = useSpotterStore((state) => state.setCurrentUserIdentity);
  const refreshBreedsFromRemote = useSpotterStore((state) => state.refreshBreedsFromRemote);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      if (Platform.OS === "web") {
        await recoverWebSessionFromUrl();
      }
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session);
        setReady(true);
      }
    };

    void boot();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setReady, setSession]);

  /** Email confirmation / magic link on native: open app via `spotter://auth/callback#access_token=…`. */
  useEffect(() => {
    if (Platform.OS === "web") return;

    const applyUrl = async (url: string | null) => {
      if (!url) return;
      const codeMatch = url.match(/[?&#]code=([^&]+)/);
      if (codeMatch?.[1]) {
        const code = decodeURIComponent(codeMatch[1]);
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }
      const hashIdx = url.indexOf("#");
      const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
      const params = new URLSearchParams(hash);
      let access_token = params.get("access_token");
      let refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) {
        const matchA = url.match(/access_token=([^&]+)/);
        const matchR = url.match(/refresh_token=([^&]+)/);
        access_token = matchA?.[1] ?? null;
        refresh_token = matchR?.[1] ?? null;
      }
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    };

    void Linking.getInitialURL().then(applyUrl);
    const sub = Linking.addEventListener("url", (e) => void applyUrl(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setColorScheme(themeMode);
  }, [setColorScheme, themeMode]);

  useEffect(() => {
    if (!session?.user || !isSupabaseConfigured) return;
    void refreshBreedsFromRemote();
  }, [session?.user?.id, refreshBreedsFromRemote]);

  useEffect(() => {
    if (!session?.user) return;
    const run = async () => {
      try {
        await ensureUserProfile(session.user);
      } catch {
        /* Best-effort to avoid blocking app load on strict RLS setups. */
      }
      const db = supabase as any;
      const { data } = await db.from("users").select("id,username,avatar_url").eq("id", session.user.id).maybeSingle();
      const metadata = session.user.user_metadata ?? {};
      setCurrentUserIdentity({
        id: session.user.id,
        username: data?.username ?? metadata.username ?? session.user.email?.split("@")[0] ?? null,
        avatarUrl: data?.avatar_url ?? metadata.avatar_url ?? null,
        city: metadata.city ?? null,
        country: metadata.country ?? null,
      });
    };
    void run();
  }, [session, setCurrentUserIdentity]);

  useEffect(() => {
    refreshFeaturedBreedForToday();
    const timer = setInterval(() => {
      useSpotterStore.getState().refreshFeaturedBreedForToday();
    }, 60_000);
    return () => clearInterval(timer);
  }, [refreshFeaturedBreedForToday]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
        <WebPhoneFrame>
          {!isReady ? (
            <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
              <AppMark size={72} />
              <ActivityIndicator style={{ marginTop: 20 }} color="#BA7517" />
              <Text className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading Spotter...</Text>
            </View>
          ) : session || demoMode ? (
            <View style={{ flex: 1 }}>
              {!isSupabaseConfigured ? (
                <View className="bg-amber px-4 py-2">
                  <Text className="text-center text-xs font-semibold text-white">
                    Supabase not configured in this build. On Vercel set Supabase_URL and
                    Supabase_Publishable_Key (or EXPO_PUBLIC_* / SUPABASE_*), then redeploy.
                  </Text>
                </View>
              ) : null}
              <AppNavigator />
            </View>
          ) : (
            <AuthScreen />
          )}
        </WebPhoneFrame>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
