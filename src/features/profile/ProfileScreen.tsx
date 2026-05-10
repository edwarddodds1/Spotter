import { useMemo, useState } from "react";
import { Alert, Image, Keyboard, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootStackParamList } from "@/core/navigation/types";

import { AvatarEditorModal } from "@/components/AvatarEditorModal";
import { BadgeTile } from "@/components/BadgeTile";
import { UserAvatar } from "@/components/UserAvatar";
import { DOGDEX_TOTAL } from "@/constants/app";
import { badgeDisplayOrder } from "@/constants/badges";
import { palette } from "@/constants/theme";
import { deleteSpot, updateScanPrivacy } from "@/features/spot/spotService";
import { ProfileMyDogsSection } from "@/features/profile/ProfileMyDogsSection";
import { ProfileScanMap } from "@/features/profile/ProfileScanMap";
import { supabase } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";
import { useAuthStore } from "@/store/useAuthStore";
import { selectCollectedBreedIds, useSpotterStore } from "@/store/useSpotterStore";
import type { BadgeType } from "@/types/app";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUser = useSpotterStore((state) => state.currentUser);
  const scans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);
  const earnedBadges = useSpotterStore((state) => state.badges);
  const leagues = useSpotterStore((state) => state.leagues);
  const weeklyPoints = useSpotterStore((state) => state.weeklyPoints);
  const friends = useSpotterStore((state) => state.friends);
  const setAvatar = useSpotterStore((state) => state.setAvatar);
  const setUsername = useSpotterStore((state) => state.setUsername);
  const setUserLocation = useSpotterStore((state) => state.setUserLocation);
  const authSession = useAuthStore((state) => state.session);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftUsername, setDraftUsername] = useState(currentUser.username);
  const [draftCity, setDraftCity] = useState(currentUser.city);
  const [draftCountry, setDraftCountry] = useState(currentUser.country);
  const [avatarEditorVisible, setAvatarEditorVisible] = useState(false);
  const [avatarPick, setAvatarPick] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [avatarSourceSheetVisible, setAvatarSourceSheetVisible] = useState(false);

  const collectedCount = selectCollectedBreedIds(scans).size;
  const badgeUnlockedSet = useMemo(() => new Set<BadgeType>(earnedBadges), [earnedBadges]);

  const mostRecentSpot = useMemo(() => {
    const mine = scans
      .filter((s) => s.userId === currentUser.id)
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    const scan = mine[0];
    if (!scan) return null;
    const breed = scan.breedId ? breeds.find((b) => b.id === scan.breedId) ?? null : null;
    return { scan, breed };
  }, [breeds, scans, currentUser.id]);

  const mySpotsChronological = useMemo(
    () =>
      [...scans]
        .filter((s) => s.userId === currentUser.id)
        .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
        .slice(0, 25),
    [scans, currentUser.id],
  );

  const myMapScans = useMemo(
    () =>
      scans.filter(
        (s) => s.userId === currentUser.id && s.locationLat != null && s.locationLng != null,
      ),
    [scans, currentUser.id],
  );

  const openAvatarSourcePicker = () => {
    if (Platform.OS === "web") {
      setAvatarSourceSheetVisible(true);
      return;
    }
    Alert.alert("Profile photo", "Choose a source", [
      { text: "Photo library", onPress: () => void pickAvatarFromLibrary() },
      { text: "Take photo", onPress: () => void pickAvatarFromCamera() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickAvatarFromLibrary = async () => {
    try {
      /**
       * Web: never await permission before opening the file dialog — browsers require a direct
       * user activation; expo-image-picker already returns "granted" on web without a prompt.
       */
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Photo access needed",
            "Allow Spotter to access your photos so you can set a profile picture.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const a = result.assets[0];
      setAvatarPick({ uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 });
      setAvatarEditorVisible(true);
    } finally {
      if (Platform.OS === "web") setAvatarSourceSheetVisible(false);
    }
  };

  const pickAvatarFromCamera = async () => {
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow Spotter to use the camera so you can take a profile picture.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const a = result.assets[0];
      setAvatarPick({ uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 });
      setAvatarEditorVisible(true);
    } finally {
      if (Platform.OS === "web") setAvatarSourceSheetVisible(false);
    }
  };

  const commitAvatarUpload = async (localUri: string) => {
    const uploaded = await uploadAvatar(currentUser.id, localUri);
    if (authSession?.user?.id) {
      const db = supabase as any;
      await db.from("users").update({ avatar_url: uploaded }).eq("id", authSession.user.id);
      await supabase.auth.updateUser({ data: { avatar_url: uploaded } });
    }
    setAvatar(uploaded);
  };

  const unlockedCount = earnedBadges.length;
  const totalBadges = badgeDisplayOrder.length;

  const saveProfile = async () => {
    const next = draftUsername.trim();
    if (!next) {
      Alert.alert("Username required", "Please enter a username.");
      return;
    }
    const nextCity = draftCity.trim();
    const nextCountry = draftCountry.trim();
    try {
      if (authSession?.user?.id) {
        const db = supabase as any;
        await db.from("users").update({ username: next }).eq("id", authSession.user.id);
        await supabase.auth.updateUser({ data: { username: next, city: nextCity, country: nextCountry } });
      }
      setUsername(next);
      setUserLocation(nextCity, nextCountry);
      setDraftUsername(next);
      setDraftCity(nextCity);
      setDraftCountry(nextCountry);
      setIsEditingProfile(false);
    } catch (error) {
      Alert.alert("Profile update failed", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const cancelProfileEdit = () => {
    setDraftUsername(currentUser.username);
    setDraftCity(currentUser.city);
    setDraftCountry(currentUser.country);
    setIsEditingProfile(false);
  };

  const locationLabel = (() => {
    const city = currentUser.city.trim();
    const country = currentUser.country.trim();
    if (!city && !country) return "";
    if (city && country) return `${city}, ${country}`;
    return city || country;
  })();

  const openProfileEdit = () => {
    setDraftUsername(currentUser.username);
    setDraftCity(currentUser.city);
    setDraftCountry(currentUser.country);
    setIsEditingProfile(true);
  };

  return (
    <>
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ paddingBottom: 96 }}>
      <View className="flex-row items-center justify-between gap-3 px-4 pb-2 pt-8">
        <View className="min-w-0 flex-1">
          <Text className="text-4xl font-black text-black dark:text-white">Profile</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Your stats, achievements, and journal.</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-900"
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <MaterialCommunityIcons name="cog-outline" size={22} color={palette.amber} />
        </Pressable>
      </View>

      {/* Hero */}
      <View className="px-4">
        <View className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
          <View className="border-b border-zinc-100 px-5 pb-5 pt-6 dark:border-border">
            <View className="mb-3 flex-row justify-end">
              <Pressable
                onPress={isEditingProfile ? cancelProfileEdit : openProfileEdit}
                className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                accessibilityRole="button"
                accessibilityLabel={isEditingProfile ? "Cancel profile editing" : "Edit profile"}
              >
                <MaterialCommunityIcons name={isEditingProfile ? "close" : "pencil"} size={14} color={palette.amber} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-4">
              <UserAvatar
                username={currentUser.username}
                avatarUrl={currentUser.avatarUrl}
                size={76}
                onPress={isEditingProfile ? openAvatarSourcePicker : undefined}
                showEditHint={isEditingProfile}
              />
              <View className="min-w-0 flex-1">
                {isEditingProfile ? (
                  <View className="mt-0.5">
                    <TextInput
                      value={draftUsername}
                      onChangeText={setDraftUsername}
                      autoFocus
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="Username"
                      placeholderTextColor="#71717a"
                      className="rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-base font-semibold text-black dark:border-border dark:bg-zinc-950 dark:text-white"
                    />
                    <TextInput
                      value={draftCity}
                      onChangeText={setDraftCity}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="City"
                      placeholderTextColor="#71717a"
                      className="mt-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-black dark:border-border dark:bg-zinc-950 dark:text-white"
                    />
                    <TextInput
                      value={draftCountry}
                      onChangeText={setDraftCountry}
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      placeholder="Country"
                      placeholderTextColor="#71717a"
                      className="mt-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-black dark:border-border dark:bg-zinc-950 dark:text-white"
                    />
                    <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      Tap profile photo — choose library or camera, then pinch and drag to fit before saving.
                    </Text>
                    <View className="mt-2 flex-row gap-2">
                      <Pressable onPress={() => void saveProfile()} className="rounded-full bg-amber px-3 py-1.5">
                        <Text className="text-xs font-semibold text-white">Save</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelProfileEdit}
                        className="rounded-full bg-zinc-200 px-3 py-1.5 dark:bg-zinc-800"
                      >
                        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Text className="flex-1 text-xl font-bold text-black dark:text-white" numberOfLines={1}>
                      {currentUser.username}
                    </Text>
                  </View>
                )}
                {!isEditingProfile ? (
                  <View className="mt-1 flex-row items-center gap-2">
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={palette.muted} />
                    <Text
                      className={`flex-1 text-sm ${locationLabel ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500"}`}
                      numberOfLines={2}
                    >
                      {locationLabel || "Add city & country"}
                    </Text>
                  </View>
                ) : null}
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <View className="flex-row items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1">
                    <MaterialCommunityIcons name="fire" size={14} color={palette.amber} />
                    <Text className="text-xs font-semibold text-amber">{weeklyPoints} pts this week</Text>
                  </View>
                  {friends.length > 0 ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-900">
                      <MaterialCommunityIcons name="account-group-outline" size={14} color={palette.muted} />
                      <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {friends.length} friend{friends.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2 px-4 py-4">
            <Stat label="Scans" value={String(scans.filter((s) => !s.isPendingBreed).length)} icon="camera-outline" />
            <Stat label="Breeds" value={`${collectedCount}/${DOGDEX_TOTAL}`} icon="paw" />
            <Stat label="Leagues" value={String(leagues.length)} icon="trophy-outline" />
          </View>

          {mostRecentSpot ? (
            <View className="mx-4 mb-4 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950/80">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Most recent scan
              </Text>
              <Text className="mt-1 font-semibold text-black dark:text-white">
                {mostRecentSpot.breed?.name ??
                  (mostRecentSpot.scan.isPendingBreed ? "Pending breed" : "Unknown breed")}
              </Text>
              <Text className="text-xs text-zinc-600 dark:text-zinc-400">
                {new Date(mostRecentSpot.scan.scannedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {mostRecentSpot.breed
                  ? ` · ${mostRecentSpot.breed.rarity.charAt(0).toUpperCase() + mostRecentSpot.breed.rarity.slice(1)} · ${mostRecentSpot.breed.points} pts`
                  : mostRecentSpot.scan.pointsAwarded > 0
                    ? ` · +${mostRecentSpot.scan.pointsAwarded} pts`
                    : ""}
              </Text>
              {mostRecentSpot.scan.locationLabel ? (
                <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400" numberOfLines={2}>
                  {mostRecentSpot.scan.locationLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Scans: delete + privacy */}
      <View className="mt-6 px-4">
        <Text className="text-lg font-bold text-black dark:text-white">Your spots</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Delete a scan or mark it private (private spots stay off Social).
        </Text>
        {mySpotsChronological.length === 0 ? (
          <View className="mt-3 rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-border dark:bg-card">
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">No scans logged yet.</Text>
          </View>
        ) : (
          <View className="mt-3 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white dark:border-border dark:bg-card">
            {mySpotsChronological.map((scan) => {
              const breedLabel = scan.breedId
                ? breeds.find((b) => b.id === scan.breedId)?.name ?? "Unknown breed"
                : scan.isPendingBreed
                  ? "Pending breed"
                  : "—";
              return (
                <View
                  key={scan.id}
                  className="flex-row items-center gap-3 border-b border-zinc-100 px-3 py-3 last:border-b-0 dark:border-border"
                >
                  <Image source={{ uri: scan.photoUrl }} className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-black dark:text-white" numberOfLines={1}>
                      {breedLabel}
                    </Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(scan.scannedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {scan.isPrivate ? " · Private" : ""}
                    </Text>
                    {scan.locationLabel ? (
                      <Text className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400" numberOfLines={2}>
                        {scan.locationLabel}
                      </Text>
                    ) : null}
                    {scan.spotComment ? (
                      <Text className="mt-1 text-xs leading-4 text-zinc-600 dark:text-zinc-400" numberOfLines={3}>
                        {scan.spotComment}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end gap-1">
                    <View className="flex-row items-center gap-1">
                      <MaterialCommunityIcons name="lock-outline" size={14} color={palette.muted} />
                      <Switch
                        value={scan.isPrivate}
                        onValueChange={(v) => {
                          void updateScanPrivacy(scan.id, v);
                        }}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "Delete this spot?",
                          "Removes the scan from your journal and feed.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => void deleteSpot(scan.id),
                            },
                          ],
                        );
                      }}
                      className="flex-row items-center gap-1 rounded-full px-2 py-1"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#b91c1c" />
                      <Text className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ProfileMyDogsSection />

      {/* Achievements */}
      <View className="mt-6 px-4">
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-lg font-bold text-black dark:text-white">Achievements</Text>
            <Text className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {unlockedCount} of {totalBadges} unlocked
            </Text>
          </View>
          <View className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <View
              className="h-full rounded-full bg-amber"
              style={{ width: `${Math.min(100, (unlockedCount / totalBadges) * 100)}%` }}
            />
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-3">
          {badgeDisplayOrder.map((badge) => (
            <View key={badge} className="w-[48%]">
              <BadgeTile badge={badge} unlocked={badgeUnlockedSet.has(badge)} />
            </View>
          ))}
        </View>
      </View>

      {/* Map — title outside so large radii only clip the map viewport */}
      <View className="mt-8 px-4">
        <Text className="text-lg font-bold text-black dark:text-white">Scan journal</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Where you’ve logged breeds{myMapScans.length ? " — tap a pin for breed, place, and time." : "."}
        </Text>
        <View className="mt-4 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-zinc-100 shadow-sm dark:border-border dark:bg-zinc-900 dark:shadow-none">
          <ProfileScanMap scans={myMapScans} breeds={breeds} />
        </View>
      </View>
    </ScrollView>
    {Platform.OS === "web" ? (
      <Modal
        visible={avatarSourceSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarSourceSheetVisible(false)}
      >
        <View className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setAvatarSourceSheetVisible(false)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
          />
          <View className="rounded-t-3xl border border-zinc-200 bg-white px-4 pb-8 pt-3 dark:border-border dark:bg-zinc-900">
            <Text className="mb-3 text-center text-lg font-bold text-black dark:text-white">Profile photo</Text>
            <Pressable
              onPress={() => void pickAvatarFromLibrary()}
              className="rounded-2xl bg-amber/15 py-4 dark:bg-amber/20"
            >
              <Text className="text-center text-base font-semibold text-amber">Photo library</Text>
            </Pressable>
            <Pressable onPress={() => void pickAvatarFromCamera()} className="mt-2 rounded-2xl bg-zinc-100 py-4 dark:bg-zinc-800">
              <Text className="text-center text-base font-semibold text-black dark:text-white">Take photo</Text>
            </Pressable>
            <Pressable onPress={() => setAvatarSourceSheetVisible(false)} className="mt-3 py-3">
              <Text className="text-center text-base font-medium text-zinc-500 dark:text-zinc-400">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    ) : null}
    <AvatarEditorModal
      visible={avatarEditorVisible}
      imageUri={avatarPick?.uri ?? null}
      imageWidth={avatarPick?.width ?? 0}
      imageHeight={avatarPick?.height ?? 0}
      onClose={() => {
        setAvatarEditorVisible(false);
        setAvatarPick(null);
      }}
      onSave={commitAvatarUpload}
    />
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-2 py-3 dark:bg-zinc-950/80">
      <View className="mb-1 flex-row items-center gap-1">
        <MaterialCommunityIcons name={icon} size={14} color={palette.amber} />
        <Text className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</Text>
      </View>
      <Text className="text-lg font-bold text-black dark:text-white" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

