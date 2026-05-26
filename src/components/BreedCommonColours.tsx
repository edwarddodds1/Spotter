import { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { COAT_OTHER_ID, getCommonColoursForBreed } from "@/constants/breedCoatColours";
import { breedProfileAccent, variantThresholds } from "@/constants/theme";
import type { CoatColourOption, BreedRarity, ScanRecord } from "@/types/app";

type Props = {
  breedId: string;
  rarity: BreedRarity;
  scans: ScanRecord[];
  isUnlocked: boolean;
};

const SEGMENT_HEIGHT = 56;
const PROGRESS_GREEN = breedProfileAccent.primary;
const PROGRESS_GREEN_DARK = breedProfileAccent.primaryDark;

/**
 * Uniformly green when discovered (matches the breed-profile stars/icons),
 * neutral grey otherwise. The actual coat colour is shown as a swatch
 * circle below the segment.
 */
function VariantSegmentFill({ discovered }: { discovered: boolean }) {
  if (!discovered) {
    return (
      <View
        className="h-full w-full bg-zinc-200 dark:bg-zinc-800"
        style={{ minHeight: SEGMENT_HEIGHT }}
      />
    );
  }
  return (
    <View
      className="h-full w-full"
      style={{ minHeight: SEGMENT_HEIGHT, backgroundColor: PROGRESS_GREEN }}
    />
  );
}

/**
 * Small (24px) colour identifier displayed under each progress segment.
 * Mirrors the swatches used in `CoatColourPicker` but at a more compact size.
 */
function ColourSwatchCircle({
  option,
  discovered,
}: {
  option: CoatColourOption;
  discovered: boolean;
}) {
  const isOther = option.id === COAT_OTHER_ID;
  const borderColor = discovered ? "#171717" : "#a1a1aa";
  const borderStyle: "solid" | "dashed" = discovered ? "solid" : "dashed";

  return (
    <View
      className="h-6 w-6 items-center justify-center overflow-hidden rounded-full"
      style={{
        backgroundColor: option.hex,
        borderWidth: discovered ? 2 : 1.5,
        borderColor,
        borderStyle,
        opacity: discovered ? 1 : 0.7,
      }}
    >
      {option.secondaryHex && option.pattern === "split" ? (
        <View className="absolute inset-0 flex-row">
          <View style={{ flex: 1, backgroundColor: option.hex }} />
          <View style={{ flex: 1, backgroundColor: option.secondaryHex }} />
        </View>
      ) : option.secondaryHex && option.pattern === "spots" ? (
        <>
          <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: option.hex }} />
          <View style={{ position: "absolute", width: 5, height: 5, borderRadius: 999, top: 4, left: 4, backgroundColor: option.secondaryHex }} />
          <View style={{ position: "absolute", width: 4, height: 4, borderRadius: 999, top: 12, left: 11, backgroundColor: option.secondaryHex }} />
          <View style={{ position: "absolute", width: 4, height: 4, borderRadius: 999, top: 5, left: 14, backgroundColor: option.secondaryHex }} />
        </>
      ) : null}
      {isOther ? (
        <MaterialCommunityIcons name="dots-horizontal" size={12} color="#52525b" />
      ) : null}
    </View>
  );
}

export function BreedCommonColours({ breedId, rarity, scans, isUnlocked }: Props) {
  const options = getCommonColoursForBreed(breedId);

  const scanCountsByCoat = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scans) {
      if (!s.coatColourId) continue;
      m.set(s.coatColourId, (m.get(s.coatColourId) ?? 0) + 1);
    }
    return m;
  }, [scans]);

  const discoveredCount = useMemo(
    () => options.filter((o) => (scanCountsByCoat.get(o.id) ?? 0) > 0).length,
    [options, scanCountsByCoat],
  );

  const totalVariants = options.length;
  const variantScanTarget = variantThresholds[rarity];
  const scansToNextVariant = Math.max(variantScanTarget - scans.length, 0);

  return (
    <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-lg font-bold text-black dark:text-white">Variant progress</Text>
        <Text className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          {discoveredCount} / {totalVariants} discovered
        </Text>
      </View>

      {totalVariants > 0 ? (
        <View className="mt-3">
          <View
            className="overflow-hidden rounded-2xl border-2 bg-zinc-100 dark:bg-zinc-900/40"
            style={{ borderColor: PROGRESS_GREEN_DARK }}
          >
            <View className="flex-row">
              {options.map((opt, index) => {
                const count = scanCountsByCoat.get(opt.id) ?? 0;
                const discovered = count > 0;
                const isLast = index === options.length - 1;
                return (
                  <View key={opt.id} className="min-w-0 flex-1">
                    <View className="relative" style={{ minHeight: SEGMENT_HEIGHT }}>
                      <VariantSegmentFill discovered={discovered} />
                      {!isLast ? (
                        <View
                          pointerEvents="none"
                          className="absolute right-0 top-2 bottom-2 w-px bg-zinc-500/35 dark:bg-zinc-300/35"
                        />
                      ) : null}
                      {discovered ? (
                        <View
                          pointerEvents="none"
                          className="absolute bottom-1.5 right-1.5 rounded-full bg-black/40 px-0.5"
                        >
                          <MaterialCommunityIcons name="check" size={14} color="#ffffff" />
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mt-2 flex-row">
            {options.map((opt, index) => {
              const count = scanCountsByCoat.get(opt.id) ?? 0;
              const discovered = count > 0;
              const isLast = index === options.length - 1;
              return (
                <View
                  key={`${opt.id}-meta`}
                  className={`min-w-0 flex-1 items-center px-0.5 ${!isLast ? "border-r border-zinc-200 dark:border-zinc-700" : ""}`}
                >
                  <ColourSwatchCircle option={opt} discovered={discovered} />
                  <Text
                    className="mt-1 text-center text-[9px] font-medium leading-3 text-zinc-700 dark:text-zinc-300"
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    className={`mt-0.5 text-center text-[9px] ${discovered ? "font-semibold text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-500"}`}
                    numberOfLines={1}
                    style={discovered ? { color: PROGRESS_GREEN } : undefined}
                  >
                    {discovered ? `${count}×` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {isUnlocked ? (
        <>
          <Text className="mt-3 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
            {scansToNextVariant === 0
              ? "Colour variant tier unlocked — keep spotting new coat colours."
              : `${scansToNextVariant} more scan${scansToNextVariant === 1 ? "" : "s"} for the next colour variant tier.`}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-500">
            Each segment fills when you log a spot with that coat colour.
          </Text>
        </>
      ) : null}
    </View>
  );
}
