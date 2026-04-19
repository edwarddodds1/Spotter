import { Image, type ImageProps, type ImageStyle, type StyleProp } from "react-native";

/** App icon / dalmatian mark — same asset as Expo `icon`, splash, and favicon. */
const appMark = require("../../assets/icon.png");

type Props = Omit<ImageProps, "source"> & {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function AppMark({ size = 40, style, resizeMode = "contain", accessibilityLabel = "Spotter", ...rest }: Props) {
  return (
    <Image
      source={appMark}
      style={[{ width: size, height: size }, style]}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      {...rest}
    />
  );
}
