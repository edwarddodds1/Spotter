import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";

import {
  getOriginMapData,
  originHighlightRingRadiusVb,
  projectLatLngToWorldSvg,
  WORLD_MAP_VIEWBOX,
} from "@/lib/breedOriginGeo";
import { WORLD_LAND_PATH_DS } from "@/lib/worldLandSvgPaths";
import { useSpotterStore } from "@/store/useSpotterStore";

const VB_W = WORLD_MAP_VIEWBOX.w;
const VB_H = WORLD_MAP_VIEWBOX.h;

/** Dark greys on light backgrounds (~white card). */
const MAP_LIGHT = { ocean: "#3f3f46", land: "#a1a1aa" } as const;
/** Light greys on dark backgrounds (~ink card). */
const MAP_DARK = { ocean: "#a1a1aa", land: "#e4e4e7" } as const;

const RING_STROKE = "rgba(220, 38, 38, 0.95)";

type Props = {
  origin: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function BreedOriginMap({ origin, className, style }: Props) {
  const themeMode = useSpotterStore((s) => s.themeMode);
  const isDark = themeMode === "dark";
  const { ocean, land } = isDark ? MAP_DARK : MAP_LIGHT;

  const data = getOriginMapData(origin);
  if (!data) return null;

  const { x: cx, y: cy } = projectLatLngToWorldSvg(
    data.region.latitude,
    data.region.longitude,
    VB_W,
    VB_H,
  );
  const ringR = originHighlightRingRadiusVb(data.region, VB_W, VB_H);

  return (
    <View className={className} style={[styles.wrap, style]}>
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <Defs>
          <ClipPath id="mapClip">
            <Rect width={VB_W} height={VB_H} rx={12} ry={12} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#mapClip)">
          <Rect width={VB_W} height={VB_H} fill={ocean} />
          {WORLD_LAND_PATH_DS.map((d, i) => (
            <Path key={i} d={d} fill={land} fillRule="evenodd" />
          ))}
          <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={RING_STROKE} strokeWidth={2.6} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    minHeight: 132,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
});
