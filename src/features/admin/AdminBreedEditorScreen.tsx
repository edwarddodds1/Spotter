import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/core/navigation/types";
import {
  BREED_CHARACTERISTIC_PRESETS,
  dedupeCharacteristics,
  isPresetCharacteristic,
  parseCharacteristicList,
  serializeCharacteristicList,
  titleCaseTraitWords,
} from "@/constants/breedCharacteristics";
import { isAdminEmail } from "@/constants/admin";
import { RARITY_POINTS, rarityOrder } from "@/constants/breeds";
import { getBreedFunFact } from "@/constants/breedFunFacts";
import { updateBreedProfileRemote } from "@/lib/supabase/breedsRemote";
import { resolveBreedHeroImageUri } from "@/lib/supabase/publicUrls";
import { uploadBreedReferenceHeader } from "@/lib/supabase/storage";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { Breed, BreedRarity } from "@/types/app";

type Props = NativeStackScreenProps<RootStackParamList, "AdminBreedEditor">;

export function AdminBreedEditorScreen({ route, navigation }: Props) {
  const sessionEmail = useAuthStore((s) => s.session?.user?.email);
  const breeds = useSpotterStore((s) => s.breeds);
  const refreshBreedsFromRemote = useSpotterStore((s) => s.refreshBreedsFromRemote);
  const breed = useMemo(
    () => breeds.find((b) => b.id === route.params.breedId),
    [breeds, route.params.breedId],
  );

  const [name, setName] = useState(breed?.name ?? "");
  const [description, setDescription] = useState(breed?.description ?? "");
  const [origin, setOrigin] = useState(breed?.origin ?? "");
  const [selectedCharacteristics, setSelectedCharacteristics] = useState<string[]>(() =>
    parseCharacteristicList(breed?.temperament ?? ""),
  );
  const [customTraitInput, setCustomTraitInput] = useState("");
  const [size, setSize] = useState(breed?.size ?? "");
  const [lifespan, setLifespan] = useState(breed?.lifespan ?? "");
  const [referencePhotoUrl, setReferencePhotoUrl] = useState(breed?.referencePhotoUrl ?? "");
  const [rarity, setRarity] = useState<BreedRarity>(breed?.rarity ?? "common");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [funFact, setFunFact] = useState("");
  const [statIntelligence, setStatIntelligence] = useState("");
  const [statEnergy, setStatEnergy] = useState("");
  const [statTrainability, setStatTrainability] = useState("");
  const [statShedding, setStatShedding] = useState("");
  const [statKidFriendly, setStatKidFriendly] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!breed) return;
    setName(breed.name);
    setDescription(breed.description);
    setOrigin(breed.origin);
    setSelectedCharacteristics(parseCharacteristicList(breed.temperament));
    setCustomTraitInput("");
    setSize(breed.size);
    setLifespan(breed.lifespan);
    setReferencePhotoUrl(breed.referencePhotoUrl ?? "");
    setRarity(breed.rarity);
    const dbStats = breed.statRatings;
    setStatIntelligence(dbStats ? String(dbStats.intelligence) : "");
    setStatEnergy(dbStats ? String(dbStats.energy) : "");
    setStatTrainability(dbStats ? String(dbStats.trainability) : "");
    setStatShedding(dbStats ? String(dbStats.shedding) : "");
    setStatKidFriendly(dbStats ? String(dbStats.kidFriendly) : "");
    setFunFact(breed.funFact?.trim() ?? "");
  }, [breed]);

  if (!isAdminEmail(sessionEmail)) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-ink">
        <Text className="text-center text-black dark:text-white">You don’t have access to this screen.</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="font-semibold text-amber-600 dark:text-amber-400">Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!breed) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <Text className="text-black dark:text-white">Breed not found.</Text>
      </View>
    );
  }

  const fieldClass =
    "mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white";
  const inlineFieldClass =
    "rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white";

  const heroPreviewBreed = useMemo((): Breed | null => {
    if (!breed) return null;
    return {
      ...breed,
      name: name.trim() || breed.name,
      rarity,
      points: RARITY_POINTS[rarity],
      referencePhotoUrl: referencePhotoUrl.trim() ? referencePhotoUrl.trim() : null,
    };
  }, [breed, name, rarity, referencePhotoUrl]);

  const heroPreviewUri = heroPreviewBreed ? resolveBreedHeroImageUri(heroPreviewBreed) : null;

  const pickHeroFromLibrary = async () => {
    setError(null);
    if (!breed) return;
    try {
      if (Platform.OS !== "web") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Photo access needed",
            "Allow Spotter to access your photos so you can set the breed header image.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.92,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploadingHero(true);
      const { path, error: upErr } = await uploadBreedReferenceHeader(breed.id, result.assets[0].uri);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      if (path) setReferencePhotoUrl(path);
    } finally {
      setUploadingHero(false);
    }
  };

  const onSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const parseStat = (raw: string, label: string): number | null | "bad" => {
      const t = raw.trim();
      if (!t) return null;
      const n = Number.parseInt(t, 10);
      if (!Number.isFinite(n) || n < 1 || n > 5) return "bad";
      return n;
    };

    const si = parseStat(statIntelligence, "Intelligence");
    const se = parseStat(statEnergy, "Energy");
    const st = parseStat(statTrainability, "Trainability");
    const ss = parseStat(statShedding, "Shedding");
    const sk = parseStat(statKidFriendly, "Kid friendly");
    if (si === "bad" || se === "bad" || st === "bad" || ss === "bad" || sk === "bad") {
      setError("Each stat must be a whole number from 1 to 5, or left empty.");
      return;
    }
    const statParts = [si, se, st, ss, sk] as (number | null)[];
    const anyStat = statParts.some((x) => x !== null);
    const allStat = statParts.every((x) => x !== null);
    if (anyStat && !allStat) {
      setError("Fill in all five breed stats, or clear all stat fields.");
      return;
    }
    const statRatings =
      allStat && si !== null && se !== null && st !== null && ss !== null && sk !== null
        ? {
            intelligence: si,
            energy: se,
            trainability: st,
            shedding: ss,
            kidFriendly: sk,
          }
        : null;

    setSaving(true);
    try {
      const { error: remoteError } = await updateBreedProfileRemote(
        breed.id,
        {
          name: name.trim(),
          description: description.trim(),
          origin: origin.trim(),
          temperament: serializeCharacteristicList(selectedCharacteristics),
          size: size.trim(),
          lifespan: lifespan.trim(),
          referencePhotoUrl: referencePhotoUrl.trim() ? referencePhotoUrl.trim() : null,
          funFact: funFact.trim() ? funFact.trim() : null,
          statRatings,
          rarity,
        },
        breed,
      );
      if (remoteError) {
        setError(remoteError);
        return;
      }
      await refreshBreedsFromRemote();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-50 dark:bg-ink" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">
        Changes save to Supabase and apply for everyone after sync (profile text, rarity, header image, stats, fun fact). Scan points
        follow the standard value for the selected rarity.
      </Text>

      <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Header / hero image
      </Text>
      <Text className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-500">
        Same image as the breed detail hero. Use a photo from your library (uploads to storage) or paste a full URL / storage path
        (e.g. breed-reference/{breed.id}.jpg).
      </Text>
      <View className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 dark:border-border dark:bg-zinc-900">
        {heroPreviewUri ? (
          <Image source={{ uri: heroPreviewUri }} className="h-40 w-full" resizeMode="cover" />
        ) : (
          <View className="h-40 w-full items-center justify-center bg-zinc-300 dark:bg-zinc-800">
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">No image URL resolved</Text>
          </View>
        )}
      </View>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => void pickHeroFromLibrary()}
          disabled={uploadingHero || saving}
          className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800 disabled:opacity-50"
        >
          {uploadingHero ? (
            <ActivityIndicator />
          ) : (
            <Text className="font-semibold text-black dark:text-white">Choose photo…</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            setReferencePhotoUrl(`breed-reference/${breed.id}.jpg`);
          }}
          className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800"
        >
          <Text className="font-semibold text-black dark:text-white">Default bucket path</Text>
        </Pressable>
        <Pressable
          onPress={() => setReferencePhotoUrl("")}
          className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800"
        >
          <Text className="font-semibold text-black dark:text-white">Clear (app default)</Text>
        </Pressable>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</Text>
      <TextInput value={name} onChangeText={setName} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Rarity</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {rarityOrder.map((r) => {
          const on = rarity === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRarity(r)}
              className={`rounded-full border px-3 py-2 ${
                on ? "border-amber bg-amber" : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
              }`}
            >
              <Text className={`text-sm font-semibold capitalize ${on ? "text-white" : "text-black dark:text-white"}`}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Base scan points
      </Text>
      <Text className="mt-1 text-sm leading-5 text-zinc-700 dark:text-zinc-300">
        {RARITY_POINTS[rarity]} points for this rarity (saved automatically; featured multiplier still applies in the app).
      </Text>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        className={`${fieldClass} min-h-[100px]`}
        placeholderTextColor="#71717a"
        textAlignVertical="top"
      />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Origin</Text>
      <TextInput value={origin} onChangeText={setOrigin} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Characteristics
      </Text>
      <Text className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-500">
        Tap to select presets. Add your own labels below — they are saved with this breed.
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {BREED_CHARACTERISTIC_PRESETS.map((preset) => {
          const isOn = selectedCharacteristics.some((s) => s.toLowerCase() === preset.toLowerCase());
          return (
            <Pressable
              key={preset}
              onPress={() => {
                setSelectedCharacteristics((prev) => {
                  const idx = prev.findIndex((s) => s.toLowerCase() === preset.toLowerCase());
                  if (idx >= 0) {
                    return prev.filter((_, i) => i !== idx);
                  }
                  return dedupeCharacteristics([...prev, preset]);
                });
              }}
              className={`rounded-full border px-3 py-1.5 ${
                isOn
                  ? "border-amber bg-amber"
                  : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
              }`}
            >
              <Text
                className={`text-sm font-medium ${isOn ? "text-white" : "text-black dark:text-white"}`}
              >
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedCharacteristics.some((s) => !isPresetCharacteristic(s)) ? (
        <View className="mt-3">
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Custom</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {selectedCharacteristics
              .filter((s) => !isPresetCharacteristic(s))
              .map((trait) => (
                <View
                  key={trait}
                  className="flex-row items-center rounded-full border border-amber/40 bg-amber/15 pl-3 dark:bg-amber/20"
                >
                  <Text className="py-1.5 pr-1 text-sm font-medium text-black dark:text-white">{trait}</Text>
                  <Pressable
                    onPress={() =>
                      setSelectedCharacteristics((prev) =>
                        prev.filter((s) => s.toLowerCase() !== trait.toLowerCase()),
                      )
                    }
                    hitSlop={8}
                    className="rounded-full px-2 py-1.5"
                    accessibilityLabel={`Remove ${trait}`}
                  >
                    <Text className="text-base leading-none text-zinc-600 dark:text-zinc-400">×</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        </View>
      ) : null}

      <View className="mt-4 flex-row items-center gap-2">
        <TextInput
          value={customTraitInput}
          onChangeText={setCustomTraitInput}
          placeholder="Add characteristic…"
          placeholderTextColor="#71717a"
          className={`min-h-[48px] flex-1 ${inlineFieldClass}`}
          onSubmitEditing={() => {
            const t = titleCaseTraitWords(customTraitInput);
            if (!t) return;
            setSelectedCharacteristics((prev) => {
              if (prev.some((s) => s.toLowerCase() === t.toLowerCase())) return prev;
              return dedupeCharacteristics([...prev, t]);
            });
            setCustomTraitInput("");
          }}
          returnKeyType="done"
        />
        <Pressable
          onPress={() => {
            const t = titleCaseTraitWords(customTraitInput);
            if (!t) return;
            setSelectedCharacteristics((prev) => {
              if (prev.some((s) => s.toLowerCase() === t.toLowerCase())) return prev;
              return dedupeCharacteristics([...prev, t]);
            });
            setCustomTraitInput("");
          }}
          className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800"
        >
          <Text className="font-semibold text-black dark:text-white">Add</Text>
        </Pressable>
      </View>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Size</Text>
      <TextInput value={size} onChangeText={setSize} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Lifespan</Text>
      <TextInput value={lifespan} onChangeText={setLifespan} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Header image URL or storage path (optional)
      </Text>
      <TextInput
        value={referencePhotoUrl}
        onChangeText={setReferencePhotoUrl}
        className={fieldClass}
        placeholderTextColor="#71717a"
        placeholder={`https://… or breed-reference/${breed.id}.jpg`}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Breed stats (1–5)
      </Text>
      <Text className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-500">
        Optional. Leave all empty to use app defaults when available. All five must be set to save custom stats.
      </Text>
      <View className="mt-3 gap-3">
        {(
          [
            ["Intelligence", statIntelligence, setStatIntelligence],
            ["Energy", statEnergy, setStatEnergy],
            ["Trainability", statTrainability, setStatTrainability],
            ["Shedding", statShedding, setStatShedding],
            ["Kid friendly", statKidFriendly, setStatKidFriendly],
          ] as const
        ).map(([label, val, setVal]) => (
          <View key={label}>
            <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</Text>
            <TextInput
              value={val}
              onChangeText={setVal}
              className={`mt-1 ${fieldClass}`}
              placeholderTextColor="#71717a"
              keyboardType="number-pad"
              maxLength={1}
            />
          </View>
        ))}
      </View>

      <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Fun fact</Text>
      <Text className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-500">
        Optional. Saved to the database; overrides catalog fun fact when set.
      </Text>
      <TextInput
        value={funFact}
        onChangeText={setFunFact}
        multiline
        className={`${fieldClass} mt-2 min-h-[88px]`}
        placeholder={
          getBreedFunFact(breed.id) ? "Leave empty to clear DB override…" : "Add a fun fact for this breed…"
        }
        placeholderTextColor="#71717a"
        textAlignVertical="top"
      />

      {error ? <Text className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">{error}</Text> : null}

      <Pressable
        onPress={() => void onSave()}
        disabled={saving}
        className="mt-6 rounded-2xl bg-amber px-4 py-3 disabled:opacity-60"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-semibold text-white">Save breed profile</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
