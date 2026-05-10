import { useMemo } from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { COAT_OTHER_ID, getCommonColoursForBreed } from "@/constants/breedCoatColours";
import { variantThresholds } from "@/constants/theme";
import type { CoatColourOption, BreedRarity, ScanRecord } from "@/types/app";

type Props = {
  breedId: string;
  rarity: BreedRarity;
  scans: ScanRecord[];
  isUnlocked: boolean;
};

const SEGMENT_HEIGHT = 56;

function VariantSegmentFill({ option, discovered }: { option: CoatColourOption; discovered: boolean }) {
  const hStyle = { minHeight: SEGMENT_HEIGHT };

  if (!discovered) {
    return <View className="h-full w-full bg-zinc-200 dark:bg-zinc-800" style={hStyle} />;
  }

  if (option.id === COAT_OTHER_ID) {
    return (
      <View
        className="h-full w-full items-center justify-center"
        style={{ backgroundColor: option.hex, ...hStyle }}
      >
        <MaterialCommunityIcons name="dots-horizontal" size={18} color="#52525b" />
      </View>
    );
  }

  if (option.secondaryHex && option.pattern === "split") {
    return (
      <View className="h-full w-full flex-row" style={hStyle}>
        <View style={{ flex: 1, backgroundColor: option.hex }} />
        <View style={{ flex: 1, backgroundColor: option.secondaryHex }} />
      </View>
    );
  }

  if (option.secondaryHex && option.pattern === "spots") {
    return (
      <View className="h-full w-full overflow-hidden" style={{ backgroundColor: option.hex, ...hStyle }}>
        <View
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            borderRadius: 999,
            top: 6,
            left: "18%",
            backgroundColor: option.secondaryHex,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            borderRadius: 999,
            top: 18,
            left: "42%",
            backgroundColor: option.secondaryHex,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: 999,
            top: 8,
            right: "20%",
            backgroundColor: option.secondaryHex,
          }}
        />
      </View>
    );
  }

  return <View className="h-full w-full" style={{ backgroundColor: option.hex, ...hStyle }} />;
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
          <View className="overflow-hidden rounded-2xl border-2 border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/40">
            <View className="flex-row">
              {options.map((opt, index) => {
                const count = scanCountsByCoat.get(opt.id) ?? 0;
                const discovered = count > 0;
                const isLast = index === options.length - 1;
                return (
                  <View key={opt.id} className="min-w-0 flex-1">
                    <View className="relative" style={{ minHeight: SEGMENT_HEIGHT }}>
                      <VariantSegmentFill option={opt} discovered={discovered} />
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
                  className={`min-w-0 flex-1 px-0.5 ${!isLast ? "border-r border-zinc-200 dark:border-zinc-700" : ""}`}
                >
                  <Text
                    className="text-center text-[9px] font-medium leading-3 text-zinc-700 dark:text-zinc-300"
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    className={`mt-0.5 text-center text-[9px] ${discovered ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-500"}`}
                    numberOfLines={1}
                  >
                    {discovered ? `${count}×` : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text className="mt-3 text-sm leading-5 text-zinc-600 dark:text-zinc-400">
        {!isUnlocked
          ? "Spot this breed at least once to track coat colours."
          : scansToNextVariant === 0
            ? "Colour variant tier unlocked — keep spotting new coat colours."
            : `${scansToNextVariant} more scan${scansToNextVariant === 1 ? "" : "s"} for the next colour variant tier.`}
      </Text>
      {isUnlocked ? (
        <Text className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-500">
          Each segment fills when you log a spot with that coat colour.
        </Text>
      ) : null}
    </View>
  );
}
