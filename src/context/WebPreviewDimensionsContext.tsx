import { createContext, useContext, type ReactNode } from "react";
import { useWindowDimensions, type ScaledSize } from "react-native";

const WebPreviewDimensionsContext = createContext<ScaledSize | undefined>(undefined);

/**
 * Inside {@link WebPhoneFrame} on web, children should use {@link useLayoutWindowDimensions}
 * so layout matches the preview width/height (not the full browser window).
 */
export function WebPreviewDimensionsProvider({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const { scale, fontScale } = useWindowDimensions();
  const value: ScaledSize = { width, height, scale, fontScale };
  return <WebPreviewDimensionsContext.Provider value={value}>{children}</WebPreviewDimensionsContext.Provider>;
}

export function useLayoutWindowDimensions(): ScaledSize {
  const preview = useContext(WebPreviewDimensionsContext);
  const real = useWindowDimensions();
  return preview ?? real;
}
