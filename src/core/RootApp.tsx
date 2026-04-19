import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppMark } from "@/components/AppMark";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { AppNavigator } from "@/core/navigation/AppNavigator";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

export default function RootApp() {
  const session = useAuthStore((state) => state.session);
  const isReady = useAuthStore((state) => state.isReady);
  const demoMode = useAuthStore((state) => state.demoMode);
  const setSession = useAuthStore((state) => state.setSession);
  const setReady = useAuthStore((state) => state.setReady);
  const themeMode = useSpotterStore((state) => state.themeMode);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
        setReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setReady, setSession]);

  useEffect(() => {
    setColorScheme(themeMode);
  }, [setColorScheme, themeMode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
        {!isReady ? (
          <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
            <AppMark size={72} />
            <ActivityIndicator style={{ marginTop: 20 }} color="#BA7517" />
            <Text className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading Spotter...</Text>
          </View>
        ) : session || demoMode ? (
          <>
            {!isSupabaseConfigured ? (
              <View className="bg-amber px-4 py-2">
                <Text className="text-center text-xs font-semibold text-white">
                  Demo mode active until Supabase env variables are set.
                </Text>
              </View>
            ) : null}
            <AppNavigator />
          </>
        ) : (
          <AuthScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
