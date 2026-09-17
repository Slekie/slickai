/**
 * withMainApplicationFix.js
 *
 * Expo config plugin that rewrites MainApplication.kt after expo prebuild
 * to produce a correct, working setup for RN 0.81.x with Old Architecture.
 *
 * Background:
 *   newArchEnabled is set to false in app.json because EAS Build's preview
 *   profile does not correctly package libreact_featureflagsjni.so and other
 *   New Architecture .so files, causing an immediate crash on all Android
 *   devices:
 *     com.facebook.soloader.SoLoaderDSONotFoundError:
 *       couldn't find DSO to load: libreact_featureflagsjni.so
 *
 *   With Old Architecture, the app works correctly. New Architecture can be
 *   re-enabled when upgrading to Expo SDK 55+, which mandates New Arch and
 *   handles native library packaging correctly.
 *
 * What this plugin fixes:
 *   expo prebuild for RN 0.81.x still generates code that imports
 *   ReactNativeApplicationEntryPoint / calls loadReactNative(this), neither
 *   of which exist in the RN 0.81.5 npm package, causing a Kotlin compile error.
 *
 *   This plugin replaces the entire onCreate() body with the correct
 *   Old Architecture sequence:
 *     SoLoader.init(this, false)
 *     ApplicationLifecycleDispatcher.onApplicationCreate(this)
 *
 *   No DefaultNewArchitectureEntryPoint calls are needed with Old Arch.
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

      // ── 1. Remove bad imports that don't exist in RN 0.81.5 ───────────
      const badImports = [
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\r?\n/m,
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.[^\r\n]+\r?\n/m,
        // Remove New Arch imports — not needed with Old Architecture
        /^import com\.facebook\.react\.common\.ReleaseLevel\r?\n/m,
        /^import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint\r?\n/m,
      ];
      for (const pattern of badImports) {
        src = src.replace(pattern, '');
      }

      // ── 2. Ensure SoLoader import is present ──────────────────────────
      if (!src.includes('import com.facebook.soloader.SoLoader')) {
        src = src.replace(
          /(import expo\.modules\.ReactNativeHostWrapper\n)/,
          '$1import com.facebook.soloader.SoLoader\n'
        );
        if (!src.includes('import com.facebook.soloader.SoLoader')) {
          src = src.replace(
            /^class MainApplication/m,
            'import com.facebook.soloader.SoLoader\n\nclass MainApplication'
          );
        }
      }

      // ── 3. Rewrite the entire onCreate() body ─────────────────────────
      // Old Architecture only needs SoLoader.init + ApplicationLifecycleDispatcher.
      // No DefaultNewArchitectureEntryPoint calls required.
      const correctOnCreate = `  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }`;

      const onCreatePattern = /  override fun onCreate\(\) \{[\s\S]*?\n  \}/;
      if (onCreatePattern.test(src)) {
        src = src.replace(onCreatePattern, correctOnCreate);
        console.log('[withMainApplicationFix] Rewrote onCreate() for Old Architecture (SoLoader.init only)');
      } else {
        console.warn('[withMainApplicationFix] Could not find onCreate() — manual inspection needed');
      }

      fs.writeFileSync(mainAppPath, src, 'utf8');
      return mod;
    },
  ]);
};
