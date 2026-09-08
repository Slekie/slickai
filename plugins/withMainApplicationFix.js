/**
 * withMainApplicationFix.js
 *
 * Expo config plugin that fixes MainApplication.kt after expo prebuild.
 *
 * Problem:
 *   expo prebuild for react-native@0.81.x generates a MainApplication.kt that
 *   imports com.facebook.react.ReactNativeApplicationEntryPoint and calls
 *   loadReactNative(this). This class does NOT exist in the react-native@0.81.5
 *   npm package. The Kotlin compiler fails with an unresolved reference, causing:
 *     > Task :app:compileDebugKotlin FAILED
 *
 * Fix:
 *   1. Remove the ReactNativeApplicationEntryPoint import
 *   2. Remove the loadReactNative import
 *   3. Replace the try/catch ReleaseLevel + loadReactNative(this) block with:
 *        DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
 *        DefaultNewArchitectureEntryPoint.load()
 *
 * DefaultNewArchitectureEntryPoint and ReleaseLevel are both valid in RN 0.81.5.
 * DefaultNewArchitectureEntryPoint.load() calls DefaultSoLoader.maybeLoadSoLibrary()
 * internally, replacing the need for loadReactNative().
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withMainApplicationFix(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const mainAppPath = path.join(
        mod.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'slickai', 'app', 'MainApplication.kt'
      );

      if (!fs.existsSync(mainAppPath)) {
        console.warn('[withMainApplicationFix] MainApplication.kt not found at', mainAppPath);
        return mod;
      }

      let src = fs.readFileSync(mainAppPath, 'utf8');
      let changed = false;

      // Remove ReactNativeApplicationEntryPoint imports (both forms)
      const importPatterns = [
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\r?\n/m,
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.[^\r\n]+\r?\n/m,
      ];
      for (const pattern of importPatterns) {
        if (pattern.test(src)) {
          src = src.replace(pattern, '');
          changed = true;
        }
      }

      // Replace the try/catch ReleaseLevel + loadReactNative(this) block
      // Matches the full block that expo prebuild generates:
      //   DefaultNewArchitectureEntryPoint.releaseLevel = try {
      //     ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
      //   } catch (e: IllegalArgumentException) {
      //     ReleaseLevel.STABLE
      //   }
      //   loadReactNative(this)
      const tryBlockPattern = /DefaultNewArchitectureEntryPoint\.releaseLevel\s*=\s*try\s*\{[\s\S]*?ReleaseLevel\.STABLE\s*\}\s*\n\s*loadReactNative\(this\)/;
      const fixedBlock = 'DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE\n    DefaultNewArchitectureEntryPoint.load()';

      if (tryBlockPattern.test(src)) {
        src = src.replace(tryBlockPattern, fixedBlock);
        changed = true;
      }

      // Also handle the case where loadReactNative(this) appears standalone
      // (in case expo prebuild template changes slightly)
      if (/^\s*loadReactNative\(this\)/m.test(src)) {
        src = src.replace(/^\s*loadReactNative\(this\)\r?\n/m, '');
        changed = true;
      }

      // Ensure DefaultNewArchitectureEntryPoint.load() is called after setting releaseLevel
      // If releaseLevel is set but .load() is missing, add it
      if (
        /DefaultNewArchitectureEntryPoint\.releaseLevel\s*=\s*ReleaseLevel\.STABLE/.test(src) &&
        !/DefaultNewArchitectureEntryPoint\.load\(\)/.test(src)
      ) {
        src = src.replace(
          /(DefaultNewArchitectureEntryPoint\.releaseLevel\s*=\s*ReleaseLevel\.STABLE)/,
          '$1\n    DefaultNewArchitectureEntryPoint.load()'
        );
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(mainAppPath, src, 'utf8');
        console.log('[withMainApplicationFix] Patched MainApplication.kt successfully');
      } else if (/DefaultNewArchitectureEntryPoint\.load\(\)/.test(src)) {
        console.log('[withMainApplicationFix] MainApplication.kt already patched — no changes needed');
      } else {
        console.warn('[withMainApplicationFix] Could not find expected pattern in MainApplication.kt — manual inspection may be needed');
      }

      return mod;
    },
  ]);
};
