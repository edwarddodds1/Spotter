import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootStackParamList } from "@/core/navigation/types";

import { ScanPhoto } from "@/components/ScanPhoto";
import { AvatarEditorModal } from "@/components/AvatarEditorModal";
import { BadgeTile } from "@/components/BadgeTile";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { DOGDEX_TOTAL } from "@/constants/app";
import {
  BADGE_CATEGORIES,
  badgeCategoryBlurb,
  badgeCategoryLabel,
  badgeDisplayOrder,
  badgesByCategory,
} from "@/constants/badges";
import { palette } from "@/constants/theme";
import { deleteSpot, updateScanPrivacy } from "@/features/spot/spotService";
import { ProfileMyDogsSection } from "@/features/profile/ProfileMyDogsSection";
import { ProfileScanMap } from "@/features/profile/ProfileScanMap";
import { supabase } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/supabase/storage";
import { useAuthStore } from "@/store/useAuthStore";
import { selectCollectedBreedIds, useSpotterStore } from "@/store/useSpotterStore";
import type { BadgeType, ScanRecord } from "@/types/app";
import { RarityCompletionBars } from "@/components/RarityCompletionBars";

const SPOTS_PER_PAGE = 5;

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
  /** Scan id queued for the in-app delete confirmation modal. */
  const [pendingDeleteSpotId, setPendingDeleteSpotId] = useState<string | null>(null);

  const collectedBreedIds = selectCollectedBreedIds(scans, currentUser.id);
  const collectedCount = collectedBreedIds.size;
  const badgeUnlockedSet = useMemo(() => new Set<BadgeType>(earnedBadges), [earnedBadges]);
  const grouped = useMemo(() => badgesByCategory(), []);

  const mySpotsChronological = useMemo(
    () =>
      [...scans]
        .filter((s) => s.userId === currentUser.id)
        .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()),
    [scans, currentUser.id],
  );

  const spotPages = useMemo(() => {
    const pages: ScanRecord[][] = [];
    for (let i = 0; i < mySpotsChronological.length; i += SPOTS_PER_PAGE) {
      pages.push(mySpotsChronological.slice(i, i + SPOTS_PER_PAGE));
    }
    return pages;
  }, [mySpotsChronological]);

  const [spotsPage, setSpotsPage] = useState(0);
  const [spotsPagerWidth, setSpotsPagerWidth] = useState(0);
  const spotsPagerRef = useRef<FlatList<ScanRecord[]>>(null);

  /**
   * Snap the current page back into the valid range if the underlying list
   * shrinks (e.g. user deletes the only spot on the last page).
   */
  useEffect(() => {
    if (spotPages.length === 0) {
      if (spotsPage !== 0) setSpotsPage(0);
      return;
    }
    if (spotsPage > spotPages.length - 1) {
      const last = spotPages.length - 1;
      setSpotsPage(last);
      if (spotsPagerWidth > 0) {
        spotsPagerRef.current?.scrollToOffset({
          offset: last * spotsPagerWidth,
          animated: false,
        });
      }
    }
  }, [spotPages.length, spotsPage, spotsPagerWidth]);

  const goToSpotsPage = (next: number) => {
    if (next < 0 || next >= spotPages.length) return;
    setSpotsPage(next);
    if (spotsPagerWidth > 0) {
      spotsPagerRef.current?.scrollToOffset({
        offset: next * spotsPagerWidth,
        animated: true,
      });
    }
  };

  const renderSpotRow = (scan: ScanRecord) => {
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
        <ScanPhoto
          scanId={scan.id}
          photoUrl={scan.photoUrl}
          className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
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
            onPress={() => setPendingDeleteSpotId(scan.id)}
            accessibilityRole="button"
            accessibilityLabel="Delete spot"
            className="flex-row items-center gap-1 rounded-full px-2 py-1"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#b91c1c" />
            <Text className="text-xs font-semibold text-red-700 dark:text-red-400">Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

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
            <Stat
              label="Scans"
              value={String(scans.filter((s) => s.userId === currentUser.id && !s.isPendingBreed).length)}
              icon="camera-outline"
            />
            <Stat label="Breeds" value={`${collectedCount}/${DOGDEX_TOTAL}`} icon="paw" />
            <Stat label="Leagues" value={String(leagues.length)} icon="trophy-outline" />
          </View>

          <View className="px-4 pb-2">
            <Text className="mb-2 text-lg font-bold text-black dark:text-white">Rarity completion</Text>
            <RarityCompletionBars
              variant="compact"
              breeds={breeds}
              collectedBreedIds={collectedBreedIds}
            />
          </View>

        </View>
      </View>

      {/* Scans: delete + privacy */}
      <View className="mt-6 px-4">
        <Text className="text-lg font-bold text-black dark:text-white">Your spots</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Delete a scan or mark it private (private spots stay off Social).
        </Text>
        {spotPages.length === 0 ? (
          <View className="mt-3 rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-border dark:bg-card">
            <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">No scans logged yet.</Text>
          </View>
        ) : (
          <View className="mt-3">
            <View
              className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white dark:border-border dark:bg-card"
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && w !== spotsPagerWidth) setSpotsPagerWidth(w);
              }}
            >
              {spotsPagerWidth > 0 ? (
                <FlatList
                  ref={spotsPagerRef}
                  data={spotPages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  /**
                   * `snapToInterval` + `pagingEnabled` together guarantee a single
                   * swipe never moves more than one page on either platform — a
                   * fast flick still settles on the next page, never two.
                   */
                  snapToInterval={spotsPagerWidth}
                  snapToAlignment="start"
                  disableIntervalMomentum
                  keyExtractor={(_, idx) => `spot-page-${idx}`}
                  /**
                   * Update the counter live as the user swipes (not just on
                   * scroll-end). RN-Web's `pagingEnabled` doesn't always fire
                   * `onMomentumScrollEnd`, so we drive page index from the
                   * scroll offset directly and keep `onMomentumScrollEnd` as a
                   * native-platform safety net.
                   */
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const idx = Math.round(
                      e.nativeEvent.contentOffset.x / Math.max(1, spotsPagerWidth),
                    );
                    if (idx !== spotsPage && idx >= 0 && idx < spotPages.length) {
                      setSpotsPage(idx);
                    }
                  }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(
                      e.nativeEvent.contentOffset.x / Math.max(1, spotsPagerWidth),
                    );
                    if (idx !== spotsPage) setSpotsPage(idx);
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: spotsPagerWidth }}>
                      {item.map((scan) => renderSpotRow(scan))}
                    </View>
                  )}
                />
              ) : (
                <View>{spotPages[0]?.map((scan) => renderSpotRow(scan))}</View>
              )}
            </View>
            {spotPages.length > 1 ? (
              <View className="mt-3 flex-row items-center justify-center gap-4">
                <Pressable
                  onPress={() => goToSpotsPage(spotsPage - 1)}
                  disabled={spotsPage === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Previous spots page"
                  className={`rounded-full p-2 ${spotsPage === 0 ? "opacity-30" : "bg-zinc-100 dark:bg-zinc-900"}`}
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={palette.amber} />
                </Pressable>
                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {spotsPage + 1} / {spotPages.length}
                </Text>
                <Pressable
                  onPress={() => goToSpotsPage(spotsPage + 1)}
                  disabled={spotsPage >= spotPages.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel="Next spots page"
                  className={`rounded-full p-2 ${spotsPage >= spotPages.length - 1 ? "opacity-30" : "bg-zinc-100 dark:bg-zinc-900"}`}
                >
                  <MaterialCommunityIcons name="chevron-right" size={22} color={palette.amber} />
                </Pressable>
              </View>
            ) : null}
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

        <View>
          {BADGE_CATEGORIES.map((category) => {
            const ids = grouped[category];
            if (ids.length === 0) return null;
            return (
              <View
                key={category}
                className="mb-3 rounded-3xl border border-zinc-200 bg-white px-3 py-3 dark:border-border dark:bg-card"
              >
                <Text className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                  {badgeCategoryLabel[category]}
                </Text>
                <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {badgeCategoryBlurb[category]}
                </Text>
                <View className="mt-3 flex-row justify-between">
                  {ids.map((badge) => (
                    <View key={badge} style={{ width: "23%" }}>
                      <BadgeTile badge={badge} unlocked={badgeUnlockedSet.has(badge)} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
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
    <ConfirmDialog
      visible={pendingDeleteSpotId !== null}
      title="Delete this spot?"
      message="This removes the scan from your journal, Dogdex, and the Social feed everywhere. This cannot be undone."
      confirmLabel="Delete"
      destructive
      onCancel={() => setPendingDeleteSpotId(null)}
      onConfirm={() => {
        const id = pendingDeleteSpotId;
        setPendingDeleteSpotId(null);
        if (id) void deleteSpot(id);
      }}
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

