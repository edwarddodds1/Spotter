import { FlatList, ScrollView } from "react-native";

/**
 * Hide scroll indicator chrome app-wide. Web still needs global.css for DOM scrollbars.
 */
export function applyScrollViewDefaults() {
  type WithDefaults = { defaultProps?: Record<string, unknown> };

  const ScrollViewCtor = ScrollView as unknown as WithDefaults;
  ScrollViewCtor.defaultProps = {
    ...ScrollViewCtor.defaultProps,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  };

  const FlatListCtor = FlatList as unknown as WithDefaults;
  FlatListCtor.defaultProps = {
    ...FlatListCtor.defaultProps,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  };
}
