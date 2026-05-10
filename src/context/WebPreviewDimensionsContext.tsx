import { createContext, useContext, type ReactNode } from "react";
import { useWindowDimensions, type ScaledSize } from "react-native";

const WebPreviewDimensionsContext = createContext<ScaledSize | undefined>(undefined);

/**
 * Optional override for layout width/height. When absent (normal web/native), {@link useLayoutWindowDimensions}
 * falls back to {@link useWindowDimensions}.
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
