import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppMark } from "@/components/AppMark";
import { DogdexScreen } from "@/features/dogdex/DogdexScreen";
import { BreedDetailScreen } from "@/features/dogdex/BreedDetailScreen";
import { PendingScanDetailScreen } from "@/features/dogdex/PendingScanDetailScreen";
import { LeaguesScreen } from "@/features/leagues/LeaguesScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { SocialScreen } from "@/features/social/SocialScreen";
import { DogProfileScreen } from "@/features/social/DogProfileScreen";
import { FriendsScreen } from "@/features/social/FriendsScreen";
import { TopDogsScreen } from "@/features/social/TopDogsScreen";
import { BreedSelectorScreen } from "@/features/spot/BreedSelectorScreen";
import { DogNamingScreen } from "@/features/spot/DogNamingScreen";
import { SpotCameraScreen } from "@/features/spot/SpotCameraScreen";
import type { RootStackParamList, TabParamList } from "@/core/navigation/types";
import { useSpotterStore } from "@/store/useSpotterStore";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs({ themeMode }: { themeMode: "light" | "dark" }) {
  const isDark = themeMode === "dark";
  const iconByRoute: Record<keyof TabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
    DogdexTab: "dog",
    SocialTab: "account-group",
    SpotTab: "camera",
    LeaguesTab: "podium",
    ProfileTab: "account",
  };

  const labelByRoute: Record<keyof TabParamList, string> = {
    DogdexTab: "Dogdex",
    SocialTab: "Social",
    SpotTab: "Spot",
    LeaguesTab: "Leagues",
    ProfileTab: "Profile",
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#0b0b0b" : "#ffffff",
          borderTopColor: isDark ? "#2a2a2a" : "#d4d4d4",
          height: 84,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabel: ({ focused }) => (
          <Text
            style={{
              color: focused ? (isDark ? "#ffffff" : "#111111") : isDark ? "#a0a0a0" : "#7a7a7a",
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
            }}
          >
            {labelByRoute[route.name]}
          </Text>
        ),
        tabBarIcon: ({ focused }) => {
          if (route.name === "DogdexTab") {
            return (
              <View
                style={{
                  width: 30,
                  height: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppMark size={26} style={{ opacity: focused ? 1 : isDark ? 0.55 : 0.5 }} />
              </View>
            );
          }
          return (
            <View
              style={{
                width: route.name === "SpotTab" ? 54 : 30,
                height: route.name === "SpotTab" ? 54 : 30,
                borderRadius: 26,
                backgroundColor: route.name === "SpotTab" ? (isDark ? "#ffffff" : "#0b0b0b") : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: route.name === "SpotTab" ? -16 : 0,
                borderWidth: route.name === "SpotTab" ? 2 : 0,
                borderColor: route.name === "SpotTab" ? (isDark ? "#0b0b0b" : "#ffffff") : "transparent",
              }}
            >
              <MaterialCommunityIcons
                name={iconByRoute[route.name]}
                size={route.name === "SpotTab" ? 24 : 22}
                color={
                  route.name === "SpotTab"
                    ? isDark
                      ? "#0b0b0b"
                      : "#ffffff"
                    : focused
                      ? isDark
                        ? "#ffffff"
                        : "#111111"
                      : isDark
                        ? "#a0a0a0"
                        : "#7a7a7a"
                }
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="DogdexTab" component={DogdexScreen} />
      <Tab.Screen name="SocialTab" component={SocialScreen} />
      <Tab.Screen name="SpotTab" component={SpotCameraScreen} />
      <Tab.Screen name="LeaguesTab" component={LeaguesScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const themeMode = useSpotterStore((state) => state.themeMode);
  const isDark = themeMode === "dark";
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: isDark ? "#0b0b0b" : "#ffffff",
      card: isDark ? "#0b0b0b" : "#ffffff",
      text: isDark ? "#ffffff" : "#111111",
      border: isDark ? "#2a2a2a" : "#d4d4d4",
      primary: isDark ? "#ffffff" : "#111111",
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? "#0b0b0b" : "#ffffff" },
          headerTintColor: isDark ? "#ffffff" : "#111111",
          contentStyle: { backgroundColor: isDark ? "#0b0b0b" : "#ffffff" },
        }}
      >
        <Stack.Screen name="Tabs" options={{ headerShown: false }}>
          {() => <Tabs themeMode={themeMode} />}
        </Stack.Screen>
        <Stack.Screen name="BreedSelector" component={BreedSelectorScreen} options={{ title: "Select Breed" }} />
        <Stack.Screen name="DogNaming" component={DogNamingScreen} options={{ title: "Name Dog" }} />
        <Stack.Screen name="BreedDetail" component={BreedDetailScreen} options={{ title: "Breed Detail" }} />
        <Stack.Screen name="PendingScanDetail" component={PendingScanDetailScreen} options={{ title: "Tag Scan" }} />
        <Stack.Screen name="Friends" component={FriendsScreen} options={{ title: "Friends" }} />
        <Stack.Screen name="DogProfile" component={DogProfileScreen} options={{ title: "Dog Profile" }} />
        <Stack.Screen name="TopDogs" component={TopDogsScreen} options={{ title: "Top Dogs" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
