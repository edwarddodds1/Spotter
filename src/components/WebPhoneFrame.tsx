import type { ReactNode } from "react";
import { View } from "react-native";

type WebPhoneFrameProps = {
  children: ReactNode;
};

/**
 * Full-bleed root for app content on all platforms.
 * (Previously drew a scaled handset frame on web; web now uses the real viewport.)
 */
export function WebPhoneFrame({ children }: WebPhoneFrameProps) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
