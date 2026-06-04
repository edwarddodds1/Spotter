import { useEffect, useRef, useState } from "react";
import { Animated, type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { palette } from "@/constants/theme";

export type SegmentOption<TId extends string> = {
  id: TId;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

type Props<TId extends string> = {
  options: readonly SegmentOption<TId>[];
  value: TId;
  onChange: (id: TId) => void;
  /** `md` = ~44px tall (Friends/Global), `sm` = ~36px (time filters). */
  size?: "md" | "sm";
  /** Prefix used to label the choices for screen readers (e.g. "Filter by"). */
  accessibilityLabelPrefix?: string;
  /** Extra className for the outer track. */
  className?: string;
};

const TRACK_PADDING = 4;

/**
 * Animated segmented control. Renders a rounded pill track with the active
 * segment indicated by a sliding amber pill that springs to the selected
 * segment when `value` changes. Track measures itself once on layout, then
 * subsequent selections animate via React Native's built-in Animated API
 * (native driver) so it stays smooth on web and native without Reanimated.
 */
export function SegmentedSlider<TId extends string>({
  options,
  value,
  onChange,
  size = "md",
  accessibilityLabelPrefix,
  className,
}: Props<TId>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );
  const isFirstAnim = useRef(true);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = TRACK_PADDING + activeIndex * segmentWidth;
    if (isFirstAnim.current) {
      translateX.setValue(target);
      isFirstAnim.current = false;
      return;
    }
    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      stiffness: 220,
      damping: 22,
      mass: 0.7,
    }).start();
  }, [activeIndex, segmentWidth, translateX]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== trackWidth) setTrackWidth(w);
  };

  const trackHeightClass = size === "md" ? "h-12" : "h-9";
  const pillHeight = size === "md" ? 40 : 28;
  const textSizeClass = size === "md" ? "text-sm" : "text-xs";
  const iconSize = size === "md" ? 18 : 16;

  return (
    <View
      onLayout={onLayout}
      className={`relative flex-row rounded-full bg-zinc-100 dark:bg-card ${trackHeightClass} ${className ?? ""}`}
      style={{ padding: TRACK_PADDING }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: TRACK_PADDING,
            left: 0,
            width: segmentWidth,
            height: pillHeight,
            borderRadius: 999,
            backgroundColor: palette.amber,
            transform: [{ translateX }],
          }}
        />
      ) : null}

      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              accessibilityLabelPrefix
                ? `${accessibilityLabelPrefix} ${option.label}`
                : option.label
            }
            onPress={() => onChange(option.id)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full"
          >
            {option.icon ? (
              <MaterialCommunityIcons
                name={option.icon}
                size={iconSize}
                color={active ? "#ffffff" : "#71717a"}
              />
            ) : null}
            <Text
              className={`text-center font-semibold ${textSizeClass} ${
                active ? "text-white" : "text-zinc-600 dark:text-zinc-400"
              }`}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
