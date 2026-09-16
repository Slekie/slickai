/**
 * withAndroidLaunchMode.js
 *
 * Expo config plugin that sets the main Activity launchMode to "singleTop".
 *
 * Why this is needed:
 *   RevenueCat (and Google Play Billing) requires the Activity that triggers
 *   a purchase to have launchMode="standard" or "singleTop". The default
 *   React Native template uses "singleTask", which causes Google Play to
 *   cancel in-progress purchases when the user is redirected to their
 *   banking app to verify a payment and then returns.
 *
 * Reference:
 *   https://www.revenuecat.com/docs/getting-started/installation/reactnative
 *   "Set your Activity launchMode" section
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidLaunchMode(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const application = manifest.manifest.application?.[0];

    if (!application) {
      console.warn('[withAndroidLaunchMode] No <application> found in AndroidManifest.xml');
      return mod;
    }

    const activities = application.activity ?? [];
    const mainActivity = activities.find((a) => {
      const intentFilters = a['intent-filter'] ?? [];
      return intentFilters.some((filter) => {
        const actions = filter.action ?? [];
        const categories = filter.category ?? [];
        const hasMain = actions.some((act) => act.$?.['android:name'] === 'android.intent.action.MAIN');
        const hasLauncher = categories.some((cat) => cat.$?.['android:name'] === 'android.intent.category.LAUNCHER');
        return hasMain && hasLauncher;
      });
    });

    if (!mainActivity) {
      console.warn('[withAndroidLaunchMode] Could not find main LAUNCHER activity in AndroidManifest.xml');
      return mod;
    }

    if (!mainActivity.$) mainActivity.$ = {};
    const current = mainActivity.$['android:launchMode'];

    if (current === 'singleTop') {
      console.log('[withAndroidLaunchMode] launchMode already set to singleTop — no change needed');
      return mod;
    }

    mainActivity.$['android:launchMode'] = 'singleTop';
    console.log(`[withAndroidLaunchMode] Set launchMode from "${current ?? 'unset'}" to "singleTop"`);

    return mod;
  });
};