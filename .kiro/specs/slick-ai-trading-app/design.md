# Technical Design Document — Slick AI Trading App

## Phases 7–11: OAuth, Paywall, WebSocket Hardening, Push Notifications, UX Polish, Accessibility, Testing, CI/CD

---

## Overview

Slick AI is an AI-powered trading companion for retail forex traders, built with Expo ~54, React Native, and TypeScript targeting iOS and Android. Phases 0–6 are complete: the navigation graph, Zustand stores, Socket.IO service, all screens, design tokens, and core components are in place. This document covers the remaining phases (7–11) needed to ship:

- **Phase 7**: Google OAuth and Apple Sign-In
- **Phase 8**: Subscription paywall (RevenueCat / react-native-purchases)
- **Phase 9**: WebSocket hardening (AppState lifecycle, axios 401 interceptor)
- **Phase 10**: Push notification registration and deep-link handling
- **Phase 11**: UX polish, accessibility labels, test coverage, CI/CD pipeline

### Key Research Findings

1. **`expo-in-app-purchases` is deprecated** — last released ~2022, removed from Expo's recommended libraries list. The current Expo-endorsed approach for in-app purchases is [`react-native-purchases`](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial) (RevenueCat). This design uses RevenueCat instead of `expo-in-app-purchases` as stated in the requirements, since RevenueCat handles server-side receipt validation, restoring purchases, subscription status, and cross-platform parity in a single SDK. The `POST /subscriptions/verify` backend endpoint becomes redundant — RevenueCat's SDK validates receipts directly with the stores and exposes entitlements.

2. **Push notifications on Android require a dev build from SDK 53+** — `expo-notifications` remote push tokens (`getExpoPushTokenAsync`) are not available in Expo Go on Android. Local notifications still work. The `getExpoPushTokenAsync` call requires the `projectId` from `app.json` / `Constants.expoConfig.extra.eas.projectId`.

3. **`expo-auth-session`** `Google.useAuthRequest` from `expo-auth-session/providers/google` is the standard managed-workflow Google OAuth flow. It opens a native browser session and requires `scheme` configured in `app.json`.

4. **`expo-apple-authentication`** uses `AppleAuthentication.signInAsync({ requestedScopes: [EMAIL, FULL_NAME] })` and the `AppleAuthentication.AppleAuthenticationButton` component. It is iOS-only; the component must be conditionally rendered.

---

## Architecture

### System Topology

```
┌──────────────────────────────────────────────────────┐
│                  Expo / React Native App              │
│                                                      │
│  ┌─────────────┐   ┌──────────────┐  ┌───────────┐  │
│  │  Navigation │   │ Zustand State│  │  Services │  │
│  │  (React     │   │    Stores    │  │  (Axios + │  │
│  │   Nav v7)   │   │              │  │ Socket.IO)│  │
│  └──────┬──────┘   └──────┬───────┘  └─────┬─────┘  │
│         └─────────────────┴────────────────┘        │
│                      Hooks Layer                     │
└─────────────────────────────┬────────────────────────┘
                              │ HTTPS / WSS
             ┌────────────────┼────────────────┐
             │                │                │
    ┌────────▼──────┐ ┌───────▼──────┐ ┌──────▼────────┐
    │  REST Backend  │ │  Socket.IO   │ │  Expo Push    │
    │  /auth /trades │ │  (signals,   │ │  Notification │
    │  /accounts     │ │  positions,  │ │  Service      │
    │  /signals      │ │  trades)     │ │  (FCM / APNs) │
    └────────────────┘ └──────────────┘ └───────────────┘
             │
    ┌────────▼──────────────┐
    │  RevenueCat SDK       │
    │  (App Store / Play    │
    │   receipt validation) │
    └───────────────────────┘
```

### Layered Architecture

| Layer | Files | Responsibility |
|---|---|---|
| **Entry** | `App.tsx`, `index.ts` | Mount `GestureHandlerRootView` → `RootNavigator` |
| **Navigation** | `src/navigation/` | Route orchestration, deep-link handling |
| **Screens** | `src/screens/` | UI, user interaction, local screen state |
| **Hooks** | `src/hooks/` | Composable logic connecting stores + services |
| **Stores** | `src/store/` | Global reactive state (Zustand) |
| **Services** | `src/services/` | Network, WebSocket, notifications, IAP |
| **Config** | `src/config/api.ts` | Environment-aware URLs and endpoints |
| **Theme** | `src/theme/index.ts` | Design tokens (COLORS, FONTS, RADIUS, SPACING) |

---

## Components and Interfaces

### Navigation Structure

```
App.tsx
└── GestureHandlerRootView
    └── RootNavigator
        ├── SplashScreen (inline, ≥1800ms)
        ├── OnboardingScreen (first-launch only)
        └── NavigationContainer
            ├── AuthNavigator (Stack)
            │   ├── LoginScreen
            │   └── RegisterScreen
            ├── PaywallScreen (modal stack, no subscription)
            └── MainTabNavigator (Tab)
                ├── DashboardScreen
                ├── SignalsScreen
                ├── TradeHistoryScreen
                ├── AccountsScreen
                └── SettingsScreen
```

#### Navigation Type Declarations

```typescript
// src/navigation/types.ts
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Signals: undefined;
  Trades: undefined;
  Accounts: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Paywall: undefined;
};
```

### Phase 7: OAuth and Apple Sign-In Components

#### `GoogleSignInButton`

```typescript
// src/components/auth/GoogleSignInButton.tsx
// Uses expo-auth-session/providers/google → Google.useAuthRequest()
// Props: onSuccess(idToken: string), onError(err: Error)
```

- Calls `Google.useAuthRequest({ iosClientId, androidClientId, webClientId })` from `expo-auth-session/providers/google`
- On `response?.type === 'success'`, extracts `id_token` from `response.params` (or exchanges `code` via PKCE)
- Posts `id_token` to `POST /auth/google` via `authService.loginWithGoogle(idToken)`
- Requires `scheme` set in `app.json` for redirect URI

#### `AppleSignInButton`

```typescript
// src/components/auth/AppleSignInButton.tsx
// Platform.OS === 'ios' only — renders null on Android
// Uses AppleAuthentication.AppleAuthenticationButton
// and AppleAuthentication.signInAsync()
```

- Renders `AppleAuthentication.AppleAuthenticationButton` with `buttonType=SIGN_IN`, `buttonStyle=BLACK`, explicit `style={{ width, height: 44 }}`
- Calls `AppleAuthentication.signInAsync({ requestedScopes: [EMAIL, FULL_NAME] })`
- On success, posts `credential.identityToken` to `POST /auth/apple`
- Handles `ERR_CANCELED` silently; shows error banner for other failures

#### Updated `authService`

```typescript
// New methods added to src/services/authService.ts
loginWithGoogle: async (idToken: string): Promise<LoginResponse>
loginWithApple: async (identityToken: string, email: string | null): Promise<LoginResponse>
```

### Phase 7: `authStore` — OAuth Fields

The `AuthUser` interface extends to carry OAuth provider metadata:

```typescript
export interface AuthUser {
  userId: string;
  email: string;
  provider?: 'email' | 'google' | 'apple';
}
```

### Phase 8: Subscription / Paywall Components

> **Library choice: `react-native-purchases` (RevenueCat)**
> `expo-in-app-purchases` is deprecated. RevenueCat's SDK handles store validation, purchase restoration, and entitlement checking in one call. It also eliminates the need for the `POST /subscriptions/verify` backend endpoint.

#### `subscriptionService`

```typescript
// src/services/subscriptionService.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const subscriptionService = {
  configure: (userId: string) => void,
  getOfferings: async (): Promise<PurchasesOfferings>,
  purchasePackage: async (pkg: PurchasesPackage): Promise<CustomerInfo>,
  restorePurchases: async (): Promise<CustomerInfo>,
  getCustomerInfo: async (): Promise<CustomerInfo>,
  hasActiveEntitlement: (info: CustomerInfo, entitlement: string): boolean,
};
```

RevenueCat entitlement key: `"pro"` (maps to Monthly, Quarterly, Yearly product IDs).

#### `subscriptionStore`

```typescript
// src/store/subscriptionStore.ts (new)
interface SubscriptionState {
  isSubscribed: boolean;
  planName: string | null;       // 'Monthly' | 'Quarterly' | 'Yearly'
  expiresAt: string | null;      // ISO 8601
  isLoading: boolean;
  error: string | null;

  setSubscription(info: CustomerInfo): void;
  clearSubscription(): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
}
```

#### `PaywallScreen`

```typescript
// src/screens/paywall/PaywallScreen.tsx
```

- Fetches current offerings via `subscriptionService.getOfferings()`
- Renders three `PlanCard` components (Monthly / Quarterly / Yearly)
- Computes savings % relative to monthly equivalent: `Math.round((1 - planMonthlyEquivalent / monthlyPrice) * 100)`
- Highlights the Quarterly plan with a "BEST VALUE" badge by default
- "Subscribe" CTA → `subscriptionService.purchasePackage(selectedPackage)` → on success, call `subscriptionStore.setSubscription(customerInfo)` and navigate to `MainTabNavigator`
- "Restore Purchase" → `subscriptionService.restorePurchases()` → same success path
- On cancellation or error, stays on `PaywallScreen` and shows inline error banner

#### `RootNavigator` — Paywall Gate

After `loadStoredAuth()` succeeds and `isAuthenticated === true`, the navigator calls `subscriptionService.getCustomerInfo()` and checks the `"pro"` entitlement. If the entitlement is not active, it renders `PaywallScreen` instead of `MainTabNavigator`.

```
isAuthenticated
  ├── false → AuthNavigator
  └── true
        ├── hasProEntitlement → MainTabNavigator
        └── !hasProEntitlement → PaywallScreen
```

### Phase 9: WebSocket Hardening

#### AppState Lifecycle Integration

A new hook `useAppStateWebSocket` is added to `src/hooks/useAppStateWebSocket.ts`:

```typescript
// Listens to AppState changes
// 'active': call websocketService.connect() if not connected
// 'background'/'inactive': call websocketService.pauseReconnect()
```

`websocketService` gains a `pauseReconnect()` method that sets `shouldBeConnected = false` temporarily without calling `disconnect()` (preserving the socket instance), and a `resumeReconnect()` that sets `shouldBeConnected = true` and triggers `_connect()` if not already connected. This prevents battery drain without losing the in-flight connection when briefly backgrounded.

This hook is mounted inside `AppContent` (inside `RootNavigator`), alongside the existing `useWebSocket()`.

#### Axios 401 Interceptor

A shared `createAuthenticatedClient` factory is added to `src/services/apiClient.ts`:

```typescript
// src/services/apiClient.ts
export function createAuthenticatedClient(baseURL: string): AxiosInstance
```

The interceptor logic:
1. On response error with `status === 401`, call `authService.refreshToken(storedRefreshToken)`
2. On success, call `useAuthStore.getState().login(user, newToken)` to persist and broadcast the new token, then retry the original request
3. On refresh failure, call `useAuthStore.getState().logout()` and navigate to `AuthNavigator`
4. Uses a `_isRetry` flag on the request config to prevent infinite retry loops

All three service clients (`authService`, `accountService`, `signalService`, `tradeService`) are refactored to use `createAuthenticatedClient` instead of their own `axios.create()` calls.

The interceptor needs access to the refresh token. It reads it from SecureStore directly (`SecureStore.getItemAsync('SlickAI_refresh_token')`) to avoid circular imports with the store.

#### Refresh Token Storage

`authStore` gains a `refreshToken` field and stores it in SecureStore under key `'SlickAI_refresh_token'`:

```typescript
// Additional SecureStore keys
const SECURE_STORE_REFRESH_KEY = 'SlickAI_refresh_token';
// login/register actions store refreshToken alongside token
```

### Phase 10: Push Notification Wiring

#### Updated `notificationService`

```typescript
// Additions to src/services/notificationService.ts

registerPushToken: async (authToken: string): Promise<void>
// 1. Call Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })
// 2. POST /notifications/register with { token, platform: Platform.OS }
// 3. Requires dev build on Android (not available in Expo Go from SDK 53+)

addNotificationResponseListener: (handler: (response: NotificationResponse) => void): Subscription
removeNotificationResponseListener: (subscription: Subscription): void
```

#### Deep-Link Handling

In `RootNavigator`, a `notificationResponseListener` is registered on mount:

```typescript
Notifications.addNotificationResponseListener((response) => {
  const data = response.notification.request.content.data;
  if (data.type === 'signal') {
    navigationRef.current?.navigate('Main', { screen: 'Signals' });
  } else if (data.type === 'trade_executed' || data.type === 'trade_closed') {
    navigationRef.current?.navigate('Main', { screen: 'Trades' });
  }
});
```

This requires a `navigationRef` created with `createNavigationContainerRef<RootStackParamList>()` and passed to `NavigationContainer`.

#### Push Token Registration Flow

Registered immediately after `login` / `register` / `loginWithGoogle` / `loginWithApple` succeeds in `useAuth`:

```typescript
// Inside useAuth.login() success path:
const pushToken = await notificationService.getPushToken();
if (pushToken) {
  await notificationService.registerPushToken(token); // JWT token from auth
}
```

### Phase 11: Network Resilience, Accessibility, Error Boundary

#### `NetworkBanner`

```typescript
// src/components/NetworkBanner.tsx
// Uses @react-native-community/netinfo to monitor connectivity
// Renders a persistent bottom banner: "No internet connection"
// When connection restores, auto-dismisses and triggers websocketService.connect()
```

#### `ErrorBoundary`

```typescript
// src/components/ErrorBoundary.tsx
// Class component wrapping MainTabNavigator
// On unhandled JS error: renders error screen with "Restart" button
// "Restart" calls Updates.reloadAsync() from expo-updates
```

#### `formatCurrency` helper

```typescript
// src/utils/formatCurrency.ts
export function formatCurrency(value: number, currency = 'USD'): string
// value >= 1_000_000 → "{n}M"
// value >= 1_000     → "{n}K"
// otherwise          → "{n}"
// Respects sign (negative values: "-{n}K")
```

#### Accessibility Additions

All `Pressable`, `Switch`, and `TextInput` components across all screens receive:
- `accessibilityLabel` — concise description
- `accessibilityHint` — on Pressables with non-obvious actions
- `accessibilityRole="button"` — on all Pressable buttons
- `accessibilityRole="tab"` — on period filter tabs and filter chips
- `accessibilityState={{ checked }}` — on all Switch components

#### Background Re-authentication (Req 20.5)

A new hook `useBackgroundLockout` in `src/hooks/useBackgroundLockout.ts`:
- Records the timestamp when the app enters background via `AppState`
- On returning to foreground, if elapsed > 15 minutes AND biometric is available AND user is authenticated, navigates to a `BiometricGateScreen` (modal) that requires biometric or password re-authentication before dismissing

---

## Data Models

### Core TypeScript Interfaces

All existing models remain unchanged. New/extended models for phases 7–11:

```typescript
// src/store/authStore.ts — extended
export interface AuthUser {
  userId: string;
  email: string;
  provider?: 'email' | 'google' | 'apple';  // NEW
}

export interface AuthState {
  // existing fields...
  refreshToken: string | null;   // NEW — stored in SecureStore
  login: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>;
}
```

```typescript
// src/store/subscriptionStore.ts — NEW
export interface SubscriptionState {
  isSubscribed: boolean;
  planName: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  setSubscription: (info: CustomerInfo) => void;
  clearSubscription: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

```typescript
// Savings calculation type (PaywallScreen internal)
interface PlanOption {
  id: string;
  title: 'Monthly' | 'Quarterly' | 'Yearly';
  price: number;         // full billing price
  monthlyEquivalent: number;
  savingsPercent: number; // relative to monthly plan
  isRecommended: boolean;
  rcPackage: PurchasesPackage;
}
```

### API Contracts

#### New Endpoints (Phases 7–10)

| Method | Path | Request | Response |
|---|---|---|---|
| `POST` | `/auth/google` | `{ idToken: string }` | `{ user, token, refreshToken }` |
| `POST` | `/auth/apple` | `{ identityToken: string, email: string \| null }` | `{ user, token, refreshToken }` |
| `POST` | `/auth/refresh` | `{ refreshToken: string }` | `{ token: string }` |
| `POST` | `/notifications/register` | `{ token: string, platform: 'ios' \| 'android' }` | `{ success: true }` |

> Note: `POST /subscriptions/verify` is no longer needed — RevenueCat handles receipt validation server-side. The backend can optionally listen to RevenueCat webhooks for subscription lifecycle events.

#### Existing Endpoints (unchanged)

All endpoints in `src/config/api.ts` remain as-is. The `ENDPOINTS` object gains:

```typescript
export const ENDPOINTS = {
  // ...existing...
  auth: {
    login:    '/auth/login',
    register: '/auth/register',
    refresh:  '/auth/refresh',
    biometric:'/auth/biometric',
    google:   '/auth/google',    // NEW
    apple:    '/auth/apple',     // NEW
  },
  notifications: {
    register: '/notifications/register',  // was flat, now namespaced
  },
} as const;
```

---

## State Management

### Zustand Store Map

```
useAuthStore         — JWT, user, failed attempts, lockout, OAuth provider
useAccountStore      — connected broker accounts, subscription mode
useSignalStore       — live and historical signals, expiry logic
useTradeStore        — open positions, closed trades, performance summary
useSubscriptionStore — RevenueCat entitlement status, plan name, expiry (NEW)
```

### State Flow: Authentication

```
App launch
  → loadStoredAuth()        (reads SecureStore → sets token + user in authStore)
  → notificationService.initialize()
  → parallel completion
  → isAuthenticated?
      NO  → AuthNavigator (Login / Register / Google / Apple)
      YES → subscriptionService.getCustomerInfo()
                → hasProEntitlement?
                    NO  → PaywallScreen
                    YES → MainTabNavigator
```

### State Flow: Purchase

```
PaywallScreen
  → getOfferings()          (RevenueCat SDK)
  → user selects plan
  → purchasePackage(pkg)    (RevenueCat SDK → native store sheet)
  → CustomerInfo returned
  → subscriptionStore.setSubscription(info)
  → navigate to MainTabNavigator
```

### State Flow: WebSocket Events

```
Socket.IO event arrives
  → websocketService._emit(eventType, data)
  → useWebSocket listener
      signal          → signalStore.addSignal() + local notification
      trade_executed  → tradeStore.addTrade() + local notification
      trade_closed    → tradeStore.closeTrade() + local notification
      position_update → tradeStore.updatePosition()
```

---

## Error Handling

### Authentication Errors

| Scenario | Handling |
|---|---|
| Invalid credentials | `incrementFailedAttempts()`; show inline error |
| 3 failed attempts | `lockedUntil = now + 15min`; render lockout countdown |
| OAuth cancelled | `ERR_CANCELED` caught silently; no error banner |
| OAuth failed | Error banner shown; stays on LoginScreen |
| Token expired (HTTP 401) | Axios interceptor auto-refreshes token and retries |
| Refresh also fails (HTTP 401) | `logout()` + navigate to AuthNavigator |

### Purchase Errors

| Scenario | Handling |
|---|---|
| User cancels purchase | Returns to PaywallScreen with no error (cancelled = expected) |
| Store error / network failure | PaywallScreen inline error banner |
| Restore finds no purchases | Info message "No active subscription found" |

### WebSocket Errors

| Scenario | Handling |
|---|---|
| Initial connect failure | `_scheduleReconnect()` with exponential backoff (3s × min(attempts, 5)) |
| Max reconnect attempts (10) | Stop retrying; show persistent "Connection lost" banner |
| App goes background | `pauseReconnect()` — no new reconnect attempts |
| App returns to foreground | `resumeReconnect()` + immediate connect attempt |

### Network Errors

| Scenario | Handling |
|---|---|
| No internet | `NetworkBanner` shown at bottom of screen |
| Connection restored | Banner auto-dismisses; WebSocket reconnect triggered |
| API timeout (15s) | Error surfaced to screen's error banner |
| Unhandled JS error | `ErrorBoundary` catches → graceful error screen with "Restart" |

---

## Testing Strategy

### Unit Tests (Jest + `@testing-library/react-native`)

**`jest.config.js`** configures:
- `preset: 'jest-expo'`
- `moduleNameMapper` for all `expo-*` and `@expo/*` packages (mock implementations)
- TypeScript path resolution via `moduleDirectories: ['node_modules', 'src']`

**`authStore`** unit tests:
- Successful `login()` sets `isAuthenticated = true` and writes to SecureStore
- Failed login increments `failedAttempts`
- 3rd failure sets `lockedUntil` to ~15 minutes in the future
- `isLockedOut()` returns true while `lockedUntil > now`
- `logout()` clears SecureStore and resets all fields

**`signalStore`** unit tests:
- `markExpiredSignals()` marks signals with `generatedAt` older than 15 min as `expired`
- Signals within 15 minutes remain unchanged

**`tradeStore`** unit tests:
- `closeTrade(id, exitPrice, pnl)` removes from `openPositions` and updates `trades`
- `updatePosition(id, updates)` mutates only the matching position

**`accountStore`** unit tests:
- `addAccount()`, `removeAccount()`, `setSubscriptionMode()` actions

**`subscriptionStore`** unit tests:
- `setSubscription()` with active CustomerInfo sets `isSubscribed = true`
- `setSubscription()` with expired CustomerInfo sets `isSubscribed = false`

**`formatCurrency`** unit tests:
- `formatCurrency(999)` → `"999"`
- `formatCurrency(1000)` → `"1K"`
- `formatCurrency(1_500_000)` → `"1.5M"`
- `formatCurrency(-2500)` → `"-2.5K"`

**`AuthNavigator`** integration tests:
- Tapping "Register" on LoginScreen navigates to RegisterScreen
- Back affordance returns to LoginScreen

### Property-Based Tests (fast-check)

The property-based testing library chosen is **`fast-check`** — actively maintained, TypeScript-first, works in Jest without additional setup. Each property runs a minimum of **100 iterations**.

See Correctness Properties section below for the full list. Each property test is tagged:
`// Feature: slick-ai-trading-app, Property {N}: {property text}`

### Integration Tests

- WebSocket event routing (mock Socket.IO, emit events, assert store mutations)
- 401 refresh interceptor (mock axios, assert retry with new token)
- Push token registration (mock Notifications, assert POST to backend)

---

## CI/CD Pipeline

### EAS Build Profiles (`eas.json`)

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "distribution": "internal",
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleDebug" },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://dev-api.slickai.com" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleRelease" },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://staging-api.slickai.com" }
    },
    "production": {
      "distribution": "store",
      "android": { "buildType": "app-bundle" },
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.slickai.com" }
    }
  }
}
```

### GitHub Actions Workflow (`.github/workflows/android-build.yml`)

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test -- --passWithNoTests --forceExit
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: eas build --platform android --profile development --non-interactive
        env: { EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }} }
      - uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ EAS build triggered. Check https://expo.dev/accounts/[org]/projects/slickai/builds'
            })
```

### ProGuard Rules (`android/app/proguard-rules.pro`)

```
-keep class com.facebook.react.** { *; }
-keep class io.socket.** { *; }
-keep class okhttp3.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn io.socket.**
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Email Validation Consistency

*For any* string `s`, the email validation function returns `true` if and only if `s` matches the pattern `[^\s@]+@[^\s@]+\.[^\s@]+`. Any string accepted by the validator must have exactly this structure; any string rejected must fail to match.

**Validates: Requirements 3.1**

### Property 2: Password Length Boundary

*For any* string `s`, `isValidPassword(s)` returns `true` if and only if `s.length >= 8`. No string shorter than 8 characters passes validation; no string of 8+ characters fails solely on length.

**Validates: Requirements 3.2**

### Property 3: Password Confirmation Symmetry

*For any* two strings `a` and `b`, the passwords-match validator returns `true` if and only if `a === b`. The relation is symmetric: if `passwordsMatch(a, b)` then `passwordsMatch(b, a)`.

**Validates: Requirements 3.3**

### Property 4: Auth Session Round-Trip Persistence

*For any* valid JWT string stored via `authStore.login(user, token)`, a subsequent call to `authStore.loadStoredAuth()` restores the same JWT to `authStore.token`. No data is lost or corrupted during the SecureStore write/read cycle.

**Validates: Requirements 3.10, 20.1**

### Property 5: Failed-Attempt Counter Monotonicity

*For any* sequence of `n` consecutive failed login attempts (where `n < 3`), `authStore.failedAttempts === n`. The counter never decreases without an explicit `resetFailedAttempts()` call, and never exceeds 3 before triggering lockout.

**Validates: Requirements 3.7, 3.8**

### Property 6: Lockout Gate Invariant

*For any* `lockedUntil` timestamp strictly greater than `Date.now()`, `authStore.isLockedOut()` returns `true` and no login action proceeds. *For any* `lockedUntil` timestamp in the past or null, `isLockedOut()` returns `false`.

**Validates: Requirements 3.8, 3.9**

### Property 7: Subscription Access Gate

*For any* `CustomerInfo` object where the `"pro"` entitlement is active and `expiresDate` is in the future, `subscriptionStore.isSubscribed` is `true` and the app navigates to `MainTabNavigator`. *For any* `CustomerInfo` where the entitlement is absent or `expiresDate` is in the past, `isSubscribed` is `false` and the app renders `PaywallScreen`.

**Validates: Requirements 7.9, 7.10**

### Property 8: Subscription Savings Percentage Correctness

*For any* three plan prices (monthly `m`, quarterly `q`, yearly `y` where all are positive), the savings percentage for each plan relative to the monthly-equivalent price is `Math.round((1 - planMonthlyEquivalent / m) * 100)`. For the monthly plan, savings is always 0%; for quarterly and yearly, savings is always non-negative.

**Validates: Requirements 7.3**

### Property 9: WebSocket Singleton

*For any* sequence of `connect()` calls on `websocketService`, at most one active `Socket` instance exists at any time. Calling `connect()` when already connected is a no-op; the existing socket is reused and no duplicate is created.

**Validates: Requirements 11.1**

### Property 10: WebSocket Event Routing Completeness

*For any* `Trade` object `t` emitted as a `trade_executed` WebSocket event, `tradeStore.trades` contains an entry equal to `t` after the event is processed. *For any* `Trade` object emitted as `trade_closed`, the matching entry in `openPositions` is removed. *For any* `OpenPosition` emitted as `position_update`, the matching entry's `unrealizedPnl` is updated to the new value.

**Validates: Requirements 11.4, 11.5, 11.6**

### Property 11: Signal Expiry Time Invariant

*For any* `generatedAt` ISO timestamp string, `isSignalExpired(generatedAt)` returns `true` if and only if `Date.now() - new Date(generatedAt).getTime() > 15 * 60 * 1000`. No signal is marked expired before its window elapses; no signal that has surpassed its window remains non-expired after `markExpiredSignals()` is called.

**Validates: Requirements 10.4, 18.7**

### Property 12: Performance Summary Aggregate Correctness

*For any* array of `Closed_Trade` objects with individual `profitLoss` values, `performanceSummary.totalPnl` equals the arithmetic sum of all individual P&L values, and `performanceSummary.winRate` is in the range `[0, 1]` (where a "win" is any trade with `profitLoss > 0`).

**Validates: Requirements 18.6**

### Property 13: Currency Formatter Suffix Invariant

*For any* number `n`:
- If `Math.abs(n) >= 1_000_000`, `formatCurrency(n)` contains `"M"` and not `"K"`
- If `Math.abs(n) >= 1_000` and `< 1_000_000`, `formatCurrency(n)` contains `"K"` and not `"M"`
- If `Math.abs(n) < 1_000`, `formatCurrency(n)` contains neither `"K"` nor `"M"`
- If `n < 0`, `formatCurrency(n)` begins with `"-"`

**Validates: Requirements 15.4**

### Property 14: Axios Auth Header Injection

*For any* JWT string `token` passed to `service.setAuthToken(token)`, every subsequent HTTP request made by that service instance carries the header `Authorization: Bearer {token}`. No authenticated request is ever sent without this header.

**Validates: Requirements 20.3**
