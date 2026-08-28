/**
 * withAndroidGradleConfig.js
 *
 * Expo config plugin that patches the top-level android/build.gradle to:
 * 1. Pin Kotlin Gradle plugin to 2.1.20 (required by react-native 0.81).
 *    Without a pinned version, Gradle resolves a mismatched version that
 *    causes: Execution failed for task ':app:compileDebugKotlin'
 * 2. Set org.gradle.warning.mode=summary in gradle.properties so
 *    deprecation warnings are logged but do not cause a hard build failure.
 */
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.1.20';

module.exports = function withAndroidGradleConfig(config) {
  // Step 1 -- pin Kotlin version in top-level build.gradle
  config = withProjectBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    if (gradle.includes("classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')")) {
      gradle = gradle.replace(
        "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
        `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`
      );
    }
    if (gradle.includes('classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")')) {
      gradle = gradle.replace(
        'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
        `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`
      );
    }

    mod.modResults.contents = gradle;
    return mod;
  });

  // Step 2 -- set warning mode so deprecation warnings don't fail the build
  config = withGradleProperties(config, (mod) => {
    const filtered = mod.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'org.gradle.warning.mode')
    );
    filtered.push({ type: 'property', key: 'org.gradle.warning.mode', value: 'summary' });
    mod.modResults = filtered;
    return mod;
  });

  return config;
};
