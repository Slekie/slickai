/**
 * withAndroidGradleConfig.js
 *
 * Expo config plugin that:
 * 1. Pins AGP to 8.7.3 and Kotlin to 2.1.20 in android/build.gradle
 * 2. Adds R8 fix for react-native-purchases-ui conflict
 * 3. Adds gradle.properties entries for Kotlin 2.1.x CI stability
 * 4. On Windows, injects org.gradle.java.home to bypass bad JAVA_HOME
 */
const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.1.20';
const AGP_VERSION    = '8.7.3';

module.exports = function withAndroidGradleConfig(config) {

  // ── Step 1: pin AGP + Kotlin in top-level build.gradle ──────────────────
  config = withProjectBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;

    // Pin AGP — replace both versioned and unversioned forms
    gradle = gradle
      .replace(/classpath\('com\.android\.tools\.build:gradle:[^']*'\)/, `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`)
      .replace(/classpath\('com\.android\.tools\.build:gradle'\)/,       `classpath('com.android.tools.build:gradle:${AGP_VERSION}')`)
      .replace(/classpath\("com\.android\.tools\.build:gradle:[^"]*"\)/, `classpath("com.android.tools.build:gradle:${AGP_VERSION}")`)
      .replace(/classpath\("com\.android\.tools\.build:gradle"\)/,       `classpath("com.android.tools.build:gradle:${AGP_VERSION}")`);

    // Pin Kotlin
    gradle = gradle
      .replace(/classpath\('org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^']*'\)/, `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`)
      .replace(/classpath\('org\.jetbrains\.kotlin:kotlin-gradle-plugin'\)/,       `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`)
      .replace(/classpath\("org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^"]*"\)/, `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`)
      .replace(/classpath\("org\.jetbrains\.kotlin:kotlin-gradle-plugin"\)/,       `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}")`);

    // ── Step 2: R8 fix for react-native-purchases-ui ──────────────────────
    if (!gradle.includes('storage.googleapis.com/r8-releases/raw')) {
      gradle = gradle.replace(
        /(buildscript\s*\{[^}]*repositories\s*\{)/,
        (m) => m + '\n        maven {\n            url = uri("https://storage.googleapis.com/r8-releases/raw")\n        }'
      );
    }
    if (!gradle.includes('com.android.tools:r8')) {
      gradle = gradle.replace(
        /(buildscript\s*\{(?:[^}]|\{[^}]*\})*?dependencies\s*\{)/,
        (m) => m + '\n        classpath("com.android.tools:r8:8.1.44")'
      );
    }

    mod.modResults.contents = gradle;
    return mod;
  });

  // ── Step 3: gradle.properties ────────────────────────────────────────────
  config = withGradleProperties(config, (mod) => {
    const toSet = {
      'org.gradle.warning.mode':    'summary',
      'org.gradle.jvmargs':         '-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
      'kotlin.daemon.jvm.options':  '-Xmx2g -XX:MaxMetaspaceSize=512m --add-opens=java.base/java.util=ALL-UNNAMED --add-opens=java.base/java.lang=ALL-UNNAMED',
      'org.gradle.workers.max':     '2',
      'kotlin.incremental':         'false',
    };

    // Remove stale entries for keys we manage
    let props = mod.modResults.filter(
      (item) => !(item.type === 'property' && (
        Object.keys(toSet).includes(item.key) ||
        item.key === 'expo.edgeToEdgeEnabled'  ||
        item.key === 'org.gradle.java.home'
      ))
    );

    // Add our standard entries
    for (const [key, value] of Object.entries(toSet)) {
      props.push({ type: 'property', key, value });
    }

    // ── Step 4: Windows JAVA_HOME bypass ─────────────────────────────────
    // On Windows, point Gradle directly at the known Java 17 install.
    // Avoids failures when JAVA_HOME is stale (e.g. leftover Android Studio path).
    // Skipped on CI (Linux) where JAVA_HOME is set correctly by the workflow.
    if (process.platform === 'win32') {
      const fs       = require('fs');
      const javaHome = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot';
      if (fs.existsSync(javaHome)) {
        // .properties format requires backslashes escaped as \\
        props.push({
          type:  'property',
          key:   'org.gradle.java.home',
          value: javaHome.replace(/\\/g, '\\\\'),
        });
      }
    }

    mod.modResults = props;
    return mod;
  });

  return config;
};