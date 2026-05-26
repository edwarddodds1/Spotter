import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Fuse from "fuse.js";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BreedSpriteThumb } from "@/components/BreedSpriteThumb";
import { CoatColourPicker } from "@/components/CoatColourPicker";
import { RarityBadge } from "@/components/RarityBadge";
import { ScanPhoto } from "@/components/ScanPhoto";
import { SpotPhotoEditorModal } from "@/components/SpotPhotoEditorModal";
import { MAX_SCAN_LOCATION_LABEL_LENGTH } from "@/constants/app";
import { MAX_SPOT_COMMENT_LENGTH } from "@/constants/feedSocial";
import {
  confirmPendingScanAsOther,
  confirmPendingScanBreed,
  confirmUpdateScanDetails,
  deleteSpot,
  replaceScanPhoto,
} from "@/features/spot/spotService";
import { resolveScanPhotoDisplayUrl } from "@/lib/supabase/scanPhotoUrl";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { RootStackParamList } from "@/core/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "EditScan">;

const OTHER_OPTION_ID = "__other__";

export function EditScanScreen({ navigation, route }: Props) {
  const allScans = useSpotterStore((state) => state.scans);
  const breeds = useSpotterStore((state) => state.breeds);

  const scan = useMemo(
    () => allScans.find((item) => item.id === route.params.scanId),
    [allScans, route.params.scanId],
  );

  const initialBreedId = scan?.breedId ?? (scan?.isPendingBreed ? null : OTHER_OPTION_ID);
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(initialBreedId);
  const [coatColourId, setCoatColourId] = useState<string | null>(scan?.coatColourId ?? null);
  const [coatOtherNote, setCoatOtherNote] = useState(scan?.coatColourNote ?? "");
  const [locationLabel, setLocationLabel] = useState(scan?.locationLabel ?? "");
  const [spotComment, setSpotComment] = useState(scan?.spotComment ?? "");
  const [keepPrivate, setKeepPrivate] = useState(Boolean(scan?.isPrivate));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fuse = useMemo(
    () => new Fuse(breeds, { keys: ["name", "origin", "temperament"], threshold: 0.35 }),
    [breeds],
  );

  const filteredBreeds = query.trim()
    ? fuse.search(query.trim()).map((r) => r.item)
    : breeds;

  if (!scan) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink">
        <Text className="text-black dark:text-white">Scan not found.</Text>
      </View>
    );
  }

  const handleSelectBreed = (id: string) => {
    if (id !== selectedBreedId) {
      setCoatColourId(null);
      setCoatOtherNote("");
    }
    setSelectedBreedId(id);
    setShowBreedPicker(false);
    setQuery("");
  };

  const selectedBreed = breeds.find((b) => b.id === selectedBreedId) ?? null;
  const originalBreedId = scan.breedId;
  const breedChanged = selectedBreedId !== (originalBreedId ?? (scan.isPendingBreed ? null : OTHER_OPTION_ID));

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1) Persist breed change if needed.
      if (breedChanged) {
        if (selectedBreedId === OTHER_OPTION_ID || selectedBreedId === null) {
          await confirmPendingScanAsOther(scan.id);
        } else {
          await confirmPendingScanBreed(scan.id, selectedBreedId, {
            coatColourId,
            coatColourNote: coatOtherNote,
          });
        }
      }
      // 2) Persist non-breed edits.
      await confirmUpdateScanDetails(scan.id, {
        locationLabel,
        spotComment,
        isPrivate: keepPrivate,
        coatColourId,
        coatColourNote: coatOtherNote,
      });
      Alert.alert("Saved", "Your changes have been updated.");
      navigation.goBack();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't save the changes. Please try again.";
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const runDelete = () => {
    setShowDeleteConfirm(false);
    void deleteSpot(scan.id)
      .then(() => navigation.goBack())
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Couldn't delete the scan. Please try again.";
        setDeleteError(message);
      });
  };

  const openPhotoEditor = async () => {
    try {
      const resolved = await resolveScanPhotoDisplayUrl(scan.photoUrl);
      setEditingUri(resolved);
    } catch (err) {
      console.warn("[EditScanScreen] could not open photo editor", err);
      setPhotoError("Couldn't open the photo editor. Please try again in a moment.");
    }
  };

  const closePhotoEditor = () => setEditingUri(null);

  const handlePhotoSave = async (newUri: string) => {
    closePhotoEditor();
    try {
      await replaceScanPhoto(scan.id, newUri);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't update the photo. Please try again.";
      setPhotoError(message);
    }
  };

  const renderBreedRow = (breed: (typeof breeds)[number]) => {
    const isSelected = selectedBreedId === breed.id;
    return (
      <Pressable
        key={breed.id}
        onPress={() => handleSelectBreed(breed.id)}
        className={`mb-3 rounded-3xl border px-4 py-4 ${
          isSelected
            ? "border-amber bg-amber/10 dark:bg-amber/20"
            : "border-zinc-200 bg-white dark:border-border dark:bg-card"
        }`}
      >
        <View className="flex-row items-center gap-4">
          <BreedSpriteThumb breedId={breed.id} />
          <View className="flex-1">
            <Text className="font-semibold text-black dark:text-white">{breed.name}</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{breed.origin}</Text>
          </View>
          <RarityBadge rarity={breed.rarity} />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-ink">
      <FlatList
        className="px-4 pt-6"
        data={[scan]}
        keyExtractor={() => "edit-scan"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={() => (
          <View>
            <View className="flex-row items-center justify-between">
              <Text className="text-3xl font-bold text-black dark:text-white">Edit spot</Text>
              <Pressable
                onPress={() => setShowDeleteConfirm(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Delete spot"
                className="h-10 w-10 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40"
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#dc2626" />
              </Pressable>
            </View>
            <Pressable
              onPress={() => void openPhotoEditor()}
              accessibilityRole="button"
              accessibilityLabel="Edit photo — crop, move and resize"
              className="relative mt-4 overflow-hidden rounded-3xl"
            >
              <ScanPhoto scanId={scan.id} photoUrl={scan.photoUrl} className="h-64 w-full" />
              <View
                pointerEvents="none"
                className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/55 px-2.5 py-1"
              >
                <MaterialCommunityIcons name="image-edit-outline" size={14} color="#fbbf24" />
                <Text className="text-[11px] font-semibold text-white">Edit photo</Text>
              </View>
            </Pressable>

            <Text className="mt-6 text-sm font-semibold text-black dark:text-white">Breed</Text>
            <Pressable
              onPress={() => setShowBreedPicker(true)}
              className="mt-2 flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-border dark:bg-card"
            >
              {selectedBreed ? (
                <>
                  <BreedSpriteThumb breedId={selectedBreed.id} />
                  <View className="flex-1">
                    <Text className="font-semibold text-black dark:text-white">{selectedBreed.name}</Text>
                    <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Tap to change</Text>
                  </View>
                  <RarityBadge rarity={selectedBreed.rarity} />
                </>
              ) : (
                <>
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color="#71717a" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-black dark:text-white">
                      {selectedBreedId === OTHER_OPTION_ID ? "Other / Unknown" : "No breed assigned"}
                    </Text>
                    <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Tap to change</Text>
                  </View>
                </>
              )}
            </Pressable>

            {selectedBreed ? (
              <View className="mt-4 rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-border dark:bg-card">
                <CoatColourPicker
                  breedId={selectedBreed.id}
                  selectedId={coatColourId}
                  otherNote={coatOtherNote}
                  onSelect={setCoatColourId}
                  onOtherNote={setCoatOtherNote}
                />
              </View>
            ) : null}

            <Text className="mt-5 text-sm font-semibold text-black dark:text-white">Location</Text>
            <TextInput
              value={locationLabel}
              onChangeText={(t) => setLocationLabel(t.slice(0, MAX_SCAN_LOCATION_LABEL_LENGTH))}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              placeholder="City, region, country"
              placeholderTextColor="#71717a"
              className="mt-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
            />

            <Text className="mt-5 text-sm font-semibold text-black dark:text-white">Comment</Text>
            <TextInput
              value={spotComment}
              onChangeText={(t) => setSpotComment(t.slice(0, MAX_SPOT_COMMENT_LENGTH))}
              multiline
              placeholder="A short note about this spot"
              placeholderTextColor="#71717a"
              className="mt-2 min-h-[88px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
            />

            <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-black dark:text-white">Keep private</Text>
                <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Don't show this spot on the Social feed.
                </Text>
              </View>
              <Switch value={keepPrivate} onValueChange={setKeepPrivate} />
            </View>
          </View>
        )}
      />

      <View className="absolute inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 px-4 pb-8 pt-3 dark:border-border dark:bg-ink/95">
        <Pressable
          disabled={saving}
          className="rounded-2xl bg-amber px-4 py-4 disabled:opacity-40"
          onPress={() => void submit()}
        >
          <Text className="text-center font-semibold text-white">
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
      </View>

      <Modal
        transparent
        visible={showBreedPicker}
        animationType="slide"
        onRequestClose={() => setShowBreedPicker(false)}
      >
        <View className="flex-1 bg-white dark:bg-ink">
          <View className="flex-row items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-border">
            <Text className="text-xl font-bold text-black dark:text-white">Change breed</Text>
            <Pressable
              onPress={() => setShowBreedPicker(false)}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
            >
              <MaterialCommunityIcons name="close" size={20} color="#71717a" />
            </Pressable>
          </View>
          <FlatList
            className="px-4 pt-3"
            data={filteredBreeds}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="Search breeds"
                  placeholderTextColor="#71717a"
                  autoCorrect={false}
                  autoCapitalize="none"
                  className="mb-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
                />
                {!query.trim() ? (
                  <Pressable
                    onPress={() => handleSelectBreed(OTHER_OPTION_ID)}
                    className={`mb-4 rounded-3xl border px-4 py-4 ${
                      selectedBreedId === OTHER_OPTION_ID
                        ? "border-amber bg-amber/10 dark:bg-amber/20"
                        : "border-dashed border-zinc-300 bg-white dark:border-zinc-600 dark:bg-card"
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="h-11 w-11 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <MaterialCommunityIcons name="help-circle-outline" size={22} color="#71717a" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-black dark:text-white">
                          Other / I don't know
                        </Text>
                        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          Won't unlock anything in Dogdex.
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            }
            renderItem={({ item, index }) => {
              const isFirstOfRarity =
                index === 0 || filteredBreeds[index - 1]?.rarity !== item.rarity;
              return (
                <View>
                  {isFirstOfRarity ? (
                    <Text className="mb-3 mt-2 text-xs font-semibold uppercase tracking-[1.2px] text-zinc-500">
                      {item.rarity}
                    </Text>
                  ) : null}
                  {renderBreedRow(item)}
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDeleteConfirm}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          onPress={() => setShowDeleteConfirm(false)}
          className="flex-1 items-center justify-center bg-black/55 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
          >
            <Text className="text-lg font-bold text-black dark:text-white">Delete this spot?</Text>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This permanently removes the photo and scan. This cannot be undone.
            </Text>
            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-black dark:text-white">Cancel</Text>
              </Pressable>
              <Pressable onPress={runDelete} className="rounded-full bg-red-600 px-4 py-2">
                <Text className="text-sm font-semibold text-white">Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={deleteError !== null}
        animationType="fade"
        onRequestClose={() => setDeleteError(null)}
      >
        <Pressable
          onPress={() => setDeleteError(null)}
          className="flex-1 items-center justify-center bg-black/55 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
          >
            <Text className="text-lg font-bold text-black dark:text-white">Delete failed</Text>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{deleteError}</Text>
            <View className="mt-5 flex-row justify-end">
              <Pressable
                onPress={() => setDeleteError(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-black dark:text-white">OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={photoError !== null}
        animationType="fade"
        onRequestClose={() => setPhotoError(null)}
      >
        <Pressable
          onPress={() => setPhotoError(null)}
          className="flex-1 items-center justify-center bg-black/55 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-card"
          >
            <Text className="text-lg font-bold text-black dark:text-white">Photo error</Text>
            <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{photoError}</Text>
            <View className="mt-5 flex-row justify-end">
              <Pressable
                onPress={() => setPhotoError(null)}
                className="rounded-full bg-zinc-100 px-4 py-2 dark:bg-zinc-800"
              >
                <Text className="text-sm font-semibold text-black dark:text-white">OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SpotPhotoEditorModal
        visible={editingUri !== null}
        imageUri={editingUri}
        onClose={closePhotoEditor}
        onSave={handlePhotoSave}
      />
    </View>
  );
}
