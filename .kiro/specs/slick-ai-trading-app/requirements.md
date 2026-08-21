# Requirements Document

## Introduction

Slick AI is an AI-powered trading companion mobile application targeting retail forex traders on Android and iOS. The app connects to live broker accounts (Deriv, MetaTrader 5, Oanda), receives real-time AI-generated trading signals from a backend deep-learning service, and can execute trades autonomously on the user's behalf. Users must subscribe to a paid plan before live trading features are unlocked. The app is built with Expo ~54, React Native, and TypeScript.

**Build Status:** Phases 0–6 are complete (foundation, stores, services, hooks, components, navigation, and all screens). The requirements below cover both what exists and what must still be built, with clear markers. The remaining work spans Phases 7–11: OAuth/Apple sign-in, subscription paywall, WebSocket hardening, push notification wiring, UX polish, test coverage, and CI/CD pipeline.

---

## Glossary

- **App**: The Slick AI React Native / Expo mobile application.
- **Backend**: The remote server that generates AI trading signals and executes trades via broker APIs.
- **Broker**: A supported live trading platform — Deriv, MetaTrader 5 (MT5), or Oanda.
- **Connected_Account**: A broker trading account that a user has linked to the App.
- **Signal**: An AI-generated trade recommendation (asset, direction, entry price, SL, TP, confidence).
- **Open_Position**: A live trade currently running on a Connected_Account.
- **Closed_Trade**: A completed trade with a recorded outcome (P&L, close reason).
- **Performance_Summary**: Aggregated statistics for a chosen period — total P&L, win rate, trade count, open position count.
- **Equity_Curve**: A time-series dataset of account equity snapshots used to render a line chart.
- **Subscription_Plan**: A recurring billing plan (Monthly, Quarterly, Yearly) required before live trading.
- **Paywall**: The screen that blocks access to live trading features until a valid Subscription_Plan is active.
- **Signal_Delivery_Mode**: An account mode where the AI sends signals but the user executes trades manually.
- **Automated_Trading_Mode**: An account mode where the AI executes trades autonomously on the user's account.
- **RootNavigator**: The top-level React Navigation component that orchestrates splash → onboarding → auth → app flow.
- **AuthNavigator**: The stack navigator containing LoginScreen and RegisterScreen.
- **MainTabNavigator**: The bottom-tab navigator with five tabs: Dashboard, Signals, History, Accounts, Settings.
- **WebSocket**: The persistent Socket.IO connection between the App and Backend for real-time data.
- **JWT**: JSON Web Token used for authenticated API requests; stored in SecureStore.
- **SecureStore**: `expo-secure-store` encrypted on-device key-value storage.
- **PAT**: Personal Access Token used to authenticate a Deriv broker account.
- **EAS**: Expo Application Services — the build and deployment platform for the App.
- **OTA**: Over-the-air update delivered via Expo Updates without a new store submission.
- **CI/CD**: Continuous integration and continuous delivery pipeline running on GitHub Actions.
- **Lockout**: A temporary login block after 3 consecutive failed authentication attempts (15-minute duration).
- **Circuit_Breaker**: An account status indicating the Backend has paused automated trading due to risk limits.

---

## Requirements

### Requirement 1: App Entry Point and Navigation Wiring

**User Story:** As a developer, I want the App entry point wired to the full navigation graph, so that users reach onboarding, authentication, and the trading dashboard through a single consistent flow.

> **Current State:** `App.tsx` contains a minimal stack navigating only between `WelcomeScreen` and `GetStartedScreen`. `RootNavigator` (splash → onboarding → auth/app) is fully implemented in `src/navigation/RootNavigator.tsx` but is not yet used by `App.tsx`.

#### Acceptance Criteria

1. THE App SHALL render `GestureHandlerRootView` as the outermost component wrapping the entire navigation tree.
2. THE App SHALL mount `RootNavigator` as its sole child inside `GestureHandlerRootView`.
3. WHEN the App first launches, THE RootNavigator SHALL display an animated splash screen for a minimum of 1800 milliseconds before transitioning to the next route.
4. WHEN a user has never completed onboarding, THE RootNavigator SHALL navigate to `OnboardingScreen` after the splash screen.
5. WHEN a user has completed onboarding and holds a valid stored JWT, THE RootNavigator SHALL navigate directly to `MainTabNavigator` after the splash screen.
6. WHEN a user has completed onboarding and holds no valid stored JWT, THE RootNavigator SHALL navigate to `AuthNavigator` after the splash screen.
7. THE RootNavigator SHALL call `loadStoredAuth()` and `notificationService.initialize()` in parallel during the splash phase so that neither delay is stacked.

---

### Requirement 2: Welcome Screen and Onboarding

**User Story:** As a first-time user, I want a beautiful animated welcome experience followed by swipeable onboarding slides, so that I understand the app's value before creating an account.

> **Current State:** `WelcomeScreen` and `GetStartedScreen` exist in `/screens` (not yet wired to RootNavigator). `OnboardingScreen` with three slides is complete in `src/screens/onboarding/OnboardingScreen.tsx`.

#### Acceptance Criteria

1. THE App SHALL display a full-screen welcome view with the Slick AI logo, a tagline, and animated entrance transitions powered by Reanimated 3 before the user reaches the onboarding slides.
2. WHEN a user taps "Get Started" on the welcome view, THE App SHALL navigate to the first onboarding slide.
3. THE OnboardingScreen SHALL present exactly three swipeable slides with the titles "AI-Powered Trading", "Connect Your Broker", and "Choose Your Mode".
4. WHEN a user swipes or taps "Next", THE OnboardingScreen SHALL animate a parallax opacity and vertical translate transition between slides using a `scrollX` SharedValue.
5. THE OnboardingScreen SHALL display a dot pagination indicator where the active dot expands from 8 px to 24 px width.
6. WHEN a user is not on the last slide, THE OnboardingScreen SHALL display a "Skip" button that completes onboarding immediately.
7. WHEN a user reaches the last slide, THE OnboardingScreen SHALL display a "Get Started" button instead of "Next".
8. WHEN onboarding completes (via Skip or Get Started), THE App SHALL persist a completion flag to SecureStore under the key `slickai_onboarding_done`.
9. WHEN `slickai_onboarding_done` is set to `"true"`, THE OnboardingScreen SHALL never be shown again on subsequent launches.

---

### Requirement 3: Email and Password Authentication

**User Story:** As a user, I want to register and log in with an email address and password, so that I can securely access my trading account.

> **Current State:** `LoginScreen` and `RegisterScreen` are fully implemented with email/password forms, Reanimated entrance animations, input focus rings, biometric support, and lockout logic. The `authStore`, `authService`, and `useAuth` hook are complete.

#### Acceptance Criteria

1. WHEN a user submits the registration form, THE App SHALL validate that the email field matches the pattern `[^\s@]+@[^\s@]+\.[^\s@]+` before sending to the Backend.
2. WHEN a user submits the registration form, THE App SHALL validate that the password is at least 8 characters long.
3. WHEN a user submits the registration form, THE App SHALL validate that the password and confirm-password fields match.
4. IF the registration form contains invalid input, THEN THE App SHALL display an inline error message identifying the specific field that failed validation.
5. WHEN registration succeeds, THE App SHALL store the returned JWT and refresh token in SecureStore and navigate to `MainTabNavigator`.
6. WHEN a user submits the login form with valid credentials, THE App SHALL store the returned JWT in SecureStore and navigate to `MainTabNavigator`.
7. WHEN a login attempt fails, THE App SHALL increment a failed-attempt counter and display the current count to the user after the first failure.
8. WHEN a user accumulates 3 consecutive failed login attempts, THE App SHALL activate a Lockout for 15 minutes and display a lockout screen with the remaining wait time.
9. WHILE a Lockout is active, THE App SHALL prevent any further login attempts and display a countdown message.
10. WHEN the App starts, THE App SHALL call `loadStoredAuth()` to restore a previously stored JWT session without requiring the user to log in again.
11. THE LoginScreen SHALL display an animated entrance: logo scales from 0.6× to 1× over 600 ms; the form fades in and slides up after a 400 ms delay.

---

### Requirement 4: Biometric Authentication

**User Story:** As a returning user, I want to sign in using Face ID or fingerprint, so that I can access the app quickly without typing my password.

> **Current State:** Biometric support is implemented in `authService.ts` via `expo-local-authentication` and is surfaced in `LoginScreen`.

#### Acceptance Criteria

1. WHEN the LoginScreen loads, THE App SHALL call `authService.isBiometricAvailable()` to determine whether biometric hardware and enrolled credentials are present.
2. WHERE biometric authentication is available, THE LoginScreen SHALL display a "Sign in with Biometrics" button below the primary login button.
3. WHEN a user taps the biometric button, THE App SHALL prompt the OS biometric dialog.
4. WHEN biometric authentication succeeds, THE App SHALL authenticate the user and navigate to `MainTabNavigator`.
5. IF biometric authentication fails or is cancelled, THEN THE App SHALL display an error message and allow the user to sign in with email and password instead.

---

### Requirement 5: Google OAuth Authentication

**User Story:** As a user, I want to sign in with my Google account, so that I can onboard quickly without creating a new password.

> **Current State:** Not yet built. This is a remaining Phase 7+ item.

#### Acceptance Criteria

1. THE LoginScreen SHALL display a "Continue with Google" button styled with the Google brand colours and logo.
2. WHEN a user taps "Continue with Google", THE App SHALL initiate the OAuth 2.0 authorisation flow using `expo-auth-session` with a native browser session.
3. WHEN Google authorisation succeeds, THE App SHALL send the OAuth ID token to the Backend endpoint `POST /auth/google` and receive a JWT in return.
4. WHEN the Backend returns a JWT following Google sign-in, THE App SHALL store it in SecureStore and navigate to `MainTabNavigator`.
5. IF the Google OAuth flow is cancelled or fails, THEN THE App SHALL dismiss the browser and display an error message on the LoginScreen without crashing.
6. WHERE a Google account has no corresponding Slick AI account, THE Backend SHALL create one automatically so the user is never shown a separate registration form after OAuth.

---

### Requirement 6: Apple Sign-In

**User Story:** As an iOS user, I want to sign in with Apple, so that I can authenticate using the privacy-preserving method required for apps distributed on the Apple App Store.

> **Current State:** Not yet built. Required by Apple App Store review guidelines when social login is offered.

#### Acceptance Criteria

1. WHERE the App is running on iOS, THE LoginScreen SHALL display a "Sign in with Apple" button that meets Apple Human Interface Guidelines (black background, white Apple logo, white text).
2. WHEN a user taps "Sign in with Apple", THE App SHALL initiate the Apple Sign-In request using `expo-apple-authentication`.
3. WHEN Apple Sign-In succeeds, THE App SHALL send the Apple identity token to the Backend endpoint `POST /auth/apple` and receive a JWT in return.
4. WHEN the Backend returns a JWT following Apple sign-in, THE App SHALL store it in SecureStore and navigate to `MainTabNavigator`.
5. IF the Apple Sign-In flow is cancelled or fails, THEN THE App SHALL dismiss the prompt and display an error message on the LoginScreen without crashing.
6. WHERE a user chooses to hide their email from Apple Sign-In, THE App SHALL use the relay email address provided by Apple for all subsequent communication.
7. THE App SHALL NOT display the "Sign in with Apple" button on Android, as it is not supported.

---

### Requirement 7: Subscription Plans and Paywall

**User Story:** As a product owner, I want users to purchase a subscription before accessing live trading features, so that the service is monetised and sustainable.

> **Current State:** Not yet built. The subscription flow, plan selection screen, and paywall gate are all missing.

#### Acceptance Criteria

1. THE App SHALL offer exactly three Subscription_Plans: Monthly, Quarterly, and Yearly, with clearly displayed pricing for each.
2. WHEN a user first authenticates and holds no active Subscription_Plan, THE App SHALL navigate to a Paywall screen before granting access to `MainTabNavigator`.
3. THE Paywall screen SHALL present all three Subscription_Plan options with their billing period, price, and any savings percentage compared to the Monthly plan.
4. THE Paywall screen SHALL highlight the Quarterly or Yearly plan as the recommended option.
5. WHEN a user selects a plan and taps "Subscribe", THE App SHALL initiate the in-app purchase flow using `expo-in-app-purchases` (iOS App Store / Google Play Billing).
6. WHEN the in-app purchase is confirmed by the respective store, THE App SHALL notify the Backend (`POST /subscriptions/verify`) with the purchase receipt and receive confirmation.
7. WHEN the Backend confirms the subscription, THE App SHALL persist the subscription status and navigate to `MainTabNavigator`.
8. IF the in-app purchase is cancelled or fails, THEN THE App SHALL return the user to the Paywall screen and display an error message without locking the account.
9. WHILE a Subscription_Plan is active and not expired, THE App SHALL allow full access to Signals, Accounts, and automated trading features.
10. WHEN a Subscription_Plan expires, THE App SHALL redirect the user to the Paywall screen on next launch and disable live trading actions.
11. THE Settings screen SHALL display the user's current Subscription_Plan name and renewal date.
12. THE Paywall screen SHALL include a "Restore Purchase" button that calls the store's restore API and re-validates against the Backend.

---

### Requirement 8: Broker Account Connection

**User Story:** As a trader, I want to connect my live broker accounts to Slick AI, so that the AI can deliver signals and execute trades on my behalf.

> **Current State:** `AccountsScreen`, `accountService`, and `accountStore` are fully implemented including the Deriv 2-step PAT flow and MT5/Oanda 1-step flow.

#### Acceptance Criteria

1. THE AccountsScreen SHALL display all Connected_Accounts in a styled card list with a status colour stripe (active=`#00C851`, error=`#FF3B5C`, circuit_breaker=`#FF9500`, inactive=`#4A5568`).
2. WHEN a user taps "Connect", THE App SHALL open a bottom-sheet modal with a horizontal broker selector (Deriv, MetaTrader 5, Oanda).
3. WHEN the selected broker is Deriv, THE App SHALL present a 2-step connection flow: Step 1 collects the PAT token; Step 2 displays a picker of accounts returned by `POST /accounts/deriv/list-accounts`.
4. WHEN the Deriv account list loads, THE App SHALL auto-select the first active real (non-demo) account in the list.
5. WHEN the selected broker is MT5 or Oanda, THE App SHALL present a 1-step form collecting login number, password, and server fields.
6. WHEN a user confirms connection, THE App SHALL call `POST /accounts/connect` and add the returned Connected_Account to the `accountStore`.
7. IF the connection request fails, THEN THE App SHALL display an inline error banner inside the modal without closing it, so the user can correct their credentials.
8. WHEN a user taps "Disconnect" on an AccountCard, THE App SHALL present a confirmation alert describing the consequences before calling `DELETE /accounts/:id`.
9. THE AccountsScreen SHALL refresh the account list on pull-to-refresh and on mount.
10. WHEN an account has `status = 'circuit_breaker_active'`, THE AccountCard SHALL display an orange "Circuit Breaker" badge explaining that automated trading is paused.

---

### Requirement 9: Trading Dashboard

**User Story:** As a trader, I want a dashboard showing my real-time portfolio health, open positions, and equity curve, so that I can monitor my trading performance at a glance.

> **Current State:** `DashboardScreen` is implemented with greeting, LIVE pill, AutomatedBanner, period filter tabs, summary cards, EquityChart, open positions list, pull-to-refresh, and skeleton loading.

#### Acceptance Criteria

1. THE DashboardScreen SHALL display a time-sensitive greeting in the format "{Good morning/afternoon/evening}, {firstName}".
2. WHEN the WebSocket is connected, THE DashboardScreen SHALL display an animated pulsing green dot next to a "LIVE" pill in the header.
3. THE DashboardScreen SHALL provide period filter tabs labelled `1D`, `7D`, `30D`, and `ALL`; selecting a tab SHALL re-fetch the Performance_Summary for that period.
4. THE DashboardScreen SHALL display a summary card grid containing: total P&L (large card with direction-tinted gradient), win rate, total trade count, and open position count.
5. THE App SHALL use `AnimatedNumber` to animate the total P&L value when it changes, counting smoothly to the new value.
6. THE DashboardScreen SHALL render an Equity_Curve line chart using `react-native-svg`; IF no equity data exists, THEN THE App SHALL display a placeholder with a dashed baseline and the message "No equity data yet".
7. THE DashboardScreen SHALL list all Open_Positions using `TradeCard` components, each showing: asset, direction badge, unrealised P&L, entry price, current price, lot size, hold duration, stop loss, and take profit.
8. WHEN a WebSocket `position_update` event arrives, THE App SHALL update the corresponding Open_Position unrealised P&L with a smooth `AnimatedNumber` transition.
9. WHILE at least one Connected_Account is in Automated_Trading_Mode, THE DashboardScreen SHALL display the `AutomatedBanner` component.
10. WHEN no Open_Positions exist, THE DashboardScreen SHALL display an empty-state illustration and a contextual message depending on whether the user has an automated account.
11. THE DashboardScreen SHALL support pull-to-refresh, which re-fetches Open_Positions and Performance_Summary simultaneously.
12. WHEN dashboard data is loading for the first time, THE DashboardScreen SHALL display exactly 3 `SkeletonCard` placeholders.

---

### Requirement 10: AI Signal Delivery

**User Story:** As a trader, I want to receive real-time AI trading signals with confidence scores, so that I can make informed decisions or let the AI trade automatically.

> **Current State:** `SignalsScreen`, `SignalCard`, `signalStore`, and `signalService` are implemented. WebSocket `signal` event handler is in `useWebSocket`. Signal expiry logic (15-minute window) is in `signalStore`.

#### Acceptance Criteria

1. THE SignalsScreen SHALL display all received Signals in a `FlatList` with staggered entrance animations (80 ms delay per card, 400 ms fade + spring slide-up).
2. WHEN a new Signal arrives via WebSocket `signal` event, THE App SHALL prepend it to the signal list.
3. THE SignalCard SHALL display: asset pair, direction badge (BUY=green gradient, SELL=red gradient), entry price, stop loss (red), take profit (green), confidence percentage, and an animated confidence bar that grows from 0% to the stated value over 600 ms on mount.
4. THE App SHALL check signal expiry every 60 seconds using a `setInterval`; WHEN a Signal's `generatedAt` age exceeds 15 minutes, THE App SHALL mark it as expired.
5. WHEN a Signal has status `expired`, THE SignalCard SHALL render with 45% opacity and display an "EXPIRED" badge.
6. WHERE a Connected_Account is in Automated_Trading_Mode, THE SignalCard SHALL display an "AUTO" badge and the text "Executing automatically..." with a loading spinner.
7. THE SignalsScreen SHALL provide filter chips: `All`, `BUY`, `SELL`, and `Active`; selecting a chip SHALL filter the displayed list without re-fetching from the Backend.
8. WHEN no Signals are present, THE SignalsScreen SHALL display a radio icon and the message "Waiting for signals...".
9. THE SignalsScreen SHALL support pull-to-refresh to re-fetch signals from `GET /signals`.
10. WHEN a new Signal arrives, THE App SHALL schedule a local push notification with the asset, direction, and entry price.

---

### Requirement 11: Real-time WebSocket Integration

**User Story:** As a trader, I want the app to maintain a persistent real-time connection to the backend, so that position updates, signals, and trade events arrive instantly without manual refreshes.

> **Current State:** `websocketService` and `useWebSocket` are implemented. WebSocket reconnection on `AppState` changes and the JWT refresh interceptor are not yet wired (T-701 to T-704).

#### Acceptance Criteria

1. THE App SHALL maintain a single Socket.IO WebSocket connection per authenticated session; THE App SHALL NOT create multiple simultaneous connections.
2. WHEN the App transitions from `background` to `active` state, THE WebSocket SHALL attempt to reconnect if it is not currently connected.
3. WHEN the App transitions to `background` state, THE WebSocket SHALL pause reconnection attempts to conserve battery.
4. WHEN a WebSocket `trade_executed` event arrives, THE App SHALL call `addTrade()` in `tradeStore` and schedule a local push notification.
5. WHEN a WebSocket `trade_closed` event arrives, THE App SHALL call `closeTrade(tradeId, exitPrice, pnl)` in `tradeStore` and schedule a local push notification.
6. WHEN a WebSocket `position_update` event arrives, THE App SHALL call `updatePosition(tradeId, partialPosition)` in `tradeStore`.
7. WHEN the App authenticates or token changes, THE WebSocket SHALL inject the new JWT via `websocketService.setToken(token)` before connecting.
8. WHEN the App logs out, THE WebSocket SHALL be disconnected and all event listeners SHALL be removed.
9. WHEN an API request returns HTTP 401, THE App SHALL call `authService.refreshToken()` to obtain a new JWT, retry the original request with the new token, and update SecureStore; IF the refresh also fails, THEN THE App SHALL call `logout()`.

---

### Requirement 12: Trade History

**User Story:** As a trader, I want to review my completed trades with performance statistics, so that I can analyse my strategy results over time.

> **Current State:** `TradeHistoryScreen` and `tradeStore` closed trades state are implemented.

#### Acceptance Criteria

1. THE TradeHistoryScreen SHALL display aggregate stats above the list: total trade count, win rate percentage, and net P&L.
2. THE TradeHistoryScreen SHALL provide direction filter chips (`All`, `BUY`, `SELL`) that filter the list without re-fetching.
3. THE App SHALL render each Closed_Trade as a card with: direction left-stripe (4 px), asset pair, direction badge, P&L value (colour-coded), entry price → exit price, lot size, hold duration, close reason badge (e.g. "TAKE PROFIT", "STOP LOSS"), P&L percentage, and exit timestamp.
4. THE TradeHistoryScreen SHALL support pull-to-refresh that re-fetches from `GET /trades`.
5. WHEN no Closed_Trades exist, THE TradeHistoryScreen SHALL display an empty-state illustration and message.
6. WHEN trade history data is loading for the first time, THE TradeHistoryScreen SHALL display skeleton card placeholders.

---

### Requirement 13: Push Notifications

**User Story:** As a trader, I want to receive push notifications for new signals and trade events, so that I am alerted even when the app is backgrounded.

> **Current State:** `notificationService` is implemented with local notification scheduling. Push token registration with Backend and deep-link handling on notification tap are not yet wired (T-801 to T-804).

#### Acceptance Criteria

1. WHEN a user first authenticates, THE App SHALL register the Expo push token with the Backend via `POST /notifications/register`.
2. WHEN the App is in the foreground, THE App SHALL display in-app notification banners using `Notifications.setNotificationHandler`.
3. WHEN a user taps a push notification with `type: 'signal'`, THE App SHALL deep-link to the Signals tab in `MainTabNavigator`.
4. WHEN a user taps a push notification with `type: 'trade_executed'` or `type: 'trade_closed'`, THE App SHALL deep-link to the History tab in `MainTabNavigator`.
5. IF a user has previously denied notification permissions, THEN THE Settings screen SHALL display a prompt explaining the benefit and a button to open the OS permissions settings screen.
6. WHEN the App is in the background and a new Signal arrives via the Backend push service, THE App SHALL display a notification with the signal asset, direction, and entry price.

---

### Requirement 14: Settings and Account Management

**User Story:** As a user, I want to manage my profile, notification preferences, trading mode per account, and subscription, so that I can customise the app to my needs.

> **Current State:** `SettingsScreen` is fully implemented including profile card, preferences, subscription mode toggle with risk confirmation modal, about section, and sign out.

#### Acceptance Criteria

1. THE SettingsScreen SHALL display a profile card with a gradient avatar circle showing the user's email initial, full email address, and a truncated user ID.
2. THE SettingsScreen SHALL provide a Push Notifications toggle that enables or disables local and remote notifications.
3. THE SettingsScreen SHALL provide a Haptic Feedback toggle; WHEN enabled, THE App SHALL trigger `expo-haptics` impact feedback on: signal card appearance, trade card appearance, tab press, button press, and broker connection success.
4. THE SettingsScreen SHALL list each Connected_Account with a toggle to switch between Signal_Delivery_Mode and Automated_Trading_Mode.
5. WHEN a user switches a Connected_Account to Automated_Trading_Mode, THE App SHALL display a risk warning modal with "Cancel" and "I Understand" buttons before applying the change.
6. WHEN a user switches a Connected_Account from Automated_Trading_Mode to Signal_Delivery_Mode, THE App SHALL apply the change immediately without a confirmation modal.
7. THE SettingsScreen SHALL display the user's active Subscription_Plan and renewal date.
8. THE SettingsScreen SHALL include links to the Privacy Policy and Terms of Service as tappable rows.
9. WHEN a user taps "Sign Out", THE App SHALL present a confirmation alert; WHEN confirmed, THE App SHALL clear SecureStore, reset all Zustand stores, disconnect the WebSocket, and navigate to `AuthNavigator`.

---

### Requirement 15: Network Status and Error Resilience

**User Story:** As a user, I want the app to communicate clearly when I am offline or an error occurs, so that I understand what is happening and can take action.

> **Current State:** Basic error banners exist on individual screens. Offline indicator (T-907), ErrorBoundary (T-908), and currency formatting helper (T-902) are not yet built.

#### Acceptance Criteria

1. WHEN the device network connection is lost, THE App SHALL display a persistent "No internet connection" overlay banner at the bottom of the screen.
2. WHEN the device network connection is restored, THE App SHALL automatically dismiss the offline banner and attempt to reconnect the WebSocket.
3. THE App SHALL wrap `MainTabNavigator` in an `ErrorBoundary` component; IF an unhandled JavaScript error propagates to the boundary, THEN THE App SHALL display a graceful error screen with a "Restart" button instead of a blank or crashed screen.
4. THE App SHALL format all currency values using a helper that respects the user's display currency setting, formats values ≥ 1,000 with a `K` suffix, and values ≥ 1,000,000 with an `M` suffix.
5. IF an API request fails due to a network timeout, THEN THE App SHALL surface the error to the relevant screen's error banner without crashing.

---

### Requirement 16: Accessibility

**User Story:** As a user with accessibility needs, I want all interactive elements to be labelled, so that screen readers and assistive technologies can identify them correctly.

> **Current State:** Accessibility labels are absent throughout the app (T-906 is unstarted).

#### Acceptance Criteria

1. THE App SHALL provide an `accessibilityLabel` on every `Pressable`, `Switch`, and `TextInput` component in all screens.
2. THE App SHALL provide an `accessibilityHint` on all `Pressable` components whose action is not obvious from its label alone.
3. THE App SHALL set `accessibilityRole="button"` on all `Pressable` components acting as buttons.
4. THE App SHALL set `accessibilityState={{ checked }}` on all `Switch` components to reflect their current toggle state.
5. THE App SHALL set `accessibilityRole="tab"` on period filter tab and filter chip `Pressable` components.

---

### Requirement 17: UI Animations and Design System

**User Story:** As a user, I want a polished, consistently animated interface, so that the app feels premium and professional.

> **Current State:** Design tokens, Reanimated animations, and LinearGradient usage are implemented across all completed screens.

#### Acceptance Criteria

1. THE App SHALL use the design tokens defined in `src/theme/index.ts` (`COLORS`, `FONTS`, `RADIUS`, `SPACING`) for all visual properties; hard-coded values outside this file SHALL NOT be introduced.
2. THE App SHALL use `#080B14` as the global background, `#00C851` as the brand/buy colour, and `#FF3B5C` as the sell/danger colour throughout all screens.
3. WHEN any list card enters the viewport, THE App SHALL apply a staggered entrance animation: `withDelay(index * 80, withTiming(1, { duration: 400 }))` fade combined with a spring slide-up.
4. WHEN a user presses any primary button, THE App SHALL animate the button scale to 0.96× using `withSpring` on press-in and back to 1× on press-out.
5. THE EquityChart SHALL render as a filled SVG path with a linear gradient fill matching the P&L direction (green above baseline, red below).
6. THE App SHALL use `LinearGradient` from `expo-linear-gradient` for all gradient backgrounds, cards, and button fills.
7. THE App SHALL use `Ionicons` from `@expo/vector-icons` as the sole icon library.

---

### Requirement 18: Test Coverage

**User Story:** As a developer, I want automated tests for critical business logic, so that regressions are caught before they reach users.

> **Current State:** Jest configuration and test suite are not yet created (T-1001 to T-1010).

#### Acceptance Criteria

1. THE App SHALL include a `jest.config.js` that configures `@testing-library/react-native`, module name mappers for all `expo-*` modules, and TypeScript path resolution.
2. THE App SHALL include unit tests for `authStore` covering: successful login, failed login incrementing attempt counter, Lockout activation after 3 failures, and successful logout clearing SecureStore.
3. THE App SHALL include unit tests for `signalStore` covering `markExpiredSignals` — for any Signal with `generatedAt` older than 15 minutes, the status SHALL be `expired`; for any Signal with `generatedAt` within 15 minutes, the status SHALL remain unchanged.
4. THE App SHALL include unit tests for `tradeStore` covering `closeTrade` (moves trade from open positions to closed trades) and `updatePosition` (updates unrealised P&L on the matching open position).
5. THE App SHALL include unit tests for `accountStore` covering add, remove, and `setSubscriptionMode` actions.
6. THE App SHALL include a property-based test asserting: for any array of Closed_Trades with individual P&L values, `totalPnl === sum(individualPnls)` and `0 ≤ winRate ≤ 1`.
7. THE App SHALL include a property-based test asserting: for any `generatedAt` timestamp value, `isExpired` is `true` if and only if the age of the timestamp exceeds 15 minutes.
8. THE App SHALL include integration tests for `AuthNavigator` verifying that tapping "Register" on `LoginScreen` navigates to `RegisterScreen` and tapping the back affordance returns to `LoginScreen`.

---

### Requirement 19: CI/CD Pipeline and Expo Go Development

**User Story:** As a developer, I want an automated build and preview pipeline, so that every pull request is tested and the app can be previewed on a device via Expo Go during development.

> **Current State:** `eas.json` is referenced in the task list (T-008) but the GitHub Actions workflow and full EAS build configuration are not yet created (T-1101 to T-1108).

#### Acceptance Criteria

1. THE App SHALL be runnable in Expo Go by executing `npx expo start` without requiring a full native build, for all features that do not depend on native modules unavailable in Expo Go.
2. THE App SHALL include a `.github/workflows/android-build.yml` GitHub Actions workflow that runs on every push to the `main` branch and on every pull request targeting `main`.
3. WHEN the CI workflow runs, THE pipeline SHALL execute `npm test` and fail the build if any test fails.
4. WHEN all tests pass, THE CI workflow SHALL trigger an EAS build for the Android APK (debug profile).
5. THE `eas.json` SHALL define at minimum three build profiles: `development` (internal distribution, debug), `preview` (internal distribution, release), and `production` (store distribution, release).
6. THE `eas.json` SHALL inject `API_BASE_URL` as an environment variable per profile so that development, preview, and production each point to the correct Backend URL.
7. THE App SHALL include `proguard-rules.pro` with rules that prevent obfuscation of React Native internals and Socket.IO class names for the production Android build.
8. THE App SHALL include a correctly configured adaptive icon with a separate foreground (`android-icon-foreground.png`) and background (`android-icon-background.png`) layer for Android.
9. THE App SHALL specify all required permissions in `app.json` — including push notifications, biometric authentication, and camera (for future QR broker onboarding) — before submission to either store.
10. WHEN an EAS build completes successfully, THE CI workflow SHALL post a build artifact link or EAS build URL as a comment on the corresponding pull request.

---

### Requirement 20: Security and Credential Handling

**User Story:** As a user, I want my authentication tokens and broker credentials to be stored securely, so that my financial accounts cannot be accessed if my device is lost.

> **Current State:** JWT and refresh token storage in SecureStore is implemented. Broker credentials are sent to the Backend and not persisted locally beyond the connection flow.

#### Acceptance Criteria

1. THE App SHALL store all JWTs and refresh tokens exclusively in SecureStore; JWT SHALL NOT be stored in AsyncStorage, local files, or Redux/Zustand persistent middleware with unencrypted storage.
2. THE App SHALL transmit broker credentials (PAT, login/password) to the Backend only over HTTPS; credentials SHALL NOT be logged or persisted on-device after a successful connection call.
3. THE App SHALL inject the JWT into every authenticated API request as an `Authorization: Bearer {token}` header via an `axios` request interceptor.
4. WHEN the JWT expires and a refresh token is available, THE App SHALL transparently refresh the JWT without requiring the user to log in again (see Requirement 11, criterion 9).
5. WHEN the App is placed in the background for more than 15 minutes, THE App SHALL require the user to re-authenticate via biometrics or password on next foreground if biometric authentication is available and enabled.
6. THE App SHALL obfuscate all password and PAT `TextInput` fields using `secureTextEntry={true}`.
