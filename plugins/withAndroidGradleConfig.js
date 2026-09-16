/**
 * withAndroidGradleConfig.js
 *
 * Expo config plugin that:
 * 1. Pins kotlin-gradle-plugin to 2.1.20 in android/build.gradle
 * 2. Adds gradle.properties entries to fix Kotlin 2.1.x compiler worker
 *    crashes on CI (GradleCompilerRunnerWithWorkers crashing):
 *    - kotlin.daemon.jvm.options with --add-opens flags
 *    - sufficient heap for the Kotlin daemon
 *    - org.gradle.warning.mode=summary (keeps CI output readable)
 * 3. Adds R8 fix for react-native-purchases-ui R8/AGP conflict.
 *    RevenueCat docs: https://www.revenuecat.com/docs/getting-started/installation/reactnative
 *    Fixes: "Could not resolve all files for configuration devDebugRuntimeClasspath"
 *    during :app:mergeExtDexDevDebug / compileDebugKotlin tasks.
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

    // Step 3 -- R8 fix for react-native-purchases-ui (RevenueCat)
    // Injects the R8 release repo and a pinned R8 classpath into buildscript {}
    // so AGP uses a version that resolves the devDebugRuntimeClasspath conflict.
    const r8Repo = `        maven {
            url = uri("https://storage.googleapis.com/r8-releases/raw")
        }`;
    const r8Classpath = `        classpath("com.android.tools:r8:8.1.44")`;

    // Only add if not already present
    if (!gradle.includes('storage.googleapis.com/r8-releases/raw')) {
      // Insert the R8 repo into the buildscript repositories {} block
      gradle = gradle.replace(
        /(buildscript\s*\{[^}]*repositories\s*\{)/,
        (match) => match + '\n' + r8Repo
      );
    }

    if (!gradle.includes('com.android.tools:r8')) {
      // Insert the R8 classpath into the buildscript dependencies {} block
      gradle = gradle.replace(
        /(buildscript\s*\{(?:[^}]|\{[^}]*\})*?dependencies\s*\{)/,
        (match) => match + '\n' + r8Classpath
      );
    }

    mod.modResults.contents = gradle;
    return mod;
  });

  // Step 2 -- add gradle.properties entries needed for Kotlin 2.1.x on CI
  config = withGradleProperties(config, (mod) => {
    const toSet = {
      // Keep Gradle deprecation output concise while dependencies migrate.
      'org.gradle.warning.mode': 'summary',
      // Extra heap for Gradle daemon on CI (2GB)
      'org.gradle.jvmargs': '-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
      // Kotlin daemon JVM flags required by Kotlin 2.1.x with Java 17/21
      // These open internal JDK modules that the Kotlin compiler worker needs
      'kotlin.daemon.jvm.options':
        '-Xmx2g -XX:MaxMetaspaceSize=512m' +
        ' --add-opens=java.base/java.util=ALL-UNNAMED' +
        ' --add-opens=java.base/java.lang=ALL-UNNAMED',
      // Limit parallel workers on CI to avoid OOM
      'org.gradle.workers.max': '2',
      // Keep incremental compilation off on CI (clean builds only)
      'kotlin.incremental': 'false',
    };

    // On Windows local builds, point Gradle at the known Java 17 install so it
    // ignores whatever JAVA_HOME happens to be set to in the environment.
    // On CI (Linux) JAVA_HOME is set correctly by the workflow, so we skip this.
    if (process.platform === 'win32') {
      const javaHome = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot';
      const fs = require('fs');
      if (fs.existsSync(javaHome)) {
        // In .properties format backslashes must be escaped as \\
        props.push({ type: 'property', key: 'org.gradle.java.home', value: javaHome.replace(/\\/g, '\\\\') });
      }
    }

    // Remove any existing entries for the keys we are setting
    let props = mod.modResults.filter(
      (item) => !(item.type === 'property' && (
        Object.keys(toSet).includes(item.key) || item.key === 'expo.edgeToEdgeEnabled'
      ))
    );

    // Add our entries
    for (const [key, value] of Object.entries(toSet)) {
      props.push({ type: 'property', key, value });
    }

    mod.modResults = props;
    return mod;
  });

  return config;
};