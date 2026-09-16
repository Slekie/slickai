/**
 * withGradleWrapper.js
 *
 * Pins the Gradle wrapper to a version compatible with AGP 8.7.3.
 * AGP 8.7.x requires Gradle 8.9 or later (but below 9.x).
 *
 * This prevents expo prebuild from generating a wrapper that pulls
 * a too-new or unavailable Gradle distribution.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const GRADLE_VERSION = '8.9';

module.exports = function withGradleWrapper(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const propsPath = path.join(
        mod.modRequest.platformProjectRoot,
        'gradle', 'wrapper', 'gradle-wrapper.properties'
      );

      if (!fs.existsSync(propsPath)) {
        console.warn('[withGradleWrapper] gradle-wrapper.properties not found');
        return mod;
      }

      let content = fs.readFileSync(propsPath, 'utf8');
      const updated = content.replace(
        /distributionUrl=.*gradle-[0-9.]+-bin\.zip/,
        `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`
      );

      if (updated !== content) {
        fs.writeFileSync(propsPath, updated, 'utf8');
        console.log(`[withGradleWrapper] Pinned Gradle wrapper to ${GRADLE_VERSION}`);
      } else {
        console.log('[withGradleWrapper] Gradle wrapper already at correct version');
      }

      return mod;
    },
  ]);
};