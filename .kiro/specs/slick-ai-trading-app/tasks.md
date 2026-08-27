# Implementation Plan: Slick AI Trading App

## Overview

This plan covers the full implementation of the Slick AI trading app. Phases 0-12 are
complete. Phases 13-15 cover deferred OAuth, production hardening, and store submission.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["T-101","T-603","T-701","T-801"] },
    { "wave": 2, "tasks": ["T-201","T-301","T-401","T-404","T-501","T-602","T-703","T-803"] },
    { "wave": 3, "tasks": ["T-202","T-203","T-302","T-402","T-405","T-503","T-601","T-702","T-705","T-802"] },
    { "wave": 4, "tasks": ["T-303","T-403","T-502","T-604","T-704","T-706"] },
    { "wave": 5, "tasks": ["T-304","T-707"] },
    { "wave": 6, "tasks": ["T-1201","T-1202","T-1203","T-1204","T-1205","T-1206","T-1207"] },
    { "wave": 7, "tasks": ["T-1301","T-1302","T-1303","T-1304"] },
    { "wave": 8, "tasks": ["T-1401","T-1402","T-1403","T-1404","T-1405"] },
    { "wave": 9, "tasks": ["T-1501","T-1502","T-1503","T-1504","T-1505"] }
  ]
}
```

## Tasks

### Phase 7 — OAuth and Apple Sign-In

- [x] 1. Wire `App.tsx` to `RootNavigator` (T-101)
- [x] 2. Add OAuth methods to `authService` (T-201)
- [x] 3. Build `GoogleSignInButton` component (T-202)
- [x] 4. Build `AppleSignInButton` component (T-203)

### Phase 8 — Subscription Paywall (RevenueCat)

- [x] 5. Create `subscriptionService` (T-301)
- [x] 6. Create `subscriptionStore` (T-302)
- [x] 7. Build `PaywallScreen` (T-303)
- [x] 8. Wire paywall gate into `RootNavigator` (T-304)

### Phase 9 — WebSocket Hardening

- [x] 9. Add refresh token support to `authStore` (T-402)
- [x] 10. Create `apiClient` with 401 interceptor (T-401)
- [x] 11. Refactor service clients to use `createAuthenticatedClient` (T-403)
- [x] 12. Add `pauseReconnect`/`resumeReconnect` to `websocketService` (T-404)
- [x] 13. Create `useAppStateWebSocket` hook (T-405)

### Phase 10 — Push Notification Wiring

- [x] 14. Add `registerPushToken` to `notificationService` (T-501)
- [x] 15. Register push token in `useAuth` after login (T-502)
- [x] 16. Wire deep-link notification listener in `RootNavigator` (T-503)

### Phase 11 — UX Polish, Accessibility, Testing, CI/CD

- [x] 17. Create `NetworkBanner` component (T-601)
- [x] 18. Create `ErrorBoundary` component (T-602)
- [x] 19. Create `formatCurrency` utility (T-603)
- [x] 20. Add accessibility labels across all screens (T-604)
- [x] 21. Configure Jest test environment (T-701)
- [x] 22. Write `authStore` unit tests (T-702)
- [x] 23. Write `signalStore` and `tradeStore` unit tests (T-703)
- [x] 24. Write `accountStore` and `subscriptionStore` unit tests (T-704)
- [x] 25. Write `formatCurrency` unit tests (T-705)
- [x] 26. Write property-based tests with `fast-check` (T-706)
- [x] 27. Write integration tests (T-707)
- [x] 28. Create EAS build configuration (T-801)
- [x] 29. Create GitHub Actions workflow (T-802)
- [x] 30. Add ProGuard rules for Android release builds (T-803)

---

### Phase 12 — Foundation Hardening (completed)

- [x] 31. Create `WelcomeScreen` with animated "Get Started" CTA (T-1201)

  Created `src/screens/auth/WelcomeScreen.tsx`. Displays Slick AI logo, app name,
  tagline, three feature bullets, and a "Get Started" button. All elements animate
  in with staggered Reanimated fade + slide-up (0ms, 120ms, 220ms, 320ms, 380ms,
  440ms, 560ms delays). Legal disclaimer rendered below CTA. Safe-area insets
  applied via `useSafeAreaInsets`.

- [x] 32. Wire WelcomeScreen into AuthNavigator as initial route (T-1202)

  Updated `src/navigation/AuthNavigator.tsx`. Stack is now Welcome → Login →
  Register with `initialRouteName="Welcome"` and `animation="slide_from_right"`.

- [x] 33. Harden LoginScreen (T-1203)

  Removed Google/Apple buttons (deferred to T-1302/T-1303). Added inline email
  validation on blur (red border + message below field). Biometric button retained.
  Safe-area insets applied. `accessibilityHint` on email field.

- [x] 34. Add back button to RegisterScreen (T-1204)

  Added arrow-back Pressable at top-left calling `navigation.goBack()`. Disabled
  while API call is in progress. Safe-area insets applied.

- [x] 35. Fix safe-area insets on all main tab screens (T-1205)

  Applied `useSafeAreaInsets` to DashboardScreen, SignalsScreen, TradeHistoryScreen,
  AccountsScreen, and SettingsScreen. Each screen header now sits below the status
  bar on notched and dynamic-island devices.

- [x] 36. Fix greeting time ranges on DashboardScreen (T-1206)

  Corrected to: Good morning 05:00-11:59, Good afternoon 12:00-17:59,
  Good evening 18:00-04:59.

- [x] 37. Harden CI/CD pipeline and fix tooling issues (T-1207)

  - Bumped GitHub Actions Node to 22 (required by @testing-library/react-native@14)
  - Added `--legacy-peer-deps` to `npm ci`
  - Removed `eas init` step (project already linked)
  - Fixed YAML `if:` expression to use single quotes around string literals
  - Regenerated `package-lock.json` with all missing packages
  - Fixed `jest.config.js` preset path for Node 24 compatibility
  - Removed BOM from package.json, app.json, eas.json, jest.config.js
  - Removed stale duplicate `src/screens/components/` and `src/screens/hooks/` folders
  - Fixed `notificationService` API name: `addNotificationResponseReceivedListener`
  - Fixed `OnboardingScreen` SharedValue type import
  - Added `equity` endpoint to `api.ts`
  - Removed `expo-auth-session` from `app.json` plugins (has no config plugin)
  - Added dev-mode paywall bypass in `RootNavigator` for Expo Go

---

### Phase 13 — Google & Apple OAuth (deferred — requires client IDs)

- [ ] 38. Configure Google OAuth client IDs (T-1301)

  Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`,
  and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env` and `eas.json`.

  - Create OAuth 2.0 credentials at console.cloud.google.com
  - Web client: add redirect URIs `https://auth.expo.io/@slickai/slickai` and `exp://localhost:8081`
  - Android client: package `com.slickai.app` + debug keystore SHA-1
  - iOS client: bundle ID `com.slickai.app`
  - Fill placeholders in `.env` and `eas.json` with real client IDs
  - **Requirement refs:** 5.1-5.5

- [ ] 39. Re-enable GoogleSignInButton in LoginScreen (T-1302)

  After T-1301 is complete, re-add `GoogleSignInButton` below the biometric button
  in `LoginScreen`. The component already handles the full OAuth PKCE flow,
  token exchange, and auth store update.

  - Import and render `GoogleSignInButton` in `LoginScreen`
  - Wire `onError` to display inline error banner
  - Test in Expo Go (Web client redirect) and in dev build (native redirect)
  - **Requirement refs:** 5.1-5.5

- [ ] 40. Re-enable AppleSignInButton in LoginScreen (T-1303)

  Re-add `AppleSignInButton` below GoogleSignInButton on iOS. The component already
  handles Sign in with Apple, graceful Expo Go fallback, and cancellation.

  - Import and render `AppleSignInButton` in `LoginScreen` (iOS only)
  - Requires a dev/production build — does not work in Expo Go
  - **Requirement refs:** 6.1-6.7

- [ ] 41. Add social sign-in CTAs to WelcomeScreen (T-1304)

  Add "Continue with Google" and "Continue with Apple" secondary buttons to
  `WelcomeScreen` below the "Get Started" CTA. These navigate to LoginScreen which
  handles the actual OAuth flow.

  - Add "Continue with Google" Pressable that calls `navigation.navigate('Login')`
  - Add "Continue with Apple" Pressable (iOS only) that calls `navigation.navigate('Login')`
  - Use same styling as LoginScreen social buttons
  - **Requirement refs:** 3.2, 5.1, 6.1

---

### Phase 14 — Production Hardening

- [ ] 42. Verify full navigation flow on device (T-1401)

  End-to-end test of all navigation transitions in Expo Go and dev build.

  - Onboarding (3 slides) → WelcomeScreen → LoginScreen → Dashboard
  - WelcomeScreen → RegisterScreen → back to WelcomeScreen
  - Login → forgot password (if added) → back
  - Sign out → WelcomeScreen
  - **Requirement refs:** 1.1-1.6, 3.1-3.7

- [ ] 43. Implement background session invalidation (T-1402)

  In `RootNavigator`, track when the app goes to the background using `AppState`.
  If the app is backgrounded for more than 15 minutes, invalidate the in-memory
  session state and navigate to the Auth flow on next foreground.

  - Record `backgroundedAt` timestamp on AppState `background`/`inactive`
  - On `active`, if `Date.now() - backgroundedAt > 15 * 60 * 1000`, call `logout()`
  - **Requirement refs:** 18.10

- [ ] 44. Add TLS certificate validation to `apiClient` (T-1403)

  Configure Axios to reject connections with invalid TLS certificates in production.

  - In production builds, verify certificate chain
  - Surface certificate error as user-readable "Secure connection failed" message
  - **Requirement refs:** 18.3

- [ ] 45. Configure push notification channels for Android (T-1404)

  Set up Android notification channels in `notificationService.initialize()` for
  foreground signal alerts and trade execution alerts.

  - Create channel `signals` with HIGH importance
  - Create channel `trades` with HIGH importance
  - Use correct channel IDs when scheduling local notifications
  - **Requirement refs:** 17.1-17.8

- [ ] 46. Expo Go dev experience verification (T-1405)

  Run `npx expo start -c` and verify the full UI is visible and functional.

  - Onboarding slides animate correctly
  - WelcomeScreen renders with all animations
  - LoginScreen accepts email/password and calls the backend
  - After login, Dashboard loads (paywall bypassed in dev mode)
  - NetworkBanner appears when offline
  - Settings Sign Out works and returns to WelcomeScreen
  - **Requirement refs:** 23.1-23.5

---

### Phase 15 — Polish & Store Submission

- [ ] 47. Replace placeholder legal URLs (T-1501)

  Update Privacy Policy and Terms of Service URLs in `SettingsScreen` from
  `https://slickai.com/privacy` and `https://slickai.com/terms` to real hosted URLs.

  - **Requirement refs:** 26.1

- [ ] 48. Configure production EAS build with RevenueCat keys (T-1502)

  Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
  to `eas.json` production profile and EAS Secrets.

  - Create RevenueCat project and products (monthly, quarterly, yearly)
  - Set entitlement identifier to `pro`
  - Add API keys to EAS Secrets via `eas secret:create`
  - **Requirement refs:** 8.1-8.11

- [ ] 49. Conduct accessibility audit (T-1503)

  Verify all screens pass accessibility requirements using TalkBack (Android) and
  VoiceOver (iOS).

  - Every Pressable, Switch, TextInput has `accessibilityLabel`
  - Filter chips have `accessibilityRole="tab"`
  - Form errors use `accessibilityHint`
  - Touch targets are at least 44x44 points
  - Colour-coded info also has text labels
  - **Requirement refs:** 21.1-21.6

- [ ] 50. App store metadata and submission (T-1504)

  Prepare and submit to Google Play Store (Android) and Apple App Store (iOS).

  - Add app store screenshots for 5 screen sizes
  - Write store listing description referencing AI trading, broker integration, signals
  - Configure content rating questionnaire
  - Trigger production EAS build and submit
  - **Requirement refs:** 22.6

- [ ] 51. Final regression test pass (T-1505)

  Run full test suite and manual smoke test on both platforms before submission.

  - `npm test` — all 60+ tests passing
  - TypeScript — 0 errors
  - Expo Go — all screens render without crash
  - Dev build — subscription, broker connect, signal delivery functional
  - **Requirement refs:** 24.1-24.8

---

## Notes

- **Expo version:** The project uses Expo ~54. Always check https://docs.expo.dev/versions/v54.0.0/ before writing any Expo-related code.
- **Google OAuth in Expo Go:** Requires Web client ID and authorized redirect URIs including `exp://localhost:8081`. The `GoogleSignInButton` component is already built — it just needs real client IDs.
- **Apple Sign-In:** Requires a dev or production build. Does not function in Expo Go. The `AppleSignInButton` component gracefully shows a placeholder in Expo Go.
- **RevenueCat in Expo Go:** `react-native-purchases` is a native module. The `subscriptionService` stubs return empty CustomerInfo in Expo Go. The paywall bypass in `RootNavigator` (`devBypassPaywall`) ensures the dashboard is accessible during development.
- **Push tokens on Android:** Require a dev build from SDK 53+. `getExpoPushTokenAsync` is skipped in Expo Go.
- **WebSocket singleton:** `websocketService` never creates more than one active Socket instance.
- **15-minute session timeout (T-1402):** Not yet implemented — track as Phase 14 item.
- **Tests:** 60/60 passing. `npm test` uses `./node_modules/jest-expo/jest-preset` directly for Node 24 compatibility.