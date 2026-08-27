/**
 * withAndroidBundleConfig.js
 *
 * Expo config plugin that patches android/app/build.gradle after expo prebuild:
 *
 *  1. Sets bundleCommand = "export:embed" so Gradle uses the Expo CLI bundler.
 *  2. Removes the BUNDLE_SKIP conditional (no longer needed).
 *  3. Sets debuggableVariants = [] so the JS bundle is ALWAYS embedded in the
 *     APK — never loaded from a Metro dev server at runtime.
 *     Without this, installing a debug APK on a physical device shows:
 *     "Unable to load script. Make sure you are running a Metro server."
 *
 * Strategy: find the closing brace of the react {} block and insert the two
 * settings just before it. This is resilient to Expo template changes.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidBundleConfig(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    // ── Step 1: ensure bundleCommand is set ─────────────────────────────────
    if (!gradle.includes('bundleCommand')) {
      // Insert after the autolinkLibrariesWithApp() call inside react {}
      gradle = gradle.replace(
        /(autolinkLibrariesWithApp\(\))/,
        'bundleCommand = "export:embed"\n    ',
      );
    }

    // ── Step 2: remove legacy BUNDLE_SKIP block if present ──────────────────
    gradle = gradle.replace(
      /\/\/ When BUNDLE_SKIP[^}]*\{[^}]*\}\s*/g,
      '',
    );

    // ── Step 3: ensure debuggableVariants = [] is set ───────────────────────
    if (!gradle.includes('debuggableVariants')) {
      // Insert just before autolinkLibrariesWithApp() which is always last in react {}
      gradle = gradle.replace(
        /(autolinkLibrariesWithApp\(\))/,
        '// Always embed JS bundle — never load from Metro dev server\n    debuggableVariants = []\n\n    ',
      );
    }

    mod.modResults.contents = gradle;
    return mod;
  });
};