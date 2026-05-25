import type { ReactNode } from "react";
import { Platform, useWindowDimensions, View } from "react-native";

import { WebPreviewDimensionsProvider } from "@/context/WebPreviewDimensionsContext";

/** Logical reference for layout helpers that still want a "phone width". */
export const IPHONE_13_PRO_WIDTH_PT = 390;
export const IPHONE_13_PRO_HEIGHT_PT = 844;

/** Desktop browsers get a centered column capped at this width so the mobile UI
 *  doesn't stretch to 1080px+ on a wide monitor. Below this, we go full-bleed. */
const MAX_CONTENT_WIDTH = 520;

type WebPhoneFrameProps = {
  children: ReactNode;
};

/**
 * On web: full-bleed, responsive container. On a phone-width window the app
 * fills the screen edge-to-edge; on wider screens (tablet/desktop) the content
 * is centered in a capped column so the mobile-first layout stays usable.
 * On native: pure flex container.
 */
export function WebPhoneFrame({ children }: WebPhoneFrameProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  const contentWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);
  const needsLetterbox = windowWidth > MAX_CONTENT_WIDTH;

  return (
    <View
      style={{ flex: 1, width: "100%", minHeight: 0 }}
      className={needsLetterbox ? "items-center bg-zinc-100 dark:bg-zinc-900" : undefined}
    >
      <View
        style={{ flex: 1, width: contentWidth, minHeight: 0 }}
        className="bg-white dark:bg-ink"
      >
        <WebPreviewDimensionsProvider width={contentWidth} height={windowHeight}>
          <View style={{ flex: 1, width: "100%", minHeight: 0 }}>{children}</View>
        </WebPreviewDimensionsProvider>
      </View>
    </View>
  );
}
