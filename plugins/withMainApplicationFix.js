/**
 * withMainApplicationFix.js
 *
 * Expo config plugin that rewrites MainApplication.kt after expo prebuild
 * to produce a correct, working New Architecture setup for RN 0.81.x.
 *
 * Problems this fixes:
 *   1. BUILD ERROR: expo prebuild generates code importing
 *      ReactNativeApplicationEntryPoint / calling loadReactNative(this),
 *      neither of which exist in RN 0.81.5.
 *
 *   2. RUNTIME CRASH: the previous fix replaced those calls with
 *      DefaultNewArchitectureEntryPoint.load() but omitted
 *      SoLoader.init(this, false). SoLoader must be initialised before
 *      any native library (.so) can be loaded. Without it the app crashes
 *      immediately on launch with:
 *        java.lang.IllegalStateException: SoLoader.init() not yet called
 *
 * Fix: replace the entire onCreate() body with the correct sequence:
 *   1. SoLoader.init(this, false)          <- must be first
 *   2. DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
 *   3. DefaultNewArchitectureEntryPoint.load()
 *   4. ApplicationLifecycleDispatcher.onApplicationCreate(this)
 *
 * Also ensures the SoLoader import is present.
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

      // ── 1. Remove any bad imports ───────────────────────────────────────
      const badImports = [
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\r?\n/m,
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.[^\r\n]+\r?\n/m,
      ];
      for (const pattern of badImports) {
        src = src.replace(pattern, '');
      }

      // ── 2. Ensure SoLoader import is present ───────────────────────────
      if (!src.includes('import com.facebook.soloader.SoLoader')) {
        // Insert after the last 'import expo.' line, or after last 'import' line
        src = src.replace(
          /(import expo\.modules\.ReactNativeHostWrapper\n)/,
          '$1import com.facebook.soloader.SoLoader\n'
        );
        // Fallback: insert before 'class MainApplication'
        if (!src.includes('import com.facebook.soloader.SoLoader')) {
          src = src.replace(
            /^class MainApplication/m,
            'import com.facebook.soloader.SoLoader\n\nclass MainApplication'
          );
        }
      }

      // ── 3. Rewrite the entire onCreate() body ─────────────────────────
      // Match the full onCreate body regardless of what Expo prebuild generated.
      // We replace everything between 'override fun onCreate()' and the matching '}'.
      const correctOnCreate = `  override fun onCreate() {
    super.onCreate()
    // SoLoader MUST be initialised before any native library is loaded.
    // DefaultNewArchitectureEntryPoint.load() loads react_newarchdefaults.so
    // and ReactNativeFeatureFlags loads a CXX interop .so — both require
    // SoLoader to be ready, or the app crashes with:
    //   IllegalStateException: SoLoader.init() not yet called
    SoLoader.init(this, false)
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
    DefaultNewArchitectureEntryPoint.load()
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }`;

      // Pattern: capture the existing onCreate body and replace it wholesale.
      // Handles any variant that expo prebuild might generate.
      const onCreatePattern = /  override fun onCreate\(\) \{[\s\S]*?\n  \}/;
      if (onCreatePattern.test(src)) {
        src = src.replace(onCreatePattern, correctOnCreate);
        console.log('[withMainApplicationFix] Replaced onCreate() body with correct SoLoader + New Arch sequence');
      } else {
        console.warn('[withMainApplicationFix] Could not find onCreate() — MainApplication.kt may need manual inspection');
      }

      fs.writeFileSync(mainAppPath, src, 'utf8');
      return mod;
    },
  ]);
};
