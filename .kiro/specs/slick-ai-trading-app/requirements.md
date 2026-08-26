# Requirements Document

## Introduction

Slick AI is an AI-powered forex trading mobile application for Android and iOS built with Expo
~54 and React Native 0.81. The app connects users to their live broker accounts, delivers
real-time AI-generated trading signals, and can execute trades autonomously on their behalf.
A subscription paywall gates live trading features, and all behaviour must be secure, legally
sound, and architecturally compliant with the 13 software engineering principles listed below.

The existing codebase (Phases 0–6) covers foundation, state, services, hooks, core components,
navigation, and primary screens. These requirements address both what is built and what must be
completed or hardened — covering the full product end-to-end for verification and task generation.

---

## Glossary

- **App**: The Slick AI React Native mobile application.
- **Auth_Service**: The module responsible for authentication API calls and biometric prompts (`src/services/authService.ts`).
- **Auth_Store**: The Zustand store that holds authentication state and SecureStore persistence (`src/store/authStore.ts`).
- **WelcomeScreen**: The first screen shown to a new or logged-out user, containing the "Get Started" call-to-action.
- **OnboardingScreen**: Three-slide carousel shown exactly once after first launch, before the Auth flow.
- **LoginScreen**: Screen where returning users sign in via email/password, Google, Apple, or biometrics.
- **RegisterScreen**: Screen where new users create an account via email/password.
- **PaywallScreen**: Subscription purchase screen shown after authentication when no active entitlement exists.
- **DashboardScreen**: The primary post-login screen showing performance summary, equity curve, and open positions.
- **SignalsScreen**: Screen displaying real-time AI-generated trading signals.
- **TradeHistoryScreen**: Screen showing closed trade history with performance statistics.
- **AccountsScreen**: Screen for connecting, viewing, and disconnecting broker accounts.
- **SettingsScreen**: Screen for managing preferences, subscription mode, and account actions.
- **RootNavigator**: Top-level navigation controller that gates screens by auth and subscription state.
- **MainTabNavigator**: Bottom-tab navigator rendered after subscription is confirmed.
- **Auth_Navigator**: Stack navigator containing LoginScreen and RegisterScreen.
- **WebSocket_Service**: The Socket.IO client wrapper (`src/services/websocketService.ts`).
- **Subscription_Service**: The RevenueCat SDK wrapper (`src/services/subscriptionService.ts`).
- **Subscription_Store**: The Zustand store that holds subscription entitlement state (`src/store/subscriptionStore.ts`).
- **Notification_Service**: The expo-notifications wrapper (`src/services/notificationService.ts`).
- **API_Client**: The Axios instance with interceptors (`src/services/apiClient.ts`).
- **Broker**: A forex trading provider (Deriv, MetaTrader 5, or Oanda) whose account a user connects.
- **Signal**: An AI-generated trading recommendation containing asset, direction, entry price, SL, TP, and confidence score.
- **Open_Position**: A currently active trade that has been placed in the market.
- **Closed_Trade**: A completed trade with an exit price, P&L, and close reason.
- **JWT**: A JSON Web Token used for authenticating API requests.
- **Refresh_Token**: A long-lived token used to obtain a new JWT without re-authentication.
- **SecureStore**: The `expo-secure-store` module used for encrypted on-device key/value storage.
- **RevenueCat**: The third-party subscription management platform (`react-native-purchases` SDK).
- **Entitlement**: A RevenueCat concept representing the "pro" subscription access right.
- **CI_CD**: The GitHub Actions continuous integration and delivery pipeline (`.github/workflows/android-build.yml`).
- **EAS**: Expo Application Services — the build and submission platform.
- **EARS**: Easy Approach to Requirements Syntax — the pattern system used for all requirements herein.

---

## Architectural Principles

All requirements and their implementations must comply with the following 13 software engineering
architecture principles:

1. **Single Responsibility** — Each module, component, or service has exactly one reason to change.
2. **Open/Closed** — Modules are open for extension (new brokers, new screens) but closed for modification.
3. **Liskov Substitution** — Derived types (e.g., screen props) are substitutable without altering correctness.
4. **Interface Segregation** — No consumer depends on methods it does not use.
5. **Dependency Inversion** — High-level modules (screens) depend on abstractions (service interfaces, stores), not concretions.
6. **Separation of Concerns** — UI, state, network, and business logic are kept in separate layers.
7. **DRY (Don't Repeat Yourself)** — Common logic is extracted into shared hooks, helpers, or services.
8. **YAGNI (You Aren't Gonna Need It)** — Only features explicitly required here are implemented.
9. **Fail Fast** — Errors are detected as early as possible (validation, type guards, interceptors).
10. **Defence in Depth** — Multiple independent security layers protect sensitive operations.
11. **Least Privilege** — Each module requests only the permissions it needs; tokens are scoped minimally.
12. **Observability** — Errors, state transitions, and key events are logged in development (`__DEV__` guards) without leaking PII.
13. **Testability** — All logic with conditional branches is written in a form that supports unit and property-based testing without network or native dependencies.

---

## Requirements

---

### Requirement 1: Application Launch and Splash Screen

**User Story:** As a user, I want to see a branded splash screen when the App starts, so that I have a smooth and professional first impression while the App initialises.

#### Acceptance Criteria

1. WHEN the App is launched, THE RootNavigator SHALL display the SplashScreen for a minimum of 1800 milliseconds before transitioning to any other screen.
2. WHEN the SplashScreen is displayed, THE SplashScreen SHALL animate the logo from a scale of 0.5 to 1.0 over 700 milliseconds using a spring easing.
3. WHEN the SplashScreen logo animation begins, THE SplashScreen SHALL fade in the app title and subtitle text from opacity 0.0 to opacity 1.0 after a 400-millisecond delay over 500 milliseconds.
4. WHILE the App is loading stored authentication state from SecureStore, THE RootNavigator SHALL continue displaying the SplashScreen until both the minimum display duration and the async load have completed.
5. IF the stored authentication state cannot be read from SecureStore, THEN THE Auth_Store SHALL treat the user as unauthenticated.
6. IF the stored authentication state cannot be read from SecureStore AND the onboarding completion flag `slickai_onboarding_done` does not exist, THEN THE RootNavigator SHALL navigate to the OnboardingScreen; IF the flag exists, THEN THE RootNavigator SHALL navigate to the WelcomeScreen.

---

### Requirement 2: Onboarding Flow

**User Story:** As a first-time user, I want to see an engaging onboarding carousel, so that I understand the App's value before I sign in.

#### Acceptance Criteria

1. WHEN the App is launched for the first time and no onboarding completion flag exists in SecureStore, THE RootNavigator SHALL display the OnboardingScreen before the Auth_Navigator.
2. THE OnboardingScreen SHALL present exactly three slides in the order: "AI-Powered Trading", "Connect Your Broker", "Choose Your Mode".
3. WHEN the user scrolls between OnboardingScreen slides, THE OnboardingScreen SHALL animate each slide's opacity and vertical translation using a `scrollX` SharedValue driven by the FlatList scroll position.
4. WHEN the user reaches the third slide, THE OnboardingScreen SHALL replace the "Next" button with a "Get Started" button.
5. WHEN the user taps "Get Started" or "Skip", THE OnboardingScreen SHALL write the completion flag `slickai_onboarding_done` to SecureStore.
6. WHEN the flag `slickai_onboarding_done` has been successfully written, THE RootNavigator SHALL navigate to the Auth_Navigator.
7. IF writing the completion flag `slickai_onboarding_done` to SecureStore fails, THEN THE RootNavigator SHALL still navigate to the Auth_Navigator and SHALL retry writing the flag on the next App launch.
8. WHEN the App is launched on subsequent sessions and the completion flag exists in SecureStore, THE RootNavigator SHALL skip the OnboardingScreen.
9. THE OnboardingScreen SHALL display a dot pagination indicator where the active dot width expands from 8 pixels to 24 pixels using a spring animation with a damping value no lower than 10, and inactive dots SHALL be 8 pixels wide.

---

### Requirement 3: Welcome Screen

**User Story:** As a returning or new user who has completed onboarding, I want to see a welcoming entry screen with clear options to sign in or register, so that I can quickly access the App.

#### Acceptance Criteria

1. WHEN the user has completed onboarding and is not authenticated, THE RootNavigator SHALL display a WelcomeScreen as the initial screen of the Auth_Navigator.
2. THE WelcomeScreen SHALL display the Slick AI logo, app name, a tagline describing the AI trading platform, a "Sign In" button, and a "Create Account" button.
3. WHEN the user taps "Sign In", THE Auth_Navigator SHALL navigate to the LoginScreen.
4. WHEN the user taps "Create Account", THE Auth_Navigator SHALL navigate to the RegisterScreen.
5. WHEN the WelcomeScreen appears, THE WelcomeScreen SHALL animate each content element in sequence with a fade-in and upward slide of no more than 20dp per element, with a stagger interval of 100ms between elements and a total animation duration not exceeding 800ms, using Reanimated.
6. IF the Auth_Navigator fails to navigate to the LoginScreen or RegisterScreen within 3 seconds of the corresponding button tap, THEN THE Auth_Navigator SHALL remain on the WelcomeScreen and display an error message indicating that navigation failed.
7. WHEN the user has completed onboarding and is not authenticated, THE RootNavigator SHALL display the WelcomeScreen within 1 second of the authentication state being resolved.

---

### Requirement 4: Email and Password Authentication

**User Story:** As a user, I want to sign in or register with my email and password, so that I have a private, persistent account on the platform.

#### Acceptance Criteria

1. WHEN the user submits the LoginScreen form with a valid email and password, THE Auth_Service SHALL send a POST request to `/auth/login` and THE Auth_Store SHALL store the returned JWT and Refresh_Token in SecureStore.
2. WHEN the LoginScreen email field loses focus and the value is not a valid email format, THE LoginScreen SHALL display an inline validation error message below the email field indicating the value is not a valid email address.
3. WHEN the user submits the RegisterScreen form, THE RegisterScreen SHALL validate that the email matches the format `local@domain.tld`, the password is at least 8 characters and at most 128 characters, and the confirm-password field value is identical to the password field value before calling the Auth_Service.
4. WHEN the RegisterScreen form fails validation on submit, THE RegisterScreen SHALL display an inline error message below each invalid field and SHALL NOT call the Auth_Service.
5. WHEN the user submits the RegisterScreen form with valid inputs, THE Auth_Service SHALL send a POST request to `/auth/register` and THE Auth_Store SHALL store the returned JWT and Refresh_Token in SecureStore.
6. WHEN an authentication API call returns an HTTP 401 response, THE LoginScreen SHALL display an error message indicating the credentials are invalid and THE Auth_Store SHALL increment the failed-attempt counter by 1.
7. WHEN the failed-attempt counter reaches 3 within a session, THE Auth_Store SHALL record a lockout timestamp 15 minutes in the future and THE LoginScreen SHALL replace the login form with a lockout screen displaying the remaining lockout duration in whole seconds.
8. WHILE the Auth_Store lockout timestamp is set and has not expired, THE LoginScreen SHALL display the lockout screen and SHALL NOT submit any API requests.
9. WHEN the lockout timer expires, THE Auth_Store SHALL clear the lockout timestamp and failed-attempt counter and THE LoginScreen SHALL replace the lockout screen with the login form.
10. IF an authentication API call fails due to a network error or no HTTP status code, THEN THE LoginScreen and RegisterScreen SHALL display an error message indicating the server cannot be reached and prompting the user to check their internet connection.
11. WHILE an authentication API call is in progress, THE LoginScreen and RegisterScreen SHALL display an `ActivityIndicator` in place of the submit button and SHALL disable all form input fields.
12. IF the Auth_Service POST request to `/auth/register` returns an HTTP 409 response, THEN THE RegisterScreen SHALL display an error message below the email field indicating an account with that email already exists and SHALL NOT store any tokens.

---

### Requirement 5: Social Authentication (Google and Apple)

**User Story:** As a user, I want to sign in with my Google or Apple account, so that I can authenticate without managing a separate password.

#### Acceptance Criteria

1. WHEN the user taps the "Sign in with Google" button on the LoginScreen, THE App SHALL initiate the Google OAuth 2.0 PKCE flow using `expo-auth-session` and retrieve an ID token.
2. WHEN the Google ID token is obtained, THE Auth_Service SHALL send the token to `/auth/google`.
3. WHEN the `/auth/google` endpoint returns a success response, THE Auth_Store SHALL store the returned JWT and Refresh_Token in SecureStore and THE RootNavigator SHALL navigate to the authenticated flow.
4. IF the Google sign-in flow is cancelled by the user, THEN THE LoginScreen SHALL return to its default state without displaying an error.
5. IF the Google sign-in API call returns an error, THEN THE LoginScreen SHALL display a user-safe error message of no more than 200 characters or "Google sign-in failed. Please try again." if no server message is available.
6. WHERE the device is running iOS 13 or later, THE LoginScreen SHALL display a "Sign in with Apple" button.
7. WHEN the user taps "Sign in with Apple", THE App SHALL initiate the Apple Sign-In flow using `expo-apple-authentication` and retrieve an identity token.
8. WHEN the Apple identity token is obtained, THE Auth_Service SHALL send the token to `/auth/apple`.
9. WHEN the `/auth/apple` endpoint returns a success response, THE Auth_Store SHALL store the returned JWT and Refresh_Token in SecureStore and THE RootNavigator SHALL navigate to the authenticated flow.
10. IF the Apple sign-in flow is cancelled by the user, THEN THE LoginScreen SHALL return to its default state without displaying an error.
11. IF the Apple sign-in API call returns an error, THEN THE LoginScreen SHALL display a user-safe error message of no more than 200 characters or "Apple sign-in failed. Please try again." if no server message is available.

---

### Requirement 6: Biometric Authentication

**User Story:** As a returning user, I want to sign in with Face ID or my fingerprint, so that I can access the App quickly without typing my password.

#### Acceptance Criteria

1. WHEN the LoginScreen mounts, THE Auth_Service SHALL check whether biometric hardware is enrolled using `expo-local-authentication` and store the result.
2. WHILE biometric authentication is available AND a non-expired JWT exists in SecureStore, THE LoginScreen SHALL display a "Sign in with Biometrics" button.
3. IF biometric authentication hardware is not enrolled or unavailable, THEN THE LoginScreen SHALL not display the "Sign in with Biometrics" button.
4. WHEN the user taps the biometric button, THE Auth_Service SHALL prompt the system biometric dialog.
5. WHEN the biometric prompt returns a successful result, THE Auth_Store SHALL restore the existing token for the current session and THE RootNavigator SHALL navigate to the authenticated flow.
6. IF the biometric prompt is dismissed by the user, THEN THE LoginScreen SHALL return to its default state without displaying an error message and without incrementing the failed-attempt counter.
7. IF the biometric prompt fails due to an authentication error, THEN THE LoginScreen SHALL display "Biometric authentication failed" without incrementing the failed-attempt counter.

---

### Requirement 7: Session Persistence and JWT Token Refresh

**User Story:** As a user, I want to remain logged in between app launches, and I want my session to be automatically renewed, so that I am not unexpectedly logged out.

#### Acceptance Criteria

1. WHEN the App launches and a JWT exists in SecureStore, THE Auth_Store SHALL call `loadStoredAuth()` to read the JWT and Refresh_Token before any authenticated request is made and THE RootNavigator SHALL navigate to the authenticated flow.
2. WHEN the App launches and no JWT exists in SecureStore or the SecureStore read fails, THE Auth_Store SHALL treat the session as unauthenticated and THE RootNavigator SHALL navigate to the Auth_Navigator.
3. WHEN authenticated state is restored, THE RootNavigator SHALL inject the JWT into all service clients (Auth_Service, Account_Service, Signal_Service, Trade_Service, WebSocket_Service) before rendering MainTabNavigator, where "authenticated state" means a JWT is present in SecureStore and has not expired.
4. WHEN an API request from any service returns an HTTP 401 response, THE API_Client SHALL automatically call `POST /auth/refresh` with the stored Refresh_Token to obtain a new JWT; if a refresh call is already in flight, subsequent 401 responses SHALL queue and retry after the refresh resolves.
5. WHEN a new JWT is obtained from the refresh endpoint, THE API_Client SHALL update the JWT in SecureStore and in all service clients, then retry the original failed request exactly once.
6. IF the refresh call itself returns a non-2xx response or a network error, THEN THE API_Client SHALL call `logout()` on the Auth_Store and THE RootNavigator SHALL navigate to the Auth_Navigator.
7. IF a retried request (after token refresh) returns an HTTP 401 response, THEN THE API_Client SHALL call `logout()` on the Auth_Store and SHALL NOT attempt another refresh cycle.
8. WHEN the user explicitly logs out, THE Auth_Store SHALL delete the JWT and Refresh_Token from SecureStore and reset all Zustand stores (Account_Store, Signal_Store, Trade_Store, Subscription_Store) to their initial states before disconnecting the WebSocket_Service.

---

### Requirement 8: Subscription Paywall

**User Story:** As a new subscriber, I want to see the available subscription plans and purchase one, so that I can unlock live trading features.

#### Acceptance Criteria

1. WHEN the user is authenticated and the Subscription_Store shows `isSubscribed = false`, THE RootNavigator SHALL display the PaywallScreen instead of the MainTabNavigator.
2. WHEN the PaywallScreen mounts, THE Subscription_Service SHALL call `getOfferings()` from RevenueCat and THE PaywallScreen SHALL display the available packages (monthly, quarterly, yearly).
3. THE PaywallScreen SHALL display for each package: the plan name, billing period, formatted price string from RevenueCat, and a visual highlight (distinct background colour or border) on exactly one package designated as "most popular".
4. IF `getOfferings()` returns an empty package list, THEN THE PaywallScreen SHALL display an error message stating that plans are temporarily unavailable and a "Retry" button.
5. WHEN the user taps a package, THE PaywallScreen SHALL display a confirmation dialog showing the plan name and price before initiating purchase.
6. WHEN the user confirms purchase, THE Subscription_Service SHALL call `purchasePackage()` and THE Subscription_Store SHALL update `isSubscribed` to `true` upon a successful entitlement response.
7. WHEN the user taps "Restore Purchases", THE Subscription_Service SHALL call `restorePurchases()` and THE Subscription_Store SHALL update state based on the returned CustomerInfo.
8. WHEN `restorePurchases()` returns CustomerInfo with no active entitlements, THE PaywallScreen SHALL display a message stating that no active subscription was found.
9. IF a purchase call fails due to a RevenueCat or payment error, THEN THE PaywallScreen SHALL display the error message and remain visible so the user may retry.
10. IF the RevenueCat native module is unavailable (Expo Go), THEN THE Subscription_Service SHALL return empty CustomerInfo and THE PaywallScreen SHALL display a message explaining that purchases require a native build.
11. WHEN the Subscription_Service detects an active "pro" entitlement, THE Subscription_Store SHALL record the plan name and expiry date derived from the entitlement's `productIdentifier` and `expirationDate`.

---

### Requirement 9: Broker Account Connection

**User Story:** As a trader, I want to connect my forex broker account to the App, so that the AI can execute trades on my behalf or deliver signals in context.

#### Acceptance Criteria

1. WHEN the user taps "Connect Account" on the AccountsScreen, THE AccountsScreen SHALL present a bottom-sheet modal with a broker selector showing Deriv, MetaTrader 5, and Oanda.
2. WHEN the user selects Deriv, THE AccountsScreen SHALL display a two-step flow: Step 1 collects a Personal Access Token (PAT); Step 2 displays a list of accounts retrieved from the backend.
3. WHEN the user taps "Next" in the Deriv Step 1 form with a non-empty PAT, THE Account_Service SHALL call `listDerivAccounts(pat)`.
4. WHEN `listDerivAccounts` returns a non-empty list, THE AccountsScreen SHALL transition to Step 2 with the returned account list and auto-select the first active real-money account.
5. IF `listDerivAccounts` returns an empty list, THEN THE AccountsScreen SHALL display an inline error message in Step 1 stating that no active accounts were found for the provided PAT.
6. IF `listDerivAccounts` returns an API error, THEN THE AccountsScreen SHALL display the error message inline in Step 1 and remain on Step 1 for correction.
7. IF the PAT field is empty when the user taps "Next", THEN THE AccountsScreen SHALL display an inline validation error below the PAT field and SHALL NOT call the Account_Service.
8. WHEN the user taps "Connect" on the Step 2 Deriv form, THE Account_Service SHALL call `POST /accounts/connect` with the broker type and the selected account credentials.
9. WHEN the user selects MetaTrader 5 or Oanda, THE AccountsScreen SHALL display a single-step form with login number, password, and server fields.
10. IF any required field in the MT5 or Oanda form is empty when the user submits, THE AccountsScreen SHALL display inline validation errors and SHALL NOT call the Account_Service.
11. WHEN the user submits a valid MT5 or Oanda form, THE Account_Service SHALL call `POST /accounts/connect` with the appropriate broker credentials.
12. WHEN the connection API returns a 2xx response, THE Account_Store SHALL add the account to the accounts list and THE modal SHALL dismiss.
13. IF the connection API call returns an error, THEN THE AccountsScreen modal SHALL display an inline error banner with the server message and remain open for correction.
14. WHEN the user taps "Disconnect" on an account card and confirms the alert, THE Account_Service SHALL call `DELETE /accounts/:id` and THE Account_Store SHALL remove the account from the list.
15. THE AccountsScreen SHALL display each connected account in a card showing broker name, account balance, currency, status badge (active, error, circuit_breaker, inactive), and subscription mode badge (Signal Delivery, Automated Trading).

---

### Requirement 10: Subscription Mode Selection

**User Story:** As a connected trader, I want to choose between Signal Delivery and Automated Trading per account, so that I can control the level of AI autonomy.

#### Acceptance Criteria

1. THE SettingsScreen SHALL display a section for each connected account showing the current subscription mode as a toggle with two states: "Signal Delivery" and "Automated Trading".
2. WHEN a new account is connected, THE Account_Store SHALL set the account's default subscription mode to "Signal Delivery".
3. WHEN the user switches an account's mode to "Automated Trading", THE SettingsScreen SHALL display a risk-warning modal before sending any API request.
4. THE risk-warning modal SHALL include a warning icon, a description of capital risk, a "Cancel" button, and an "I Understand" button.
5. WHEN the user taps "I Understand" in the risk-warning modal, THE Account_Service SHALL send a mode update request with `{ accountId, mode: 'automated_trading' }`.
6. WHEN the mode update request for "Automated Trading" returns a 2xx response, THE Account_Store SHALL update the account's mode to "automated_trading".
7. WHEN the user switches an account's mode to "Signal Delivery", THE Account_Service SHALL send a mode update request with `{ accountId, mode: 'signal_delivery' }` without a confirmation modal.
8. IF the subscription mode API call fails, THEN THE SettingsScreen SHALL display an inline error and revert the toggle to its previous state.
9. WHEN the user taps "Cancel" in the risk-warning modal, THE modal SHALL close and THE account's mode SHALL remain unchanged.

---

### Requirement 11: Real-Time Dashboard

**User Story:** As an active trader, I want a live dashboard showing my portfolio performance and open positions, so that I can monitor my trading activity at a glance.

#### Acceptance Criteria

1. THE DashboardScreen SHALL display a time-based greeting where "Good morning" is shown from 05:00 to 11:59, "Good afternoon" from 12:00 to 17:59, and "Good evening" from 18:00 to 04:59, followed by the firstName derived from the authenticated user's email prefix.
2. WHEN the WebSocket_Service is connected, THE DashboardScreen SHALL display a green pulsing LiveDot and "LIVE" label.
3. THE DashboardScreen SHALL display period filter tabs for `1D`, `7D`, `30D`, and `ALL`, with the active tab visually distinguished by a distinct background or underline indicator.
4. WHEN the user taps a period tab, THE Trade_Store SHALL update `selectedPeriod` and THE DashboardScreen SHALL re-fetch the performance summary for the new period.
5. WHEN the user taps a period tab, THE DashboardScreen SHALL re-fetch the equity curve for the new period.
6. THE DashboardScreen SHALL display a Total P&L card using the AnimatedNumber component that transitions between numeric values over 400 milliseconds, coloured green when the value is positive or zero and red when negative.
7. THE DashboardScreen SHALL display Win Rate, Total Trade Count, and Open Position Count in summary cards alongside the P&L card.
8. WHEN the DashboardScreen is loading data for the first time, THE DashboardScreen SHALL display three SkeletonCard placeholders in place of the summary and chart sections.
9. THE DashboardScreen SHALL display an EquityChart showing timestamped equity data as an SVG line chart with a gradient fill.
10. THE DashboardScreen SHALL display all open positions as TradeCards below the chart, each showing asset, direction badge, unrealized P&L, entry price, current price, lot size, duration formatted as "Xh Ym", stop loss, and take profit.
11. WHEN at least one connected account has `subscriptionMode = 'automated_trading'`, THE DashboardScreen SHALL display an AutomatedBanner above the period tabs.
12. WHEN the user performs a pull-to-refresh gesture, THE DashboardScreen SHALL re-fetch open positions, performance summary, and equity curve simultaneously.
13. IF any data fetch fails and no previously loaded data exists, THEN THE DashboardScreen SHALL display a non-blank error state with the error message and a retry action.
14. IF any data fetch fails and previously loaded data exists, THEN THE DashboardScreen SHALL display an error banner with the message and preserve the previously loaded data.

---

### Requirement 12: Real-Time Signals

**User Story:** As a trader, I want to see AI-generated trading signals pushed to my device in real time, so that I can act on opportunities immediately.

#### Acceptance Criteria

1. THE SignalsScreen SHALL display a header showing the count of currently active (non-expired) signals and a LiveDot when the WebSocket_Service is connected.
2. THE SignalsScreen SHALL display filter chips for `All`, `BUY`, `SELL`, and `Active` that filter the displayed signal list.
3. WHEN a `signal` event is received from the WebSocket_Service, THE Signal_Store SHALL prepend the new signal to the list.
4. WHEN a new signal is prepended to the list, THE SignalsScreen SHALL render it at the top with a staggered entrance animation.
5. IF a `signal` event is received with an ID that already exists in the Signal_Store, THEN THE Signal_Store SHALL update the existing signal rather than adding a duplicate.
6. THE SignalCard component SHALL display asset name, direction badge with gradient colour (green for BUY, red for SELL), entry price, stop loss, take profit, confidence score as a number between 0 and 100, and an animated confidence bar that fills from 0% to the score value over 600 milliseconds on mount.
7. WHEN a signal's age exceeds 15 minutes since its `generatedAt` timestamp, THE Signal_Store SHALL mark that signal's status as `expired`.
8. WHEN a signal's status is `expired`, THE SignalCard SHALL display an "EXPIRED" badge and reduce its opacity to 45%.
9. THE SignalsScreen SHALL trigger an expiry check every 60 seconds; WHEN the check runs, THE Signal_Store SHALL evaluate all signals and mark any whose `generatedAt` is more than 900000 milliseconds in the past as `expired`.
10. WHEN a new signal is received and notification permission is granted, THE Notification_Service SHALL schedule a local push notification with the asset name and direction.
11. IF notification permission is denied, THEN THE Notification_Service SHALL not attempt to schedule a notification for the new signal.
12. IF an account with `subscriptionMode = 'automated_trading'` exists AND the signal is not expired, THEN THE SignalCard SHALL display an "AUTO" badge and an "Executing automatically..." spinner.
13. WHEN the signal list is empty after filters are applied, THE SignalsScreen SHALL display an empty state with an icon and a contextual message distinguishing between no signals received and all signals filtered out.

---

### Requirement 13: Trade History

**User Story:** As a trader, I want to review my historical trade performance, so that I can evaluate the AI's effectiveness over time.

#### Acceptance Criteria

1. THE TradeHistoryScreen SHALL display a stats bar showing total trade count, overall win rate as a percentage, and net P&L; by default the stats reflect all-time data and SHALL recalculate when a direction filter is applied.
2. THE TradeHistoryScreen SHALL display filter chips for `All`, `BUY`, and `SELL` that filter the closed trade list.
3. WHEN the user performs a pull-to-refresh gesture, THE TradeHistoryScreen SHALL re-fetch the closed trade list from `GET /trades`.
4. IF the `GET /trades` fetch fails, THEN THE TradeHistoryScreen SHALL display an error message and preserve any previously loaded trade data.
5. THE closed trade list SHALL be sorted with the most recent trade first and display each trade in a card with a 4-pixel direction colour stripe (green for BUY, red for SELL), asset name, direction badge, entry price, exit price, lot size, hold duration formatted as "Xh Ym", close reason badge (e.g., "TAKE PROFIT", "STOP LOSS"), P&L amount, and P&L percentage.
6. WHEN the trade list is loading, THE TradeHistoryScreen SHALL display SkeletonCard placeholders.
7. WHEN no trades exist for the selected filter, THE TradeHistoryScreen SHALL display an empty state with an icon and contextual message.
8. IF the `GET /trades` fetch fails and no cached data exists, THEN THE TradeHistoryScreen SHALL display a non-blank error state with a retry action.

---

### Requirement 14: Account Management

**User Story:** As a user, I want to see all my connected broker accounts and manage their settings from a single screen, so that I have full control over my integrations.

#### Acceptance Criteria

1. WHEN the AccountsScreen mounts, THE Account_Service SHALL fetch the current account list from `GET /accounts` and THE Account_Store SHALL be updated with the result.
2. IF the `GET /accounts` fetch fails, THEN THE AccountsScreen SHALL display an error message and a retry action; previously cached accounts SHALL be preserved if available.
3. THE AccountsScreen SHALL display each account in a card with a gradient background, a status colour stripe, broker name in uppercase, account balance, currency, status badge (one of: active, error, circuit_breaker, inactive), and subscription mode badge (one of: Signal Delivery, Automated Trading).
4. WHEN the AccountsScreen is loading, THE AccountsScreen SHALL display exactly two SkeletonCard placeholders for the account list.
5. WHEN no accounts are connected, THE AccountsScreen SHALL display an empty state with a call-to-action button to connect the first account.
6. THE AccountsScreen SHALL always display a "Connect Account" button in a fixed position at the bottom of the screen regardless of how many accounts exist.

---

### Requirement 15: Settings and Profile

**User Story:** As a user, I want to manage my profile, preferences, and account sign-out from the Settings screen, so that I have control over the App's behaviour.

#### Acceptance Criteria

1. THE SettingsScreen SHALL display a profile card containing a gradient avatar circle with the first letter of the user's email, the full email address, and the user ID truncated to a maximum of 8 characters followed by an ellipsis.
2. THE SettingsScreen SHALL display a "Push Notifications" toggle that reflects the stored notification preference; WHEN the user toggles the switch on, THE App SHALL enable local push notification scheduling and persist the enabled state; WHEN the user toggles the switch off, THE App SHALL disable local push notification scheduling and persist the disabled state.
3. IF the device-level notification permission is denied, THEN THE SettingsScreen SHALL display the "Push Notifications" toggle in the off position and in a disabled state that prevents interaction.
4. THE SettingsScreen SHALL display a "Haptic Feedback" toggle that reflects the stored haptic preference; WHEN the user toggles haptics on, THE App SHALL trigger an `expo-haptics` impulse on every button press, tab bar press, and toggle interaction; WHEN the user toggles haptics off, THE App SHALL suppress all `expo-haptics` impulse feedback.
5. THE SettingsScreen SHALL display the current App version, a "Privacy Policy" link, and a "Terms of Service" link; WHEN the user taps either link, THE App SHALL open the corresponding URL in the device's default browser.
6. WHEN the user taps "Sign Out" and confirms the alert dialog, THE Auth_Store SHALL call `logout()`, clearing SecureStore tokens and resetting all stores, and THE RootNavigator SHALL navigate to the Auth_Navigator.
7. WHEN the user taps "Sign Out" and dismisses the alert dialog without confirming, THE App SHALL close the dialog and return to the SettingsScreen with no state changes applied.

---

### Requirement 16: Real-Time WebSocket Reliability

**User Story:** As a user who uses the App throughout the day, I want the real-time connection to recover automatically after interruptions, so that I never miss a signal or position update.

#### Acceptance Criteria

1. WHEN the App transitions to the foreground (`AppState` changes to `active`) and the WebSocket_Service is disconnected, THE WebSocket_Service SHALL automatically attempt to reconnect.
2. WHILE the App is in the background (`AppState` is `background` or `inactive`), THE WebSocket_Service SHALL not attempt to reconnect or emit events.
3. WHEN the WebSocket_Service connection state changes, THE WebSocket_Service SHALL notify all registered `onConnectionChange` listeners with a boolean value indicating whether the connection is currently established.
4. THE WebSocket_Service SHALL implement an exponential back-off reconnection strategy starting with an initial delay of 1 second, doubling on each attempt (multiplier 2×), up to a maximum delay of 30 seconds per attempt, and SHALL cease retrying after 10 consecutive failed attempts.
5. IF the WebSocket_Service has exhausted all 10 reconnection attempts without success, THEN THE WebSocket_Service SHALL notify all registered `onConnectionChange` listeners with a value of `false` and SHALL not attempt further reconnections until the App next transitions to the foreground.
6. WHEN a `position_update` event is received, THE Trade_Store SHALL update the matching open position's unrealized P&L and current price without re-rendering unaffected positions in the list.
7. WHEN a `trade_executed` event is received, THE Trade_Store SHALL add the new position to the open positions list.
8. WHEN a `trade_executed` event is received, THE Notification_Service SHALL schedule a local push notification to be delivered within 2 seconds of the event being received.
9. WHEN a `trade_closed` event is received, THE Trade_Store SHALL move the position from open to closed and record the exit price and P&L.
10. WHEN a `trade_closed` event is received, THE Notification_Service SHALL schedule a local push notification to be delivered within 2 seconds of the event being received.

---

### Requirement 17: Push Notifications

**User Story:** As a user, I want to receive push notifications for new signals and trade events, so that I stay informed even when the App is in the background.

#### Acceptance Criteria

1. WHEN the user completes authentication for the first time in a session, THE Notification_Service SHALL register the Expo push token with the backend at `POST /notifications/register`.
2. IF the push token registration request fails, THEN THE Notification_Service SHALL retry once after a 5-second delay; if the retry also fails, THE App SHALL continue functioning without push token registration.
3. WHEN the App is in the foreground and a push notification arrives, THE Notification_Service SHALL display the notification as an in-app banner using the `setNotificationHandler` API from `expo-notifications`.
4. WHEN the user taps a push notification with `type: 'signal'` while the App is running, THE RootNavigator SHALL navigate to the Signals tab of the MainTabNavigator.
5. WHEN the user taps a push notification with `type: 'trade_executed'` or `type: 'trade_closed'` while the App is running, THE RootNavigator SHALL navigate to the Trades tab of the MainTabNavigator.
6. WHEN the App is launched by the user tapping a push notification, THE RootNavigator SHALL navigate to the tab corresponding to the notification `type` after authentication and subscription state have been resolved.
7. WHEN the App launches and notification permissions have not been requested, THE Notification_Service SHALL request permissions before any notification is scheduled.
8. IF notification permissions are denied, THEN THE App SHALL function normally without notifications and the SettingsScreen SHALL display the "Push Notifications" toggle in a disabled state with a prompt to enable notifications in system settings.

---

### Requirement 18: Security and Data Protection

**User Story:** As a user, I want to know that my credentials, tokens, and trading data are protected from unauthorised access, so that my account and funds are safe.

#### Acceptance Criteria

1. THE App SHALL store the JWT and Refresh_Token exclusively in SecureStore backed by the device's hardware keystore or Secure Enclave; these values SHALL NOT be stored in AsyncStorage, memory-only state, or logged.
2. WHEN constructing API requests, THE API_Client SHALL include the JWT in the `Authorization: Bearer {token}` header and SHALL NOT embed credentials in URL query parameters.
3. THE App SHALL enforce TLS certificate validation for all HTTPS API calls; IF a connection endpoint presents a self-signed, expired, or hostname-mismatched certificate, THEN THE App SHALL reject the connection and surface an error message indicating a certificate validation failure to the user.
4. WHEN a user submits a login attempt, THE Auth_Store SHALL record the failure count; IF the user accumulates 3 consecutive failed login attempts, THEN THE Auth_Store SHALL lock the account for exactly 15 minutes, reject further login attempts during that period with an error message indicating the lockout duration, and reset the failure count to 0 upon successful authentication.
5. THE App SHALL never log JWT values, Refresh_Token values, broker credentials, or personally identifiable information in production builds; `__DEV__` guards SHALL surround all diagnostic console output.
6. IF an HTTP request made by THE API_Client does not receive a complete response within 15 seconds, THEN THE API_Client SHALL cancel the request and surface an error message indicating a request timeout to the user.
7. WHEN the user logs out, THE App SHALL delete all tokens from SecureStore, reset all in-memory stores, and disconnect the WebSocket_Service within 2 seconds of the logout action being confirmed.
8. THE RegisterScreen and LoginScreen SHALL transmit passwords exclusively over TLS; no plain-text password SHALL be stored on device at any point.
9. WHERE broker credentials (PAT, MT5 login/password) are entered, THE AccountsScreen SHALL use `secureTextEntry` on password fields and SHALL NOT retain credential values in component state after the form submission response is received.
10. IF THE App is placed into the background for more than 15 minutes while a user session is active, THEN THE App SHALL invalidate the in-memory session state and require the user to re-authenticate upon returning to the foreground.

---

### Requirement 19: Offline and Network Resilience

**User Story:** As a user who may have intermittent connectivity, I want the App to handle network interruptions gracefully, so that it does not crash or show confusing blank states.

#### Acceptance Criteria

1. WHEN the device loses internet connectivity, THE NetworkBanner component SHALL appear at the top of all MainTabNavigator screens displaying "No internet connection".
2. WHEN internet connectivity is restored, THE NetworkBanner SHALL dismiss automatically within 1 second.
3. IF an API call fails due to a network connectivity error (no reachable host, request timeout, or no internet) and previously loaded data exists in the relevant screen store, THEN THE screen SHALL preserve and display the stale data alongside a visible warning indicator consisting of an icon and a text label indicating the data may be outdated.
4. IF an API call fails due to a network connectivity error and no previously loaded data exists in the relevant screen store, THEN THE screen SHALL display a non-blank error state with a message indicating data could not be loaded and a retry action.
5. THE App SHALL use `@react-native-community/netinfo` to detect connectivity changes and drive the NetworkBanner visibility.

---

### Requirement 20: Animations and Motion Design

**User Story:** As a user, I want the App to feel responsive and polished through smooth animations, so that the experience is enjoyable and professional.

#### Acceptance Criteria

1. WHEN a list of SignalCards, TradeCards, or AccountCards renders, THE App SHALL animate each card in with a staggered entry delay of 80 milliseconds multiplied by the card's zero-based index, where each card transitions from opacity 0 to opacity 1 over 400 milliseconds.
2. WHEN any primary action button (login, register, purchase, connect) receives a press-in event, THE button SHALL scale to 0.96 of its original size; WHEN the press-out event is received, THE button SHALL return to a scale of 1.0 using a spring animation.
3. WHEN the DashboardScreen header renders, THE header SHALL begin at opacity 0 and a vertical offset of -20 points below its final position, then transition to opacity 1 and its final position using a spring animation with default spring configuration.
4. WHEN the AnimatedNumber component receives a new numeric `value` prop, THE component SHALL interpolate the displayed number from its previous value to the new value over exactly 400 milliseconds, updating the display at each animation frame.
5. THE App SHALL use `react-native-reanimated` for all animations; no `Animated` API from React Native core SHALL be used for new animations.
6. IF haptic feedback is enabled in Settings, THEN WHEN a tab press event occurs, THE App SHALL trigger a light impact haptic feedback event.
7. IF haptic feedback is enabled in Settings, THEN WHEN a connect or purchase action completes successfully, THE App SHALL trigger a success notification haptic feedback event.

---

### Requirement 21: Accessibility

**User Story:** As a user with accessibility needs, I want all interactive elements to be properly labelled and usable with assistive technologies, so that the App is inclusive.

#### Acceptance Criteria

1. THE App SHALL provide an `accessibilityLabel` prop on every `Pressable`, `TouchableOpacity`, `Switch`, and `TextInput` element that describes its purpose in plain language, where the label text is between 1 and 40 characters and uniquely identifies the element's purpose within its screen context.
2. THE App SHALL provide an `accessibilityRole` prop on all interactive elements: `button` for tappable actions, `tab` for period filter chips, `switch` for toggles, and `header` for screen title text.
3. WHEN a form field has a validation error, THE App SHALL set `accessibilityState={{ invalid: true }}` on that field and provide an `accessibilityHint` referencing the associated error message text so that a screen reader announces the error when the field receives focus.
4. THE App SHALL maintain a minimum touch target size of 44×44 points for all interactive elements, applied via padding or a minimum width/height constraint, regardless of the visual size of the element's content.
5. WHEN the App displays colour-coded information (e.g., green for profit, red for loss), THE App SHALL also render a visible text label or icon adjacent to the colour indicator that conveys the same meaning without relying on colour alone.
6. IF an interactive element receives focus via a screen reader, THEN THE App SHALL announce the element's `accessibilityLabel` and `accessibilityRole` without requiring any additional user gesture.

---

### Requirement 22: CI/CD and Build Pipeline

**User Story:** As a developer, I want code pushed to the main branch to automatically run tests and trigger an EAS build, so that I can catch regressions early and deliver builds without manual steps.

#### Acceptance Criteria

1. WHEN code is pushed to the `main` branch or a pull request targets `main`, THE CI/CD pipeline SHALL run `npm test -- --passWithNoTests --forceExit` and fail the pipeline if any test exits with a non-zero status code.
2. WHEN all tests pass on a push to the `main` branch, THE CI/CD pipeline SHALL trigger an EAS development build for Android using `eas build --platform android --profile development --non-interactive`.
3. WHEN a build is triggered on a pull request, THE CI/CD pipeline SHALL post a comment on the PR containing the EAS build dashboard URL within 60 seconds of the build being queued.
4. THE CI/CD pipeline SHALL inject `EXPO_PUBLIC_API_BASE_URL` into each build by reading the value from the corresponding `eas.json` build profile (development, preview, production), and the build SHALL fail if the variable is absent or empty.
5. THE CI/CD pipeline SHALL set up the EAS CLI using `expo/expo-github-action@v8` with `eas-version: latest` before any `eas` command is executed.
6. THE EAS build profile `production` SHALL set `buildType` to `app-bundle` for the Android platform targeting Play Store submission and set `buildType` to `archive` for the iOS platform targeting App Store submission.
7. IF the EAS build command exits with a non-zero status code, THEN THE CI/CD pipeline SHALL fail the workflow and surface the EAS error output in the pipeline logs.

---

### Requirement 23: Developer Experience (Expo Go)

**User Story:** As a developer, I want to preview UI changes instantly on my physical device using Expo Go during development, so that I can iterate quickly without rebuilding.

#### Acceptance Criteria

1. THE App SHALL start with `expo start` and be fully renderable in Expo Go for all screens that do not depend on native-only modules (react-native-purchases).
2. WHERE a native-only module (Subscription_Service, RevenueCat) is unavailable in Expo Go, THE App SHALL fall back gracefully to stub behaviour without crashing, where stub behaviour means returning hardcoded default values (e.g., subscription status: inactive, no active entitlements) without throwing an exception or displaying an unhandled error screen.
3. THE App SHALL use `EXPO_PUBLIC_*` environment variables for all runtime configuration, ensuring values are accessible during both Expo Go sessions and EAS builds; any screen or service that reads runtime configuration and receives an undefined `EXPO_PUBLIC_*` value SHALL display an error message indicating the missing variable name and halt further initialisation of that screen or service.
4. WHEN running in `__DEV__` mode, THE App SHALL log the API base URL and endpoint being called for each request to assist debugging, without logging auth token values.
5. IF a required `EXPO_PUBLIC_*` environment variable is undefined at startup, THEN THE App SHALL display an error message indicating which variable is missing and prevent app initialisation from completing.

---

### Requirement 24: Testing Coverage

**User Story:** As a developer, I want the critical business logic to be covered by automated tests, so that regressions are detected before deployment.

#### Acceptance Criteria

1. THE Auth_Store SHALL have unit tests covering: successful login populates `user` and `token`; failed login increments `failedAttempts`; three consecutive failures set a lockout timestamp (subsequent failures do not overwrite the existing timestamp); logout clears `user`, `token`, `failedAttempts`, and `lockoutUntil`.
2. WHEN `markExpiredSignals` is called on the Signal_Store, THE Signal_Store SHALL mark as `expired` every signal whose `generatedAt` timestamp is more than 900000 milliseconds before the current time, and this SHALL be verified by a property-based test with generated timestamps spanning both sides of the 900000ms boundary.
3. WHEN `closeTrade` is called on the Trade_Store with a valid trade ID, THE Trade_Store SHALL remove the position from `openPositions`, add a corresponding entry to `closedTrades`, and record the exit price and P&L calculated as `(exitPrice - entryPrice) × quantity × direction`.
4. IF `closeTrade` is called with a trade ID not present in `openPositions`, THEN THE Trade_Store SHALL leave all state unchanged and return an error indicator.
5. THE `useAuth` hook SHALL have unit tests covering: email validation rejects values missing `@`, values missing a domain after `@`, and empty strings; valid credentials invoke the Auth_Service login method; biometric fallback returns false when no stored token exists.
6. THE P&L calculation helpers SHALL have property-based tests asserting: `totalPnl` equals the sum of individual position P&Ls; `winRate` equals the count of positions with `pnl > 0` divided by the total count of closed positions and is always in the range `[0, 1]`.
7. THE signal expiry property-based test SHALL assert: for any `generatedAt` timestamp, `isExpired` is `true` if and only if the current time minus `generatedAt` exceeds 900000 milliseconds (15 minutes).
8. THE test suite SHALL be runnable with `npm test` using Jest and `jest-expo` without requiring a network connection or native device.

---

### Requirement 25: Error Handling and Crash Recovery

**User Story:** As a user, I want the App to recover gracefully from unexpected errors, so that a crash in one screen does not destroy my entire session.

#### Acceptance Criteria

1. THE MainTabNavigator SHALL be wrapped in an ErrorBoundary component that catches unhandled React render errors.
2. WHEN the ErrorBoundary catches an error, THE ErrorBoundary SHALL display a fallback UI that contains a visible error message indicating that something went wrong and a tappable "Reload" button, without displaying raw stack traces, internal error objects, or server-side exception details.
3. WHEN the user taps the "Reload" button in the ErrorBoundary fallback UI, THE ErrorBoundary SHALL remount the failed screen subtree and restore the MainTabNavigator to its pre-error navigational state.
4. IF the application is running in `__DEV__` mode AND the ErrorBoundary catches an error, THEN THE ErrorBoundary SHALL log the error name, message, and component stack to the development console.
5. WHEN an API call returns a 5xx response, THE affected screen SHALL replace its content area with an error message indicating that a server error occurred and a tappable "Retry" button that re-initiates the same API call.
6. THE App SHALL not display raw stack traces, internal error objects, or server-side exception details to end users in production builds.

---

### Requirement 26: Legal and Compliance

**User Story:** As a user and as the product owner, I want the App to comply with relevant legal requirements, so that there are no liability issues from the product's operation.

#### Acceptance Criteria

1. THE App SHALL display a "Privacy Policy" link and a "Terms of Service" link in the SettingsScreen's "About" section; WHEN the user taps either link, THE App SHALL open the corresponding document within 2 seconds in the device's default browser.
2. THE PaywallScreen SHALL display a persistently visible disclaimer — not hidden behind a scroll or modal — stating that trading involves risk and past AI performance does not guarantee future results.
3. THE App SHALL not persist broker credentials (PAT, MT5 password) to SecureStore, AsyncStorage, logs, analytics events, or crash reports; credential values SHALL exist only in memory for the duration of the form submission request lifecycle and SHALL be discarded immediately after the API response is received.
4. WHEN displaying trading signals or performance data, THE App SHALL render a visible disclaimer on the same screen stating that the information is for informational purposes only and does not constitute financial advice.
5. IF the app is running on iOS and a subscription purchase is initiated, THEN the purchase SHALL be processed exclusively through Apple In-App Purchase via RevenueCat and no alternative payment path SHALL be presented.
6. IF the app is running on Android and a subscription purchase is initiated, THEN the purchase SHALL be processed exclusively through Google Play Billing via RevenueCat and no alternative payment path SHALL be presented.
