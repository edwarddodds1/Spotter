module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    // Must be last: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/#babel-plugin
    plugins: ["react-native-reanimated/plugin"],
  };
};
