import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/core/navigation/types";
import { isAdminEmail } from "@/constants/admin";
import { updateBreedProfileRemote } from "@/lib/supabase/breedsRemote";
import { useAuthStore } from "@/store/useAuthStore";
import { useSpotterStore } from "@/store/useSpotterStore";

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
  const [temperament, setTemperament] = useState(breed?.temperament ?? "");
  const [size, setSize] = useState(breed?.size ?? "");
  const [lifespan, setLifespan] = useState(breed?.lifespan ?? "");
  const [referencePhotoUrl, setReferencePhotoUrl] = useState(breed?.referencePhotoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!breed) return;
    setName(breed.name);
    setDescription(breed.description);
    setOrigin(breed.origin);
    setTemperament(breed.temperament);
    setSize(breed.size);
    setLifespan(breed.lifespan);
    setReferencePhotoUrl(breed.referencePhotoUrl ?? "");
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

  const onSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const { error: remoteError } = await updateBreedProfileRemote(breed.id, {
        name: name.trim(),
        description: description.trim(),
        origin: origin.trim(),
        temperament: temperament.trim(),
        size: size.trim(),
        lifespan: lifespan.trim(),
        referencePhotoUrl: referencePhotoUrl.trim() ? referencePhotoUrl.trim() : null,
      });
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
        Changes save to Supabase and apply for everyone after sync. Rarity and points stay as in the database (edit those in
        Supabase if needed).
      </Text>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</Text>
      <TextInput value={name} onChangeText={setName} className={fieldClass} placeholderTextColor="#71717a" />

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

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Temperament</Text>
      <TextInput value={temperament} onChangeText={setTemperament} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Size</Text>
      <TextInput value={size} onChangeText={setSize} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Lifespan</Text>
      <TextInput value={lifespan} onChangeText={setLifespan} className={fieldClass} placeholderTextColor="#71717a" />

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Reference photo URL (optional)
      </Text>
      <TextInput
        value={referencePhotoUrl}
        onChangeText={setReferencePhotoUrl}
        className={fieldClass}
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        keyboardType="url"
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
