/**
 * withMainApplicationFix.js
 *
 * Fixes MainApplication.kt after expo prebuild for RN 0.81.x + New Architecture.
 *
 * Problems fixed:
 *
 * 1. BUILD ERROR: expo prebuild generates code that imports
 *    ReactNativeApplicationEntryPoint / calls loadReactNative(this).
 *    Neither exist in RN 0.81.5. Causes compileDebugKotlin FAILED.
 *
 * 2. RUNTIME CRASH: DefaultNewArchitectureEntryPoint.load() calls
 *    ReactNativeFeatureFlags.override() which loads libreact_featureflagsjni.so
 *    via SoLoader. If SoLoader.init() has not been called yet, the app crashes:
 *      IllegalStateException: SoLoader.init() not yet called
 *
 * Fix: rewrite onCreate() to the correct New Architecture sequence:
 *   SoLoader.init(this, false)                           <- must be first
 *   DefaultNewArchitectureEntryPoint.releaseLevel = ...  <- optional, sets feature flags
 *   DefaultNewArchitectureEntryPoint.load()              <- loads New Arch native libs
 *   ApplicationLifecycleDispatcher.onApplicationCreate(this)
 *
 * Note: newArchEnabled MUST remain true in app.json.
 *   react-native-worklets (required by react-native-reanimated 4.x) throws a
 *   hard build error if newArchEnabled=false:
 *     [Worklets] Worklets require new architecture to be enabled.
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

      // ── 1. Remove imports that don't exist in RN 0.81.5 ──────────────
      const badImports = [
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\r?\n/m,
        /^import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.[^\r\n]+\r?\n/m,
      ];
      for (const pattern of badImports) {
        src = src.replace(pattern, '');
      }

      // ── 2. Ensure required imports are present ────────────────────────
      const requiredImports = {
        'import com.facebook.soloader.SoLoader':
          /import com\.facebook\.soloader\.SoLoader/,
        'import com.facebook.react.common.ReleaseLevel':
          /import com\.facebook\.react\.common\.ReleaseLevel/,
        'import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint':
          /import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint/,
      };

      for (const [importLine, checkPattern] of Object.entries(requiredImports)) {
        if (!checkPattern.test(src)) {
          // Insert before "class MainApplication"
          src = src.replace(
            /^class MainApplication/m,
            `${importLine}\n\nclass MainApplication`
          );
        }
      }

      // ── 3. Replace the entire onCreate() body ────────────────────────
      // Correct New Architecture sequence for RN 0.81.x:
      //   1. SoLoader.init(this, false)  — must come before any .so loading
      //   2. DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
      //   3. DefaultNewArchitectureEntryPoint.load()  — loads New Arch .so files
      //   4. ApplicationLifecycleDispatcher.onApplicationCreate(this)
      const correctOnCreate = `  override fun onCreate() {
    super.onCreate()
    // SoLoader MUST be initialised before DefaultNewArchitectureEntryPoint.load().
    // load() triggers ReactNativeFeatureFlags to load libreact_featureflagsjni.so
    // via SoLoader — if SoLoader is not yet initialised this crashes with:
    //   java.lang.IllegalStateException: SoLoader.init() not yet called
    SoLoader.init(this, false)
    DefaultNewArchitectureEntryPoint.releaseLevel = ReleaseLevel.STABLE
    DefaultNewArchitectureEntryPoint.load()
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }`;

      const onCreatePattern = /  override fun onCreate\(\) \{[\s\S]*?\n  \}/;
      if (onCreatePattern.test(src)) {
        src = src.replace(onCreatePattern, correctOnCreate);
        console.log('[withMainApplicationFix] Rewrote onCreate() with SoLoader.init + New Arch sequence');
      } else {
        console.warn('[withMainApplicationFix] Could not match onCreate() — manual check needed');
      }

      fs.writeFileSync(mainAppPath, src, 'utf8');
      return mod;
    },
  ]);
};
