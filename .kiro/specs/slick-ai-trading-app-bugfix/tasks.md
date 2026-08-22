# Implementation Plan: Slick AI — Bug Fixes & Code Quality

## Overview

Full audit of the Slick AI React Native / Expo project identified 21 bugs and incomplete implementations spanning critical runtime crashes, authentication token leaks, dead code, visual regressions, and incomplete UI stubs. This plan fixes every issue without breaking existing functionality, ordered by severity and dependency.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["B-01", "B-02", "B-03", "B-04", "B-05"]
    },
    {
      "wave": 2,
      "tasks": ["B-06", "B-07", "B-08", "B-09", "B-10"]
    },
    {
      "wave": 3,
      "tasks": ["B-11", "B-12", "B-13", "B-14", "B-15"]
    },
    {
      "wave": 4,
      "tasks": ["B-16", "B-17", "B-18", "B-19", "B-20", "B-21"]
    }
  ]
}
```

## Tasks

### Wave 1 — Critical: Dead Code & Broken Imports

- [x] 1. Delete duplicate `src/screens/hooks/` and `src/screens/components/` directories (B-01)

  The directories `src/screens/hooks/` and `src/screens/components/` contain stale duplicate copies of files that already exist under `src/hooks/` and `src/components/`. All imports point to paths that don't exist (`../services/`, `../store/` relative to `src/screens/hooks/`), causing 10+ TypeScript compile errors. None of these files are imported by any screen. Delete the entire `src/screens/hooks/` and `src/screens/components/` directories.

  - Delete `src/screens/hooks/useWebSocket.ts` — broken imports (4× Cannot find module)
  - Delete `src/screens/hooks/useAuth.ts` — old version, missing refreshToken and push token registration
  - Delete `src/screens/hooks/useAccountMode.ts` — dead duplicate
  - Delete `src/screens/components/AnimatedNumber.tsx` — dead duplicate
  - Delete `src/screens/components/AutomatedBanner.tsx` — dead duplicate
  - Delete `src/screens/components/EquityChart.tsx` — dead duplicate
  - Delete `src/screens/components/LiveDot.tsx` — dead duplicate
  - Delete `src/screens/components/SignalCard.tsx` — dead duplicate
  - Delete `src/screens/components/SkeletonCard.tsx` — dead duplicate
  - Delete `src/screens/components/TradeCard.tsx` — dead duplicate
  - After deletion, run `npx tsc --noEmit` to confirm zero new errors

- [x] 2. Delete orphaned legacy screens at project root (B-02)

  `screens/GetStartedScreen.tsx` and `screens/WelcomeScreen.tsx` at the project root level are not imported anywhere. They reference a `GetStarted` route that no longer exists in the navigation graph and use a background colour (`#0B1020`) that doesn't match the design system (`COLORS.bg = '#080B14'`). Deleting them removes dead code and eliminates confusion.

  - Delete `screens/GetStartedScreen.tsx`
  - Delete `screens/WelcomeScreen.tsx`
  - Verify no remaining imports reference these files

- [x] 3. Fix `GoogleSignInButton` — refreshToken not persisted (B-03)

  `src/components/auth/GoogleSignInButton.tsx` calls `authService.loginWithGoogle(idToken)` which returns `{ user, token, refreshToken }` (the full `LoginResponse`), but only destructures `user` and `token`. The `refreshToken` is silently discarded. Google-authenticated users will have no refresh token in SecureStore, so the 401→refresh interceptor in `apiClient.ts` will always fail for them (`No refresh token available`), forcing logout on every token expiry.

  - In the success handler `useEffect`, change: `const { user, token } = await authService.loginWithGoogle(idToken)`
  - To: `const { user, token, refreshToken } = await authService.loginWithGoogle(idToken)`
  - Pass `refreshToken` to `authStore.login(user, token, refreshToken)`
  - Also fix the missing `onSuccess` and `onError` in the `useEffect` dependency array (stale closure risk)

- [x] 4. Fix `AppleSignInButton` — refreshToken not persisted (B-04)

  `src/components/auth/AppleSignInButton.tsx` has the same bug: `authService.loginWithApple()` returns `refreshToken` but it is never stored. Apple-authenticated users will be force-logged-out on any 401 response.

  - Change: `const { user, token } = await authService.loginWithApple(...)`
  - To: `const { user, token, refreshToken } = await authService.loginWithApple(...)`
  - Pass `refreshToken` to `authStore.login(user, token, refreshToken)`

- [x] 5. Fix `package.json` — misplaced and phantom dependencies (B-05)

  Three issues in `package.json`:
  1. `"module": "^2.0.0"` is a phantom dependency — the npm package named `module` is unrelated to Node.js's built-in `module`. It should be removed.
  2. `expo-notifications` is used in `notificationService.ts` via dynamic `require()` but is not listed in `dependencies`. Managed workflow Expo projects need it declared even for dynamic imports.
  3. `react-native-purchases` is used in `subscriptionService.ts` via dynamic `require()` but is not listed. Without it, the stub always returns "no subscription" even in production builds that have the native module linked.

  - Remove `"module": "^2.0.0"` from dependencies
  - Add `"expo-notifications"` to dependencies (use `npx expo install expo-notifications` to get the SDK-compatible version)
  - Add `"react-native-purchases"` to dependencies (use `npx expo install react-native-purchases` — note: requires dev build, not Expo Go)

---

### Wave 2 — High: Runtime Bugs & Visual Issues

- [x] 6. Fix `RootNavigator` — blank flash during subscription check (B-06)

  `src/navigation/RootNavigator.tsx` `AppContent` component returns `null` while `checkingSubscription` is true. On slow devices or first launch this is a network call that can take seconds, showing a completely blank screen. The `SplashScreen` component is already defined in the same file and should be reused.

  - Change `if (checkingSubscription) return null;`
  - To `if (checkingSubscription) return <SplashScreen />;`
  - Ensure `SplashScreen` is accessible from `AppContent` (it's defined in the same file — no import needed)

- [x] 7. Fix `RegisterScreen` — shaking/jumping layout on keyboard open (B-07)

  `src/screens/auth/RegisterScreen.tsx` uses `translateY` animation on a `View` inside `KeyboardAvoidingView` without a `ScrollView`. When the keyboard opens, `KeyboardAvoidingView` adjusts the available height, causing `justifyContent: 'center'` to reflow, which runs the Reanimated `translateY` animation and makes the page shake.

  - Replace `KeyboardAvoidingView > View` with `KeyboardAvoidingView > ScrollView` (same fix applied to `LoginScreen`)
  - Change `formAnimStyle` to fade-only (remove `translateY` transform — it's the source of the shake)
  - Remove unused `formSlide` shared value and `withSpring` from formSlide call
  - Add `minHeight: 52`, `height: 52`, `paddingVertical: 0`, `textAlignVertical: 'center'` to inputs (consistent with LoginScreen fix)
  - Add `paddingRight: 2` to `inputIcon` style
  - Add `returnKeyType` and `ref`-based focus chaining between email → password → confirm fields

- [x] 8. Fix `DashboardScreen` — `wsConnected` hardcoded `true` (B-08)

  `src/screens/dashboard/DashboardScreen.tsx` has `const [wsConnected] = useState(true)` which makes the "LIVE" indicator always show as green even when the WebSocket is actually disconnected.

  - Import `useWebSocket` from `../../hooks/useWebSocket`
  - Replace `const [wsConnected] = useState(true)` with `const { isConnected: wsConnected } = useWebSocket()`
  - The LIVE pill in the header is now reactive to the actual connection state

- [x] 9. Fix `websocketService` — old socket orphaned on reconnect (B-09)

  `src/services/websocketService.ts` `_connect()` method: when called during reconnect, `this.socket` is reassigned without first cleaning up the previous socket's listeners and connection. The old socket remains in memory with its event listeners firing duplicate events.

  - At the start of `_connect()`, before `this.socket = io(...)`, add:
    ```ts
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    ```
  - This prevents duplicate event firing and memory leaks during reconnect cycles

- [x] 10. Fix `notificationService.getPushToken` — missing `projectId` (B-10)

  `src/services/notificationService.ts` `getPushToken()` method calls `Notifications.getExpoPushTokenAsync()` without passing `{ projectId }`. In Expo SDK 53+, this throws `"Must provide a projectId"` in any production or dev build. The `registerPushToken` method already handles this correctly — `getPushToken` needs the same fix.

  - Import `Constants from 'expo-constants'` (already imported in the file)
  - In `getPushToken()`, change `Notifications.getExpoPushTokenAsync()` to:
    ```ts
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    ```

---

### Wave 3 — Medium: Logic Bugs & Incomplete Features

- [x] 11. Fix `accountService.listDerivAccounts` — bypasses named endpoint (B-11)

  `src/services/accountService.ts` `listDerivAccounts` constructs the URL by string-concatenating `ENDPOINTS.accounts.list` with `/deriv/list-accounts`. The named constant `ENDPOINTS.accounts.derivListAccounts` already exists and equals `'/accounts/deriv/list-accounts'` — it should be used directly to avoid silent breakage if `ENDPOINTS.accounts.list` is ever renamed.

  - Change `\`${ENDPOINTS.accounts.list}/deriv/list-accounts\`` to `ENDPOINTS.accounts.derivListAccounts`

- [x] 12. Fix `apiClient` — new refreshToken not rotated after 401 refresh (B-12)

  `src/services/apiClient.ts` 401 interceptor: after a successful token refresh, the new JWT is stored and the request is retried, but if the backend issues a rotating refresh token alongside the new access token, it is discarded. The store retains the old refresh token indefinitely.

  - In the refresh success path, check if `refreshResponse.data.refreshToken` exists
  - If it does, store it in SecureStore under `'SlickAI_refresh_token'` and update `authStore.refreshToken`
  - This is a defensive fix for backends that rotate refresh tokens

- [x] 13. Fix `AnimatedNumber` — sign flicker at zero (B-13)

  `src/components/AnimatedNumber.tsx`: the sign prefix (`+` or `''`) is evaluated against the live interpolated `displayed` value, not the final target `value`. During animation, floating-point interpolation briefly passes through negative-epsilon values before settling at zero, causing a momentary `-0.00` flash.

  - Change `const sign = displayed > 0 ? '+' : '';`
  - To `const sign = value > 0 ? '+' : '';`
  - The sign should reflect the final destination, not the in-flight interpolated value

- [x] 14. Fix `NetworkBanner` — shared value `.value` read in render (B-14)

  `src/components/NetworkBanner.tsx` line ~61: `if (!isOffline && opacity.value === 0) return null;` reads a Reanimated shared value on the JS thread during render. On the New Architecture (Fabric/JSI), shared value reads from the JS thread can be stale or cause consistency issues. Use a separate JS-thread state boolean instead.

  - Add `const [isVisible, setIsVisible] = useState(false)` to track render visibility
  - In the `isOffline` effect, set `setIsVisible(true)` when going offline, and set `setIsVisible(false)` after the hide animation completes (use a `setTimeout` matching the 300ms animation duration)
  - Replace `if (!isOffline && opacity.value === 0) return null;` with `if (!isVisible) return null;`

- [x] 15. Fix `jest.config.js` — wrong `testEnvironment` breaks component tests (B-15)

  `jest.config.js` explicitly sets `testEnvironment: 'node'`. React Native component tests rendered via `@testing-library/react-native` require the React Native test environment provided by `jest-expo` preset. The explicit `node` override removes that environment and will break any test that renders a component tree.

  - Remove the `testEnvironment: 'node'` line from `jest.config.js`
  - The `jest-expo` preset already provides the correct test environment

---

### Wave 4 — Medium/Low: Incomplete UI & Stubs

- [x] 16. Fix `SettingsScreen` — Privacy Policy and Terms of Service links are stubs (B-16)

  `src/screens/settings/SettingsScreen.tsx`: the Privacy Policy and Terms of Service `onPress` handlers are empty `() => {}` stubs. Tapping them does nothing.

  - Import `Linking` from `react-native`
  - Privacy Policy: `onPress={() => void Linking.openURL('https://slickai.com/privacy')}`
  - Terms of Service: `onPress={() => void Linking.openURL('https://slickai.com/terms')}`
  - These URLs are placeholder — replace with real URLs when available

- [x] 17. Fix `SettingsScreen` — notification and haptic toggles are no-ops (B-17)

  `src/screens/settings/SettingsScreen.tsx`: the Push Notifications and Haptic Feedback toggles set local state but have no side effects — no actual permission changes, no haptic feedback triggers, no persistence.

  - Notifications toggle: on disable, call `notificationService` to suppress future local notifications (set a flag in `AsyncStorage` under `slickai_notifications_enabled`); on enable, re-request permissions if needed via `notificationService.requestPermissions()`
  - Haptic toggle: persist the enabled state to `AsyncStorage` under `slickai_haptics_enabled`; read this value on mount; export a helper `triggerHaptic()` that checks the stored preference before calling `expo-haptics`
  - Add `expo-haptics` import (already in `dependencies` via Expo SDK)

- [x] 18. Fix `DashboardScreen` — equity data never fetched (B-18)

  `src/screens/dashboard/DashboardScreen.tsx`: `const [equityData] = useState<...>([])` is never populated. No API call is made. The EquityChart always shows the "No equity data yet" empty state even when the user has trade history.

  - Add a fetch for equity data on mount and on period change
  - Call a new `tradeService.getEquityCurve(period)` endpoint: `GET /trades/equity?period=7D`
  - Add `getEquityCurve` method to `tradeService.ts` returning `{ timestamp: string; equity: number }[]`
  - Add `ENDPOINTS.performance.equity = '/trades/equity'` to `src/config/api.ts`
  - Update `equityData` state with the response; show skeleton while loading

- [x] 19. Fix `SignalCard` — `as unknown as number` Fabric crash risk (B-19)

  `src/components/SignalCard.tsx`: the confidence bar animated style uses `width: \`${confWidth.value}%\` as unknown as number` — a double-cast that suppresses TypeScript but passes a string to a field expecting a number on the UI thread. On the New Architecture this can cause a runtime crash in Reanimated worklets.

  - Use `widthPercent` as a 0–100 number and derive the rendered width using `flex` or a View with `onLayout` to get the container width
  - Simpler approach: wrap the confidence bar in a `View` with `overflow: 'hidden'` and fixed height; use `width: \`${confWidth.value}%\`` directly on an inner `View` (not in Reanimated's `useAnimatedStyle`) — let React Native handle the string percentage in a non-animated style updated via `setState`

- [x] 20. Fix `SkeletonCard` — TypeScript width cast suppresses real error (B-20)

  `src/components/SkeletonCard.tsx`: `{ width: width as number }` casts a `string | number` to `number` to silence TypeScript. The `'100%'` string value is passed to Reanimated's animated style which expects a number on the UI thread.

  - Change the `SkeletonLine` component to accept `width: number | \`${number}%\`` typed as `ViewStyle['width']`
  - Remove the `as number` cast; pass `width` directly as a style prop (not via Reanimated's animated style — skeleton uses regular React Native `View`, not `Animated.View`)
  - Verify `Animated.View` in `SkeletonLine` only has `opacity` in its animated style; `width` and `height` should be in the regular `style` prop

- [x] 21. Clean up `AuthStore` `logout` — ensure `subscriptionStore` is also reset (B-21)

  `src/store/authStore.ts` `logout()` clears auth state but does not reset `subscriptionStore`. If a user logs out and a different user logs in on the same device, the previous user's subscription state persists until the new user's subscription check completes, potentially granting premature access to `MainTabNavigator`.

  - In `src/hooks/useAuth.ts` `logout()` function, add `useSubscriptionStore.getState().clearSubscription()` after `websocketService.disconnect()` and before `store.logout()`
  - Also reset `accountStore`, `signalStore`, and `tradeStore` to their initial states on logout to prevent data leakage between sessions

## Notes

- All fixes must be verified with `npx tsc --noEmit` after completion — zero new TypeScript errors allowed
- The app runs in Expo Go for development — do NOT install packages requiring native builds (`react-native-purchases`, `expo-apple-authentication`) without wrapping them in the existing dynamic `require()` pattern
- Wave 1 tasks (B-01 through B-05) are blockers — the TypeScript compiler cannot pass CI until the broken `src/screens/hooks/` imports are removed
- B-18 (equity data fetch) requires a backend endpoint — implement the frontend fetch with graceful fallback to empty state if the endpoint returns 404
