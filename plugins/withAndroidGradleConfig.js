/**
 * withAndroidGradleConfig.js
 *
 * Expo config plugin that:
 * 1. Pins kotlin-gradle-plugin to 2.1.20 in android/build.gradle
 * 2. Adds gradle.properties entries to fix Kotlin 2.1.x compiler worker
 *    crashes on CI (GradleCompilerRunnerWithWorkers crashing):
 *    - kotlin.daemon.jvm.options with --add-opens flags
 *    - sufficient heap for the Kotlin daemon
 *    - org.gradle.warning.mode=summary (deprecation warnings don't fail build)
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

  // Step 2 -- add gradle.properties entries needed for Kotlin 2.1.x on CI
  config = withGradleProperties(config, (mod) => {
    const toSet = {
      // Suppress deprecation warnings as hard failures
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

    // Remove any existing entries for the keys we are setting
    let props = mod.modResults.filter(
      (item) => !(item.type === 'property' && Object.keys(toSet).includes(item.key))
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
