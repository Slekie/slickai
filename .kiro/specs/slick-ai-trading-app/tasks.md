# Implementation Plan: Slick AI Trading App (Phases 7–11)

## Overview

This plan covers the remaining implementation work for the Slick AI trading companion app. Phases 0–6 (foundation, stores, services, hooks, components, navigation, and all screens) are complete. The tasks below implement Phases 7–11: Google OAuth and Apple Sign-In, RevenueCat subscription paywall, WebSocket hardening (AppState lifecycle + Axios 401 interceptor), push notification registration and deep-link handling, UX polish, accessibility labels, full test coverage (Jest unit + fast-check property-based + integration), and the CI/CD pipeline (EAS builds + GitHub Actions).

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["T-101", "T-603", "T-701", "T-801"]
    },
    {
      "wave": 2,
      "tasks": ["T-201", "T-301", "T-401", "T-404", "T-501", "T-602", "T-703", "T-803"]
    },
    {
      "wave": 3,
      "tasks": ["T-202", "T-203", "T-302", "T-402", "T-405", "T-503", "T-601", "T-702", "T-705", "T-802"]
    },
    {
      "wave": 4,
      "tasks": ["T-303", "T-403", "T-502", "T-604", "T-704", "T-706"]
    },
    {
      "wave": 5,
      "tasks": ["T-304", "T-707"]
    }
  ]
}
```

## Tasks

### Phase 7 — OAuth and Apple Sign-In

- [x] 1. Wire `App.tsx` to `RootNavigator` (T-101)

  Replace the minimal stack in `App.tsx` with `GestureHandlerRootView` wrapping `RootNavigator`. Remove the old `WelcomeScreen`/`GetStartedScreen` stack. Ensure `loadStoredAuth()` and `notificationService.initialize()` run in parallel during the splash phase.

  - Edit `App.tsx`: wrap `RootNavigator` in `GestureHandlerRootView` as the sole child
  - Confirm `RootNavigator` splash delay is ≥ 1800 ms
  - Confirm `loadStoredAuth()` and `notificationService.initialize()` run concurrently (not sequentially)
  - Remove legacy `WelcomeScreen`/`GetStartedScreen` imports from `App.tsx`
  - **Requirement refs:** 1.1, 1.2, 1.3, 1.7

- [x] 2. Add OAuth methods to `authService` (T-201)

  Extend `src/services/authService.ts` with `loginWithGoogle` and `loginWithApple`. Update `ENDPOINTS` and extend `AuthUser` with the `provider` field.

  - Add `loginWithGoogle(idToken: string): Promise<LoginResponse>` — POST `ENDPOINTS.auth.google`
  - Add `loginWithApple(identityToken: string, email: string | null): Promise<LoginResponse>` — POST `ENDPOINTS.auth.apple`
  - Update `src/config/api.ts` `ENDPOINTS` to add `auth.google`, `auth.apple`, `auth.refresh`, and namespace `notifications.register`
  - Extend `AuthUser` interface in `authStore` with `provider?: 'email' | 'google' | 'apple'`
  - **Requirement refs:** 5.1–5.5, 6.1–6.7

- [x] 3. Build `GoogleSignInButton` component (T-202)

  Create `src/components/auth/GoogleSignInButton.tsx` using `expo-auth-session/providers/google`. On success, call `authService.loginWithGoogle(idToken)`, store JWT, navigate to `MainTabNavigator`.

  - Use `Google.useAuthRequest({ iosClientId, androidClientId, webClientId })`
  - On `response?.type === 'success'`, extract `id_token` and call `authService.loginWithGoogle`
  - Store returned JWT + refreshToken via `authStore.login()`; navigate to `MainTabNavigator`
  - Handle cancellation silently; show inline error banner on failure
  - Add `scheme` to `app.json` for redirect URI
  - Wire button into `LoginScreen`
  - **Requirement refs:** 5.1–5.5

- [x] 4. Build `AppleSignInButton` component (T-203)

  Create `src/components/auth/AppleSignInButton.tsx` using `expo-apple-authentication`. Render only on iOS. On success, call `authService.loginWithApple(identityToken, email)`.

  - Render `AppleAuthentication.AppleAuthenticationButton` with `buttonType=SIGN_IN`, `buttonStyle=BLACK`, `style={{ height: 44 }}`
  - Call `AppleAuthentication.signInAsync({ requestedScopes: [EMAIL, FULL_NAME] })`
  - On success, POST `credential.identityToken` to `/auth/apple`, store JWT, navigate to `MainTabNavigator`
  - Catch `ERR_CANCELED` silently; show error banner for other errors
  - Return `null` on Android
  - Wire button into `LoginScreen` below the Google button
  - **Requirement refs:** 6.1–6.7

---

### Phase 8 — Subscription Paywall (RevenueCat)

- [x] 5. Create `subscriptionService` (T-301)

  Create `src/services/subscriptionService.ts` using `react-native-purchases` (RevenueCat SDK). Implement configure, getOfferings, purchasePackage, restorePurchases, getCustomerInfo, and hasActiveEntitlement.

  - Install `react-native-purchases` and add native config (API keys for iOS and Android)
  - `configure(userId)` — `Purchases.configure({ apiKey, appUserID: userId })`
  - `getOfferings()` — `Purchases.getOfferings()`
  - `purchasePackage(pkg)` — `Purchases.purchasePackage(pkg)`, returns `CustomerInfo`
  - `restorePurchases()` — `Purchases.restorePurchases()`
  - `getCustomerInfo()` — `Purchases.getCustomerInfo()`
  - `hasActiveEntitlement(info, 'pro')` — `info.entitlements.active['pro'] !== undefined`
  - **Requirement refs:** 7.5, 7.6, 7.7, 7.12

- [x] 6. Create `subscriptionStore` (T-302)

  Create `src/store/subscriptionStore.ts` with Zustand. Fields: `isSubscribed`, `planName`, `expiresAt`, `isLoading`, `error`. Actions: `setSubscription(info)`, `clearSubscription()`, `setLoading()`, `setError()`.

  - `setSubscription(info: CustomerInfo)` — extract plan name, expiry from `info.entitlements.active['pro']`; set `isSubscribed`
  - `clearSubscription()` — reset all fields to defaults
  - Persist `isSubscribed` to AsyncStorage for fast launch-time check
  - **Requirement refs:** 7.9, 7.10, 7.11

- [x] 7. Build `PaywallScreen` (T-303)

  Create `src/screens/paywall/PaywallScreen.tsx`. Fetch RevenueCat offerings, render three plan cards (Monthly / Quarterly / Yearly), highlight Quarterly as recommended, handle purchase and restore.

  - Fetch offerings on mount; show loading skeleton while fetching
  - Compute `savingsPercent = Math.round((1 - planMonthlyEquivalent / monthlyPrice) * 100)` for each plan
  - Monthly saves 0%; Quarterly and Yearly savings always non-negative
  - Show "BEST VALUE" badge on Quarterly plan by default
  - Subscribe CTA → `purchasePackage(selectedPackage)` → success → `subscriptionStore.setSubscription(info)` → `MainTabNavigator`
  - Restore Purchase → `restorePurchases()` → same success path; no active sub → info message
  - User cancellation: stay on `PaywallScreen` with no error; store error: inline error banner
  - **Requirement refs:** 7.1–7.12

- [x] 8. Wire paywall gate into `RootNavigator` (T-304)

  After `loadStoredAuth()` succeeds and `isAuthenticated === true`, check `"pro"` entitlement. Route to `PaywallScreen` or `MainTabNavigator` accordingly.

  - Update `RootNavigator` decision tree: `isAuthenticated && hasPro → MainTabNavigator`; `isAuthenticated && !hasPro → PaywallScreen`
  - Call `subscriptionService.configure(userId)` once after authentication succeeds
  - **Requirement refs:** 7.2, 7.9, 7.10

---

### Phase 9 — WebSocket Hardening

- [x] 9. Add refresh token support to `authStore` (T-402)

  Extend `src/store/authStore.ts` to store `refreshToken` in SecureStore under `'SlickAI_refresh_token'`. Update `login()`, `register()`, `logout()`, and `loadStoredAuth()`.

  - Add `refreshToken: string | null` to `AuthState`
  - Add constant `SECURE_STORE_REFRESH_KEY = 'SlickAI_refresh_token'`
  - Update `login(user, token, refreshToken?)` and `register` success path to write `refreshToken` to SecureStore
  - Update `logout()` to delete `'SlickAI_refresh_token'` from SecureStore
  - Update `loadStoredAuth()` to restore `refreshToken`
  - **Requirement refs:** 11.9

- [x] 10. Create `apiClient` with 401 interceptor (T-401)

  Create `src/services/apiClient.ts` exporting `createAuthenticatedClient(baseURL)`. The Axios response interceptor catches 401, calls `POST /auth/refresh`, retries once, and logs out on double-401.

  - `createAuthenticatedClient(baseURL)` returns an `AxiosInstance` with 15 s timeout
  - On 401 and `!config._isRetry`: set `_isRetry = true`, read refresh token from SecureStore, call `POST /auth/refresh`, update `authStore`, retry original request
  - On refresh 401 or error: `useAuthStore.getState().logout()`, navigate to `AuthNavigator`
  - Use `_isRetry` flag to prevent infinite loops
  - **Requirement refs:** 11.9

- [x] 11. Refactor service clients to use `createAuthenticatedClient` (T-403)

  Replace individual `axios.create()` calls in `authService`, `accountService`, `signalService`, and `tradeService` with `createAuthenticatedClient(BASE_URL)`.

  - Update `src/services/authService.ts`
  - Update `src/services/accountService.ts`
  - Update `src/services/signalService.ts`
  - Update `src/services/tradeService.ts`
  - Ensure `setAuthToken(token)` sets `Authorization: Bearer {token}` header on each client
  - **Requirement refs:** 11.9

- [x] 12. Add `pauseReconnect` / `resumeReconnect` to `websocketService` (T-404)

  Extend `src/services/websocketService.ts` with a `shouldBeConnected` flag and `pauseReconnect()` / `resumeReconnect()` methods.

  - `pauseReconnect()` — set `shouldBeConnected = false`; preserve socket instance
  - `resumeReconnect()` — set `shouldBeConnected = true`; call `_connect()` if not connected
  - In `_scheduleReconnect()`, skip if `shouldBeConnected === false`
  - **Requirement refs:** 11.2, 11.3

- [x] 13. Create `useAppStateWebSocket` hook (T-405)

  Create `src/hooks/useAppStateWebSocket.ts`. On `AppState` change to `'active'`, call `resumeReconnect()`; on `'background'`/`'inactive'`, call `pauseReconnect()`.

  - Use `AppState.addEventListener('change', handler)`; remove listener on cleanup
  - Mount this hook in `AppContent` inside `RootNavigator` alongside `useWebSocket()`
  - **Requirement refs:** 11.2, 11.3

---

### Phase 10 — Push Notification Wiring

- [x] 14. Add `registerPushToken` to `notificationService` (T-501)

  Extend `src/services/notificationService.ts` with `registerPushToken(authToken)`. Calls `Notifications.getExpoPushTokenAsync({ projectId })`, then POSTs to `/notifications/register`.

  - Read `projectId` from `Constants.expoConfig.extra.eas.projectId`
  - Handle Expo Go gracefully on Android (catch and log; requires dev build for SDK 53+)
  - POST `{ token, platform: Platform.OS }` to `ENDPOINTS.notifications.register` with JWT
  - Add `addNotificationResponseListener` and `removeNotificationResponseListener` wrappers
  - **Requirement refs:** 13.1, 13.6

- [x] 15. Register push token in `useAuth` after login (T-502)

  In `src/hooks/useAuth.ts`, after any successful login (email, Google, Apple), call `notificationService.registerPushToken(jwtToken)`.

  - Add push token registration to success paths of `login()`, `register()`, `loginWithGoogle()`, and `loginWithApple()` in `useAuth`
  - Do not block navigation on failure; log errors silently
  - **Requirement refs:** 13.1

- [x] 16. Wire deep-link notification listener in `RootNavigator` (T-503)

  Register `Notifications.addNotificationResponseListener` on mount in `RootNavigator`. Route notification taps to the correct tab.

  - Create `navigationRef` with `createNavigationContainerRef<RootStackParamList>()`, pass to `NavigationContainer`
  - `data.type === 'signal'` → navigate to Signals tab
  - `data.type === 'trade_executed' || 'trade_closed'` → navigate to Trades tab
  - Remove listener on unmount
  - **Requirement refs:** 13.3, 13.4

---

### Phase 11 — UX Polish, Accessibility, Testing, CI/CD

- [x] 17. Create `NetworkBanner` component (T-601)

  Create `src/components/NetworkBanner.tsx` using `@react-native-community/netinfo`. Show a persistent bottom banner when offline; auto-dismiss and reconnect WebSocket on restore.

  - Subscribe to `NetInfo.addEventListener` on mount; unsubscribe on unmount
  - Animate banner in/out with Reanimated slide-up/slide-down
  - On restore, dismiss banner and call `websocketService.resumeReconnect()`
  - Mount inside `MainTabNavigator` wrapper
  - **Requirement refs:** 15.1, 15.2

- [x] 18. Create `ErrorBoundary` component (T-602)

  Create `src/components/ErrorBoundary.tsx` as a React class component. Show a graceful error screen with a "Restart" button on unhandled errors.

  - Implement `componentDidCatch` and `getDerivedStateFromError`
  - "Restart" button calls `Updates.reloadAsync()` from `expo-updates`
  - Wrap `MainTabNavigator` with `ErrorBoundary` in `RootNavigator`
  - **Requirement refs:** 15.3

- [x] 19. Create `formatCurrency` utility (T-603)

  Create `src/utils/formatCurrency.ts`. Format: `≥ 1M → "{n}M"`, `≥ 1K → "{n}K"`, otherwise plain string. Preserve sign.

  - `formatCurrency(value: number, currency?: string): string`
  - `abs >= 1_000_000`: divide by 1M, round to 1 decimal, append `"M"`
  - `abs >= 1_000`: divide by 1K, round to 1 decimal, append `"K"`
  - Otherwise: return `value.toString()`
  - Negative values: prefix `"-"`
  - Apply in `DashboardScreen` P&L cards and `TradeHistoryScreen` stats
  - **Requirement refs:** 15.4

- [x] 20. Add accessibility labels across all screens (T-604)

  Add `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`, and `accessibilityState` to all interactive elements across all screens.

  - `LoginScreen`, `RegisterScreen`: label all inputs and buttons
  - `DashboardScreen`: period filter tabs (`accessibilityRole="tab"`), P&L cards, refresh control
  - `SignalsScreen`: filter chips (`accessibilityRole="tab"`), signal cards, direction badges
  - `TradeHistoryScreen`: filter chips, trade cards, stat tiles
  - `AccountsScreen`: connect/disconnect buttons, broker selector, mode toggle switches (`accessibilityState={{ checked }}`)
  - `SettingsScreen`: all toggles (`accessibilityState={{ checked }}`), subscription row, sign-out button
  - `PaywallScreen`: plan cards, subscribe and restore buttons
  - Add `accessibilityHint` on all non-obvious Pressables
  - **Requirement refs:** 16.1–16.5

- [x] 21. Configure Jest test environment (T-701)

  Create `jest.config.js` with `preset: 'jest-expo'`, `moduleNameMapper` for Expo packages, and TypeScript path resolution. Install test dependencies.

  - `jest.config.js`: `preset: 'jest-expo'`, `transformIgnorePatterns`, `moduleNameMapper` for `expo-*`, `@expo/*`, `react-native-purchases`, `@react-native-community/netinfo`
  - Install: `npm install --save-dev @testing-library/react-native fast-check`
  - Add `"test": "jest --passWithNoTests --forceExit"` script to `package.json`
  - Create `__mocks__` for `expo-secure-store`, `expo-notifications`, and `react-native-purchases`
  - **Requirement refs:** Design — Testing Strategy

- [x] 22. Write `authStore` unit tests (T-702)

  Create `src/__tests__/authStore.test.ts`. Cover: successful login, failed-attempt counter, 3rd-failure lockout, `isLockedOut()` gate, and logout reset.

  - `login()` sets `isAuthenticated = true` and writes JWT to SecureStore mock
  - `incrementFailedAttempts()` increments counter, never exceeds 3 before lockout
  - 3rd failure sets `lockedUntil` to `now + 15 * 60 * 1000`
  - `isLockedOut()` returns `true` when `lockedUntil > Date.now()`
  - `logout()` clears SecureStore and resets all fields
  - **Requirement refs:** 3.7, 3.8, 3.9, 3.10

- [x] 23. Write `signalStore` and `tradeStore` unit tests (T-703)

  Create `src/__tests__/signalStore.test.ts` and `src/__tests__/tradeStore.test.ts`.

  - `signalStore`: `markExpiredSignals()` marks signals with age > 15 min as `expired`; signals within 15 min unchanged
  - `tradeStore`: `closeTrade(id, exitPrice, pnl)` removes from `openPositions`, appends to `trades`; `updatePosition(id, updates)` mutates only the matching position
  - **Requirement refs:** 10.4, 12.1

- [x] 24. Write `accountStore` and `subscriptionStore` unit tests (T-704)

  Create `src/__tests__/accountStore.test.ts` and `src/__tests__/subscriptionStore.test.ts`.

  - `accountStore`: `addAccount()`, `removeAccount()`, `setSubscriptionMode()` behave correctly
  - `subscriptionStore`: `setSubscription()` with active `CustomerInfo` sets `isSubscribed = true`; expired/absent entitlement sets `isSubscribed = false`
  - **Requirement refs:** 7.9, 7.10

- [x] 25. Write `formatCurrency` unit tests (T-705)

  Create `src/__tests__/formatCurrency.test.ts`. Cover boundary values and sign handling.

  - `formatCurrency(999)` → `"999"`
  - `formatCurrency(1000)` → `"1K"`
  - `formatCurrency(1_500_000)` → `"1.5M"`
  - `formatCurrency(-2500)` → `"-2.5K"`
  - `formatCurrency(0)` → `"0"`
  - **Requirement refs:** 15.4

- [ ] 26. Write property-based tests with `fast-check` (T-706)

  Create `src/__tests__/properties.test.ts`. Implement all 14 correctness properties using `fast-check`, each running ≥ 100 iterations, tagged with property number and text.

  - Property 1: Email validation consistency — `fc.string()`, result matches iff regex matches
  - Property 2: Password length boundary — `fc.string()`, valid iff `length >= 8`
  - Property 3: Password confirmation symmetry — `fc.tuple(fc.string(), fc.string())`, symmetric
  - Property 4: Auth session round-trip — mock SecureStore, `login()` then `loadStoredAuth()` restores same token
  - Property 5: Failed-attempt counter monotonicity — `n < 3` failures → `failedAttempts === n`
  - Property 6: Lockout gate invariant — `lockedUntil > now` → `isLockedOut() === true`; past/null → `false`
  - Property 7: Subscription access gate — active entitlement → `isSubscribed = true`; expired/absent → `false`
  - Property 8: Savings % correctness — all positive prices, savings ≥ 0 for non-monthly plans
  - Property 9: WebSocket singleton — multiple `connect()` calls yield at most one active socket
  - Property 10: WebSocket event routing completeness — emit events, assert correct store mutations
  - Property 11: Signal expiry time invariant — expired iff age > 15 min
  - Property 12: Performance summary correctness — `totalPnl` = sum of P&L; `winRate` ∈ [0, 1]
  - Property 13: Currency formatter suffix invariant — K/M/sign rules hold for all inputs
  - Property 14: Axios auth header injection — every request carries `Authorization: Bearer {token}`
  - **Requirement refs:** Design — Correctness Properties 1–14

- [ ] 27. Write integration tests (T-707)

  Create `src/__tests__/integration/` with WebSocket event routing, 401 interceptor, and push token registration tests.

  - `websocket.integration.test.ts`: mock Socket.IO, emit all four event types, assert correct store mutations
  - `authInterceptor.integration.test.ts`: mock axios 401 → refresh → retry; assert `logout()` on double-401
  - `pushToken.integration.test.ts`: mock `expo-notifications`, assert `POST /notifications/register` called with correct payload after login
  - **Requirement refs:** 11.4–11.9, 13.1

- [ ] 28. Create EAS build configuration (T-801)

  Create `eas.json` at project root with `development`, `preview`, and `production` build profiles.

  - `development`: internal, Android APK debug, `EXPO_PUBLIC_API_BASE_URL=https://dev-api.slickai.com`
  - `preview`: internal, Android APK release, `EXPO_PUBLIC_API_BASE_URL=https://staging-api.slickai.com`
  - `production`: store distribution, Android app-bundle + iOS device, `EXPO_PUBLIC_API_BASE_URL=https://api.slickai.com`
  - `cli.version >= 14.0.0`
  - **Requirement refs:** Design — CI/CD Pipeline

- [ ] 29. Create GitHub Actions workflow (T-802)

  Create `.github/workflows/android-build.yml`. Trigger on push/PR to `main`. Run tests, then EAS dev build, then post PR comment with build URL.

  - Trigger: push and PR to `main`
  - Steps: checkout, Node 20 setup (npm cache), `npm ci`, `npm test -- --passWithNoTests --forceExit`, `expo/expo-github-action@v8`, `eas build --platform android --profile development --non-interactive`
  - PR comment via `actions/github-script@v7` with EAS build URL
  - Store `EXPO_TOKEN` as GitHub Actions secret
  - **Requirement refs:** Design — CI/CD Pipeline

- [ ] 30. Add ProGuard rules for Android release builds (T-803)

  Create `android/app/proguard-rules.pro` with keep rules for React Native, Socket.IO, OkHttp, and Hermes.

  - Keep: `com.facebook.react.**`, `io.socket.**`, `okhttp3.**`, `com.facebook.hermes.**`
  - `dontwarn io.socket.**`
  - **Requirement refs:** Design — CI/CD Pipeline

## Notes

- **Expo version:** The project uses Expo ~54. Always check [https://docs.expo.dev/versions/v54.0.0/](https://docs.expo.dev/versions/v54.0.0/) before writing any Expo-related code.
- **`expo-in-app-purchases` is deprecated** — use `react-native-purchases` (RevenueCat) for all in-app purchase and subscription handling as designed.
- **Push tokens on Android require a dev build** from SDK 53+. `getExpoPushTokenAsync` is not available in Expo Go on Android; handle this gracefully.
- **RevenueCat entitlement key** is `"pro"` — maps to Monthly, Quarterly, and Yearly product IDs.
- **WebSocket singleton:** `websocketService` must never create more than one active Socket instance. `pauseReconnect()` preserves the socket instance without disconnecting.
- **`_isRetry` flag** on Axios request config prevents infinite retry loops in the 401 interceptor.
- Tasks within each phase can be executed in parallel where no dependency exists. Tasks across phases must respect the dependency graph above.
