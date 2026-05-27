import { useEffect } from "react";
import { ActivityIndicator, AppState, Linking, Platform, Text, View } from "react-native";

import { AppMark } from "@/components/AppMark";
import { WebPhoneFrame } from "@/components/WebPhoneFrame";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { AppNavigator } from "@/core/navigation/AppNavigator";
import { RootErrorBoundary } from "@/core/RootErrorBoundary";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { fetchFriendshipsForUser } from "@/lib/supabase/friendshipsRemote";
import { recoverWebSessionFromUrl } from "@/lib/supabase/recoverSessionFromUrl";
import { ensureUserProfile } from "@/lib/supabase/profile";
import { refreshFriendsScans } from "@/lib/syncFriendScans";
import { pullAndSyncUserScans } from "@/lib/syncUserScans";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore, waitForSpotterStoreHydration } from "@/store/useSpotterStore";

function RootAppInner() {
  const session = useAuthStore((state) => state.session);
  const isReady = useAuthStore((state) => state.isReady);
  const demoMode = useAuthStore((state) => state.demoMode);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const themeMode = useSpotterStore((state) => state.themeMode);
  const refreshFeaturedBreedForToday = useSpotterStore((state) => state.refreshFeaturedBreedForToday);
  const setCurrentUserIdentity = useSpotterStore((state) => state.setCurrentUserIdentity);
  const refreshBreedsFromRemote = useSpotterStore((state) => state.refreshBreedsFromRemote);
  const setFriendshipsFromServer = useSpotterStore((state) => state.setFriendshipsFromServer);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      try {
        if (Platform.OS === "web") {
          try {
            await recoverWebSessionFromUrl();
          } catch (err) {
            console.warn("[auth] recoverWebSessionFromUrl:", err);
          }
        }
        let session = null as Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
        try {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) console.warn("[auth] refreshSession:", refreshError.message);
          session = refreshed.session ?? null;
        } catch (err) {
          console.warn("[auth] refreshSession threw:", err);
        }
        if (!session) {
          try {
            const { data } = await supabase.auth.getSession();
            session = data.session ?? null;
          } catch (err) {
            console.warn("[auth] getSession threw:", err);
          }
        }
        if (isMounted) {
          setSession(session);
          setReady(true);
        }
      } catch (err) {
        console.warn("[auth] boot failed:", err);
        if (isMounted) setReady(true);
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

  /**
   * Keep the user signed in across days. On native the JS timer is paused while the app is
   * backgrounded, so Supabase's auto-refresh needs to be tied to `AppState` — without this
   * the access token can expire and the user is forced to sign in again. Web handles refresh
   * automatically via the browser timer, so we skip there.
   */
  useEffect(() => {
    if (Platform.OS === "web") {
      const onVisible = () => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          void supabase.auth.refreshSession().then(({ data }) => {
            if (data.session) setSession(data.session);
          });
          const userId = useAuthStore.getState().session?.user?.id;
          if (userId) void pullAndSyncUserScans(userId);
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => document.removeEventListener("visibilitychange", onVisible);
    }

    supabase.auth.startAutoRefresh();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
        void supabase.auth.refreshSession().then(({ data }) => {
          if (data.session) setSession(data.session);
        });
        const userId = useAuthStore.getState().session?.user?.id;
        if (userId) void pullAndSyncUserScans(userId);
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [setSession]);

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
        await waitForSpotterStoreHydration();
      } catch (err) {
        console.warn("[RootApp] waitForSpotterStoreHydration:", err);
      }

      try {
        await ensureUserProfile(session.user);
      } catch {
        /* Best-effort to avoid blocking app load on strict RLS setups. */
      }
      try {
        const db = supabase as any;
        const { data } = await db
          .from("users")
          .select("id,username,avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        const metadata = session.user.user_metadata ?? {};
        setCurrentUserIdentity({
          id: session.user.id,
          username:
            data?.username ?? metadata.username ?? session.user.email?.split("@")[0] ?? null,
          avatarUrl: data?.avatar_url ?? metadata.avatar_url ?? null,
          city: metadata.city ?? null,
          country: metadata.country ?? null,
        });
      } catch (err) {
        console.warn("[RootApp] identity fetch failed:", err);
      }

      try {
        await pullAndSyncUserScans(session.user.id);
      } catch (err) {
        console.warn("[RootApp] Could not sync scans from Supabase:", err);
      }

      try {
        const bundle = await fetchFriendshipsForUser(session.user.id);
        setFriendshipsFromServer(bundle);
      } catch (err) {
        console.warn("[RootApp] Could not load friendships from Supabase:", err);
      }

      try {
        await refreshFriendsScans();
      } catch (err) {
        console.warn("[RootApp] Could not load friends' scans:", err);
      }
    };
    void run();
  }, [session, setCurrentUserIdentity, setFriendshipsFromServer]);

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
                    {__DEV__
                      ? "Supabase not configured. Set Supabase_URL + Supabase_Publishable_Key (or EXPO_PUBLIC_* aliases) in your env, then restart."
                      : "We're having trouble reaching the server. Please refresh in a minute."}
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

export default function RootApp() {
  return (
    <RootErrorBoundary>
      <RootAppInner />
    </RootErrorBoundary>
  );
}
