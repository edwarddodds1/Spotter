import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { ClipPath, Defs, Line, Polygon, Rect } from "react-native-svg";

import { COAT_OTHER_ID, getCommonColoursForBreed } from "@/constants/breedCoatColours";
import type { CoatColourOption } from "@/types/app";

type Props = {
  breedId: string | null;
  selectedId: string | null;
  otherNote: string;
  onSelect: (id: string | null) => void;
  onOtherNote: (note: string) => void;
};

export function CoatColourPicker({ breedId, selectedId, otherNote, onSelect, onOtherNote }: Props) {
  const options = getCommonColoursForBreed(breedId);

  return (
    <View className="mt-5">
      <Text className="text-sm font-semibold text-black dark:text-white">Coat colour</Text>
      <Text className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
        Optional — tap a common colour for this breed, or Other to describe it. This fills in your breed colour collection.
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        {options.map((opt) => {
          const isOther = opt.id === COAT_OTHER_ID;
          const selected = selectedId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(selected ? null : opt.id)}
              className="items-center"
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected }}
            >
              <CoatColourSwatch option={opt} selected={selected} showCollectedRing={selected} isOther={isOther} />
              <Text className="mt-1 max-w-[4.5rem] text-center text-[10px] text-zinc-600 dark:text-zinc-400" numberOfLines={2}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedId === COAT_OTHER_ID ? (
        <TextInput
          value={otherNote}
          onChangeText={onOtherNote}
          placeholder="Describe the colour (e.g. blue merle, parti)"
          placeholderTextColor="#71717a"
          className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black dark:border-border dark:bg-card dark:text-white"
        />
      ) : null}
    </View>
  );
}

export function CoatColourSwatch({
  option,
  selected,
  showCollectedRing,
  isOther,
}: {
  option: CoatColourOption;
  selected: boolean;
  showCollectedRing: boolean;
  isOther?: boolean;
}) {
  return (
    <View
      className="h-12 w-12 overflow-hidden rounded-full border-[3px] border-black items-center justify-center"
      style={{ backgroundColor: option.hex }}
    >
      {showCollectedRing ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: "rgba(34,197,94,0.95)",
          }}
        />
      ) : null}
      {option.secondaryHex && option.pattern === "split" ? (
        <Svg width="100%" height="100%" viewBox="0 0 48 48">
          <Defs>
            <ClipPath id="splitCircleClip">
              <Rect x="0" y="0" width="48" height="48" rx="24" ry="24" />
            </ClipPath>
          </Defs>
          <Polygon points="0,0 0,48 15,48 33,0" fill={option.hex} clipPath="url(#splitCircleClip)" />
          <Polygon points="33,0 15,48 48,48 48,0" fill={option.secondaryHex} clipPath="url(#splitCircleClip)" />
          <Line x1="15" y1="48" x2="33" y2="0" stroke="#111827" strokeWidth="1.8" clipPath="url(#splitCircleClip)" />
        </Svg>
      ) : option.secondaryHex && option.pattern === "spots" ? (
        <>
          <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: option.hex }} />
          <View style={{ position: "absolute", width: 10, height: 10, borderRadius: 999, top: 8, left: 8, backgroundColor: option.secondaryHex }} />
          <View style={{ position: "absolute", width: 9, height: 9, borderRadius: 999, top: 24, left: 22, backgroundColor: option.secondaryHex }} />
          <View style={{ position: "absolute", width: 8, height: 8, borderRadius: 999, top: 12, left: 28, backgroundColor: option.secondaryHex }} />
        </>
      ) : null}
      {selected ? (
        <MaterialCommunityIcons name="check" size={22} color={pickCheckColor(option.secondaryHex ?? option.hex)} />
      ) : isOther ? (
        <MaterialCommunityIcons name="dots-horizontal" size={22} color="#52525b" />
      ) : null}
    </View>
  );
}

export function pickCheckColor(hex: string): string {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1c1917" : "#ffffff";
}
