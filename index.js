import { registerRootComponent } from 'expo';
import App from './App';

// Global error handler - catches JS errors before React tree mounts.
// On a physical device these would otherwise cause a silent crash with no
// visible error screen. The handler logs the error so it's visible in
// Metro/logcat, then calls the original handler for proper dev overlays.
const originalHandler = global.ErrorUtils && global.ErrorUtils.getGlobalHandler
  ? global.ErrorUtils.getGlobalHandler()
  : null;

if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler(function (error, isFatal) {
    if (__DEV__) {
      console.error(
        '[GlobalError] ' + (isFatal ? 'FATAL' : 'non-fatal') + ': ' +
        (error && error.message ? error.message : String(error))
      );
    }
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
