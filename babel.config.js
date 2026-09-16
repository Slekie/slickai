module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // No Reanimated/Worklets Babel plugin needed for Expo projects.
    // Expo SDK handles the worklets transform automatically via babel-preset-expo.
    // Adding it manually causes crashes in Expo Go.
    plugins: [],
  };
};