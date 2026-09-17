/**
 * withArmOnly.js
 *
 * Restricts the Android build to arm64-v8a only.
 *
 * Why this matters for New Architecture:
 *   With newArchEnabled=true, Gradle runs CMake to compile native C++ code
 *   (appmodules.so) for every target ABI. The default is 4 ABIs:
 *     armeabi-v7a, arm64-v8a, x86, x86_64
 *
 *   On EAS Build's medium worker (4 vCPUs, 16 GB RAM), compiling for all 4
 *   ABIs can trigger OOM or timeout during the CMake step, causing it to
 *   produce an incomplete APK without the New Arch .so files — resulting in:
 *     SoLoaderDSONotFoundError: couldn't find DSO: libreact_featureflagsjni.so
 *
 *   All modern Android phones (2016+) are arm64-v8a. The x86/x86_64 ABIs
 *   are only needed for emulators. armeabi-v7a is for phones older than 2014.
 *
 *   Building arm64-v8a only:
 *   - Reduces CMake compile time by ~75%
 *   - Eliminates OOM risk on EAS medium workers
 *   - Produces a smaller APK
 *   - Works on 100% of real Android devices from the last 10 years
 *
 * For production/store builds, you can expand this to arm64-v8a,armeabi-v7a
 * to support very old devices, or use Google Play's ABI splits.
 */
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withArmOnly(config) {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    // Remove existing reactNativeArchitectures entry if present
    const idx = props.findIndex(
      (p) => p.type === 'property' && p.key === 'reactNativeArchitectures'
    );
    if (idx !== -1) {
      props.splice(idx, 1);
    }

    // Set to arm64-v8a only
    props.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a',
    });

    console.log('[withArmOnly] Set reactNativeArchitectures=arm64-v8a (faster New Arch CMake build)');
    return mod;
  });
};
