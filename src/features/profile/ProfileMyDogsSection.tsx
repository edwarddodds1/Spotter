import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Fuse from "fuse.js";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { buildDogdexBreedOrder } from "@/constants/breeds";
import { MAX_JOURNAL_DOG_FIELD_LENGTH } from "@/constants/app";
import { palette } from "@/constants/theme";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { Breed, JournalDog, JournalDogSex } from "@/types/app";

const SEX_OPTIONS: { id: JournalDogSex; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "unknown", label: "Rather not say" },
];

function clip(s: string) {
  return s.slice(0, MAX_JOURNAL_DOG_FIELD_LENGTH);
}

export function ProfileMyDogsSection() {
  const currentUser = useSpotterStore((state) => state.currentUser);
  const breeds = useSpotterStore((state) => state.breeds);
  const journalDogs = useSpotterStore((state) => state.journalDogs);
  const addJournalDog = useSpotterStore((state) => state.addJournalDog);
  const updateJournalDog = useSpotterStore((state) => state.updateJournalDog);
  const removeJournalDog = useSpotterStore((state) => state.removeJournalDog);

  const mine = useMemo(
    () => journalDogs.filter((d) => d.userId === currentUser.id),
    [journalDogs, currentUser.id],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [breedId, setBreedId] = useState<string | null>(null);
  const [breedQuery, setBreedQuery] = useState("");
  const [sex, setSex] = useState<JournalDogSex>("unknown");
  const [ageOrBirthNote, setAgeOrBirthNote] = useState("");
  const [coatDescription, setCoatDescription] = useState("");
  const [personalityNotes, setPersonalityNotes] = useState("");

  const orderedBreeds = useMemo(() => buildDogdexBreedOrder(breeds), [breeds]);
  const fuse = useMemo(
    () => new Fuse(orderedBreeds, { keys: ["name", "origin"], threshold: 0.32 }),
    [orderedBreeds],
  );
  const breedSuggestions = useMemo(() => {
    const q = breedQuery.trim();
    if (!q) return orderedBreeds.slice(0, 8);
    return fuse.search(q).map((r) => r.item).slice(0, 12);
  }, [breedQuery, fuse, orderedBreeds]);

  const selectedBreed = breedId ? breeds.find((b) => b.id === breedId) ?? null : null;

  const openNew = () => {
    setEditingId(null);
    setName("");
    setBreedId(null);
    setBreedQuery("");
    setSex("unknown");
    setAgeOrBirthNote("");
    setCoatDescription("");
    setPersonalityNotes("");
    setModalOpen(true);
  };

  const openEdit = (dog: JournalDog) => {
    setEditingId(dog.id);
    setName(dog.name);
    setBreedId(dog.breedId);
    const br = breeds.find((b) => b.id === dog.breedId);
    setBreedQuery(br?.name ?? "");
    setSex(dog.sex);
    setAgeOrBirthNote(dog.ageOrBirthNote ?? "");
    setCoatDescription(dog.coatDescription ?? "");
    setPersonalityNotes(dog.personalityNotes ?? "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const save = () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("Name required", "What do you call your dog?");
      return;
    }
    if (!breedId) {
      Alert.alert("Breed required", "Pick the closest breed from the list — it helps Spotter stay organised.");
      return;
    }
    if (editingId) {
      updateJournalDog(editingId, {
        name: n,
        breedId,
        sex,
        ageOrBirthNote: ageOrBirthNote.trim() || null,
        coatDescription: coatDescription.trim() || null,
        personalityNotes: personalityNotes.trim() || null,
      });
    } else {
      addJournalDog({
        name: n,
        breedId,
        sex,
        ageOrBirthNote: ageOrBirthNote.trim() || null,
        coatDescription: coatDescription.trim() || null,
        personalityNotes: personalityNotes.trim() || null,
      });
    }
    closeModal();
  };

  const confirmRemove = (dog: JournalDog) => {
    Alert.alert("Remove this dog?", "They’ll disappear from your profile only — not from your scans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeJournalDog(dog.id) },
    ]);
  };

  return (
    <View className="mt-8 px-4">
      <View className="mb-3 flex-row items-end justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-black dark:text-white">Your dogs</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Your household pups — separate from dogs you spot in the wild.
          </Text>
        </View>
        <Pressable
          onPress={openNew}
          className="flex-row items-center gap-1 rounded-full bg-amber px-3 py-2"
        >
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text className="text-sm font-semibold text-white">Add</Text>
        </Pressable>
      </View>

      {mine.length === 0 ? (
        <View className="rounded-3xl border border-dashed border-zinc-300 bg-white px-4 py-8 dark:border-border dark:bg-card">
          <Text className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            No dogs listed yet. Add yours to keep a quick profile handy for friends and leagues.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {mine.map((dog) => {
            const br = breeds.find((b) => b.id === dog.breedId);
            return (
              <View
                key={dog.id}
                className="rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-border dark:bg-card"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-black dark:text-white">{dog.name}</Text>
                    <Text className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{br?.name ?? "Breed"}</Text>
                    <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {SEX_OPTIONS.find((s) => s.id === dog.sex)?.label}
                      {dog.ageOrBirthNote ? ` · ${dog.ageOrBirthNote}` : ""}
                    </Text>
                    {dog.coatDescription ? (
                      <Text className="mt-2 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
                        Coat: {dog.coatDescription}
                      </Text>
                    ) : null}
                    {dog.personalityNotes ? (
                      <Text className="mt-1 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
                        {dog.personalityNotes}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable
                      onPress={() => openEdit(dog)}
                      className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                      accessibilityLabel="Edit dog"
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={palette.amber} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmRemove(dog)}
                      className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-900"
                      accessibilityLabel="Remove dog"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#b91c1c" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <View className="flex-1 bg-white dark:bg-ink">
          <View className="flex-row items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-border">
            <Pressable onPress={closeModal} className="py-2">
              <Text className="text-base font-semibold text-zinc-600 dark:text-zinc-400">Cancel</Text>
            </Pressable>
            <Text className="text-base font-bold text-black dark:text-white">
              {editingId ? "Edit your dog" : "Add your dog"}
            </Text>
            <Pressable onPress={save} className="py-2">
              <Text className="text-base font-semibold text-amber">Save</Text>
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</Text>
            <TextInput
              value={name}
              onChangeText={(t) => setName(clip(t))}
              placeholder="e.g. Mochi"
              placeholderTextColor="#71717a"
              className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Breed (search Dogdex)
            </Text>
            <TextInput
              value={breedQuery}
              onChangeText={(t) => {
                setBreedQuery(t);
                setBreedId(null);
              }}
              placeholder="Type to search breeds"
              placeholderTextColor="#71717a"
              className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />
            {selectedBreed ? (
              <Text className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Selected: {selectedBreed.name}
              </Text>
            ) : (
              <Text className="mt-2 text-xs text-zinc-500">Tap a row below to select.</Text>
            )}
            <View className="mt-2 max-h-44 overflow-hidden rounded-2xl border border-zinc-200 dark:border-border">
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {breedSuggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setBreedId(item.id);
                      setBreedQuery(item.name);
                    }}
                    className={`border-b border-zinc-100 px-3 py-2.5 dark:border-border ${breedId === item.id ? "bg-amber/10" : ""}`}
                  >
                    <Text className="font-medium text-black dark:text-white">{item.name}</Text>
                    <Text className="text-xs text-zinc-500">{item.origin}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sex</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SEX_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setSex(opt.id)}
                  className={`rounded-full px-3 py-2 ${sex === opt.id ? "bg-amber" : "bg-zinc-100 dark:bg-zinc-900"}`}
                >
                  <Text className={`text-sm font-medium ${sex === opt.id ? "text-white" : "text-black dark:text-white"}`}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Age or birthday note
            </Text>
            <TextInput
              value={ageOrBirthNote}
              onChangeText={(t) => setAgeOrBirthNote(clip(t))}
              placeholder="e.g. 3 years · born March 2023"
              placeholderTextColor="#71717a"
              className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Coat / colours
            </Text>
            <TextInput
              value={coatDescription}
              onChangeText={(t) => setCoatDescription(clip(t))}
              placeholder="e.g. Red cavoodle, wavy fleece"
              placeholderTextColor="#71717a"
              className="mt-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />

            <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Personality & quirks
            </Text>
            <TextInput
              value={personalityNotes}
              onChangeText={(t) => setPersonalityNotes(clip(t))}
              placeholder="e.g. Loves tennis balls, shy with new dogs"
              placeholderTextColor="#71717a"
              multiline
              textAlignVertical="top"
              className="mt-1 min-h-[100px] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-black dark:border-border dark:bg-zinc-950 dark:text-white"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
