const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidBundleConfig(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    // 1. Add bundleCommand = "export:embed" after cliFile line if missing
    if (!gradle.includes('bundleCommand')) {
      gradle = gradle.replace(/(cliFile\s*=.*\n)/, '$1    bundleCommand = "export:embed"\n');
    }

    // 2. Remove BUNDLE_SKIP conditional block if present
    gradle = gradle.replace(/\/\/ When BUNDLE_SKIP[\s\S]*?}\s*\n/, '');

    // 3. Add debuggableVariants = [] unconditionally if missing
    if (!gradle.includes('debuggableVariants')) {
      gradle = gradle.replace(/(bundleCommand\s*=.*\n)/, '$1\n    // Always embed JS bundle in every build variant\n    debuggableVariants = []\n');
    }

    mod.modResults.contents = gradle;
    return mod;
  });
};
