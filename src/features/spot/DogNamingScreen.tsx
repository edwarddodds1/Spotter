import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { CoatColourPicker } from "@/components/CoatColourPicker";
import { EmptyState } from "@/components/EmptyState";
import { saveSpot } from "@/features/spot/spotService";
import type { RootStackParamList } from "@/core/navigation/types";
import { MAX_SCAN_LOCATION_LABEL_LENGTH } from "@/constants/app";
import { MAX_SPOT_COMMENT_LENGTH } from "@/constants/feedSocial";
import { formatGeocodedPlace } from "@/lib/spotLocationLabel";
import { useSpotterStore } from "@/store/useSpotterStore";

type Props = NativeStackScreenProps<RootStackParamList, "DogNaming">;

export function DogNamingScreen({ navigation }: Props) {
  const currentUser = useSpotterStore((state) => state.currentUser);
  const spotDraft = useSpotterStore((state) => state.spotDraft);
  const breeds = useSpotterStore((state) => state.breeds);
  const dogProfiles = useSpotterStore((state) => state.dogProfiles);
  const clearSpotDraft = useSpotterStore((state) => state.clearSpotDraft);
  const setSpotDraft = useSpotterStore((state) => state.setSpotDraft);
  const [dogName, setDogName] = useState("");
  const [keepPrivate, setKeepPrivate] = useState<boolean>(spotDraft.isPrivate ?? false);
  const [coatColourId, setCoatColourId] = useState<string | null>(spotDraft.coatColourId);
  const [coatOtherNote, setCoatOtherNote] = useState(spotDraft.coatColourNote ?? "");
  const [spotComment, setSpotComment] = useState(spotDraft.spotComment ?? "");
  const [locationLabel, setLocationLabel] = useState(spotDraft.locationLabel ?? "");
  const [locationLookup, setLocationLookup] = useState(false);
  const geocodeOnceRef = useRef(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (geocodeOnceRef.current) return;
    const lat = spotDraft.locationLat;
    const lng = spotDraft.locationLng;
    if (lat == null || lng == null || spotDraft.locationLabel?.trim()) {
      geocodeOnceRef.current = true;
      return;
    }
    geocodeOnceRef.current = true;
    let cancelled = false;
    (async () => {
      setLocationLookup(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const hit = places[0];
        if (cancelled || !hit) return;
        const line = formatGeocodedPlace(hit);
        if (line) {
          setLocationLabel(line);
          setSpotDraft({ locationLabel: line });
        }
      } finally {
        if (!cancelled) setLocationLookup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSpotDraft, spotDraft.locationLabel, spotDraft.locationLat, spotDraft.locationLng]);

  const selectedBreed = breeds.find((breed) => breed.id === spotDraft.selectedBreedId) ?? null;
  const photoUri = spotDraft.photoUri;
  const matchingDog = useMemo(() => {
    if (!selectedBreed || !dogName.trim()) return null;
    return (
      dogProfiles.find(
        (profile) =>
          profile.breedId === selectedBreed.id &&
          profile.name.trim().toLowerCase() === dogName.trim().toLowerCase(),
      ) ?? null
    );
  }, [selectedBreed, dogName, dogProfiles]);

  if (!photoUri) {
    return (
      <View className="flex-1 justify-center bg-white px-4 dark:bg-ink">
        <EmptyState title="No photo captured" message="Jump back to the Spot tab and capture a dog before naming it." />
      </View>
    );
  }

  const submit = async () => {
    try {
      setLoading(true);
      const result = await saveSpot({
        userId: currentUser.id,
        breedId: selectedBreed?.id ?? null,
        photoUri,
        dogName,
        locationLat: spotDraft.locationLat,
        locationLng: spotDraft.locationLng,
        locationLabel: locationLabel.trim() || null,
        coatColourId,
        coatColourNote: coatOtherNote,
        spotComment,
        isPrivate: keepPrivate,
      });

      clearSpotDraft();
      const messages = [
        `+${result.scan.pointsAwarded} points earned`,
        result.isFirstBreed ? "New breed unlocked in your Dogdex" : null,
        result.variantUnlocked ? "Colour variant threshold reached" : null,
      ].filter(Boolean);

      Alert.alert("Spot saved", messages.join("\n"));
      navigation.popToTop();
    } catch (error) {
      Alert.alert("Could not save spot", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <ScrollView className="flex-1 px-4 pt-8" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-3xl font-bold text-black dark:text-white">Name this dog</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {selectedBreed ? `Optional for ${selectedBreed.name}.` : "You can leave the breed pending and name it later too."}
        </Text>

        <Image source={{ uri: photoUri }} className="mt-5 h-64 w-full rounded-3xl" />

        <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Spot location
        </Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Filled in from your GPS capture — edit if it’s off.
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <TextInput
            value={locationLabel}
            onChangeText={(t) => {
              const next = t.slice(0, MAX_SCAN_LOCATION_LABEL_LENGTH);
              setLocationLabel(next);
              setSpotDraft({ locationLabel: next.trim() ? next.trim() : null });
            }}
            placeholder={
              spotDraft.locationLat != null && spotDraft.locationLng != null
                ? "City, area, or neighbourhood"
                : "No GPS for this shot — type a place if you like"
            }
            placeholderTextColor="#71717a"
            className="min-h-[48px] flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
          />
          {locationLookup ? <ActivityIndicator size="small" color="#BA7517" /> : null}
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-border dark:bg-zinc-950">
          <View className="mr-3 flex-1">
            <Text className="font-semibold text-black dark:text-white">Keep this spot private</Text>
            <Text className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              Private scans stay off your Social feed. They still count toward your Dogdex and stats.
            </Text>
          </View>
          <Switch
            value={keepPrivate}
            onValueChange={(v) => {
              setKeepPrivate(v);
              setSpotDraft({ isPrivate: v });
            }}
          />
        </View>

        <TextInput
          value={dogName}
          onChangeText={setDogName}
          placeholder="Does this dog have a name?"
          placeholderTextColor="#71717a"
          className="mt-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
        />

        <CoatColourPicker
          breedId={selectedBreed?.id ?? null}
          selectedId={coatColourId}
          otherNote={coatOtherNote}
          onSelect={setCoatColourId}
          onOtherNote={setCoatOtherNote}
        />

        <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Comment (optional)
        </Text>
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          A short note about this spot — separate from coat colour.
        </Text>
        <TextInput
          value={spotComment}
          onChangeText={(t) => {
            const next = t.slice(0, MAX_SPOT_COMMENT_LENGTH);
            setSpotComment(next);
            setSpotDraft({ spotComment: next || null });
          }}
          placeholder="e.g. Met at the oval, very friendly"
          placeholderTextColor="#71717a"
          multiline
          textAlignVertical="top"
          maxLength={MAX_SPOT_COMMENT_LENGTH}
          className="mt-2 min-h-[88px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
        />

        {matchingDog ? (
          <View className="mt-4 rounded-3xl border border-amber bg-white p-4 dark:bg-card">
            <Text className="font-semibold text-black dark:text-white">Is this {matchingDog.name}?</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              This dog has already been seen {matchingDog.totalScans} times. Saving will increment the shared dog profile.
            </Text>
          </View>
        ) : null}

        <Pressable onPress={submit} disabled={loading} className="mt-6 rounded-2xl bg-amber px-4 py-4 disabled:opacity-50">
          <Text className="text-center font-semibold text-white">{loading ? "Saving..." : "Save spot"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
