import type { ReactNode } from "react";
import { Platform, useWindowDimensions, View, type ViewStyle } from "react-native";

import { WebPreviewDimensionsProvider } from "@/context/WebPreviewDimensionsContext";

/**
 * Aspect ratio matches iPhone 13 / 13 Pro / 14 portrait logical points (390 × 844).
 * The frame scales to the largest size that fits the window; it is not capped at 390px wide.
 */
export const IPHONE_13_PRO_WIDTH_PT = 390;
export const IPHONE_13_PRO_HEIGHT_PT = 844;
const ASPECT = IPHONE_13_PRO_HEIGHT_PT / IPHONE_13_PRO_WIDTH_PT;
const MIN_FRAME_EDGE = 260;

type WebPhoneFrameProps = {
  children: ReactNode;
};

/**
 * On web: centers app content in a scaled handset matching iPhone 13 Pro aspect ratio.
 * On native: full-bleed flex container (no chrome).
 */
export function WebPhoneFrame({ children }: WebPhoneFrameProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  const padH = 20;
  const padV = 20;
  const maxFrameW = Math.max(windowWidth - padH * 2, MIN_FRAME_EDGE);
  const maxFrameH = Math.max(windowHeight - padV * 2, MIN_FRAME_EDGE);

  /* Largest 390:844 rectangle that fits inside the viewport (letterboxed on the page). */
  let frameW = maxFrameW;
  let frameH = frameW * ASPECT;
  if (frameH > maxFrameH) {
    frameH = maxFrameH;
    frameW = frameH / ASPECT;
  }

  const innerCornerRadius = Math.round((47 * frameW) / IPHONE_13_PRO_WIDTH_PT);
  /** Bezel as padding so the inner screen stays exactly `frameW × frameH` (avoids RN Web border-box clipping). */
  const bezel = Math.max(3, Math.round((5 * frameW) / IPHONE_13_PRO_WIDTH_PT));
  const outerCornerRadius = innerCornerRadius + bezel;

  const bezelShellStyle: ViewStyle = {
    padding: bezel,
    borderRadius: outerCornerRadius,
    backgroundColor: "#18181b",
    boxShadow: "0 28px 64px rgba(15, 23, 42, 0.32)",
  };

  const screenStyle: ViewStyle = {
    width: frameW,
    height: frameH,
    borderRadius: innerCornerRadius,
    overflow: "hidden",
  };

  return (
    <View className="flex-1 items-center justify-center bg-zinc-400 px-3 py-4 dark:bg-zinc-900">
      <View style={bezelShellStyle}>
        <View style={screenStyle} className="bg-white dark:bg-ink">
          <WebPreviewDimensionsProvider width={frameW} height={frameH}>
            <View style={{ flex: 1, width: "100%", minHeight: 0 }}>{children}</View>
          </WebPreviewDimensionsProvider>
        </View>
      </View>
    </View>
  );
}
