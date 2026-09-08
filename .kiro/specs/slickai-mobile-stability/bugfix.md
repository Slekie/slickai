# Bugfix Requirements Document

## Introduction

Two bugs in the Slick AI React Native app (`slickai/`) will prevent the app from
running correctly on a physical device. The first is a compile-time and runtime
crash caused by referencing an undeclared variable (`wsConnected`) in
`DashboardScreen`. The second is a behavioural defect in `PaywallScreen` where the
Log Out button uses an incomplete logout path that leaves stale data in all Zustand
stores and keeps the WebSocket connection open between sessions.

Together these issues will either crash the app immediately on the Dashboard tab or
leave the app in a corrupted state after a paywall logout, potentially leaking one
user's trade and signal data into a subsequent session.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — `wsConnected` undeclared in DashboardScreen**

1.1 WHEN the app compiles `DashboardScreen.tsx` THEN the TypeScript compiler
    reports a "Cannot find name 'wsConnected'" error, blocking the build.

1.2 WHEN the compiled bundle reaches the Dashboard render path at runtime THEN
    the JavaScript engine throws a `ReferenceError: wsConnected is not defined`,
    crashing the Dashboard screen.

1.3 WHEN `DashboardScreen` renders the header section THEN the LIVE indicator
    is never shown even when the WebSocket is connected, because `useWebSocket()`
    is not called and its `isConnected` value is never read.

---

**Bug 2 — PaywallScreen uses incomplete logout (bare `useAuthStore` instead of `useAuth` hook)**

2.1 WHEN the user taps "Log Out" on the PaywallScreen THEN only `authStore` state
    is cleared; the subscription, accounts, signals, and trades Zustand stores
    retain the previous user's data.

2.2 WHEN the user taps "Log Out" on the PaywallScreen THEN the WebSocket
    connection is NOT disconnected, leaving the socket open and continuing to
    deliver events for the previous user's session.

2.3 WHEN a second user logs in immediately after a PaywallScreen logout THEN the
    stale store data (open positions, signals, account list) from the first session
    is visible to the second user until their own data loads.

---

### Expected Behavior (Correct)

**Bug 1 — `wsConnected` fix**

2.1 WHEN `DashboardScreen` mounts THEN it SHALL call `useWebSocket()` and
    destructure `isConnected` as `wsConnected` so the variable is always defined.

2.2 WHEN the TypeScript compiler processes `DashboardScreen.tsx` THEN it SHALL
    find no "Cannot find name" errors related to `wsConnected`.

2.3 WHEN the WebSocket is connected THEN `DashboardScreen` SHALL display the
    LIVE indicator badge in the header.

2.4 WHEN the WebSocket is not connected THEN `DashboardScreen` SHALL hide the
    LIVE indicator without throwing any error.

---

**Bug 2 — PaywallScreen logout fix**

2.5 WHEN the user taps "Log Out" on the PaywallScreen THEN the app SHALL use
    the `useAuth().logout` action, which clears all Zustand stores
    (subscription, accounts, signals, trades, auth) before navigating away.

2.6 WHEN the user taps "Log Out" on the PaywallScreen THEN the WebSocket
    connection SHALL be disconnected as part of the logout sequence.

2.7 WHEN a second user logs in after a PaywallScreen logout THEN the second
    user SHALL see only their own data, with no residual state from the previous
    session.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the WebSocket is connected and the Dashboard is displayed THEN the app
    SHALL CONTINUE TO show trade data, open positions, and equity chart as before.

3.2 WHEN the user triggers a refresh on the Dashboard THEN the app SHALL CONTINUE
    TO reload positions, performance summary, and equity curve without errors.

3.3 WHEN the user logs out from `SettingsScreen` THEN the app SHALL CONTINUE TO
    use `useAuth().logout` (already correct) and all stores SHALL CONTINUE TO be
    cleared.

3.4 WHEN a valid subscription is detected on the PaywallScreen THEN the app SHALL
    CONTINUE TO navigate to the main dashboard without requiring logout.

3.5 WHEN the user is on the PaywallScreen and skips via the "Skip" button THEN
    the app SHALL CONTINUE TO navigate to the dashboard without triggering any
    logout or store reset.

3.6 WHEN the WebSocket receives `signal`, `trade_executed`, `trade_closed`, or
    `position_update` events THEN the app SHALL CONTINUE TO update the relevant
    Zustand stores via the `useWebSocket` hook in `RootNavigator`/`AppContent`.

---

## Bug Condition Pseudocode

### Bug 1 — Fix Checking

```pascal
FUNCTION isBugCondition_1(screen)
  INPUT: screen of type React component
  OUTPUT: boolean

  // Bug condition: DashboardScreen references wsConnected without declaring it
  RETURN screen = DashboardScreen
     AND wsConnected NOT IN declared_variables(screen)
END FUNCTION

// Property: Fix Checking — wsConnected must be declared
FOR ALL render WHERE isBugCondition_1(DashboardScreen) DO
  result ← render(DashboardScreen)
  ASSERT no_reference_error(result, 'wsConnected')
  ASSERT no_typescript_error(result, 'wsConnected')
END FOR

// Property: Preservation Checking
FOR ALL screen WHERE NOT isBugCondition_1(screen) DO
  ASSERT F(screen) = F'(screen)
END FOR
```

### Bug 2 — Fix Checking

```pascal
FUNCTION isBugCondition_2(logoutCall)
  INPUT: logoutCall of type function call site
  OUTPUT: boolean

  // Bug condition: PaywallScreen invokes useAuthStore().logout directly
  RETURN logoutCall.source = PaywallScreen
     AND logoutCall.target = useAuthStore().logout
END FUNCTION

// Property: Fix Checking — all stores and WebSocket must be cleared
FOR ALL logoutCall WHERE isBugCondition_2(logoutCall) DO
  result ← handleLogout'(logoutCall)
  ASSERT subscriptionStore.isSubscribed = false
  ASSERT accountStore.accounts = []
  ASSERT signalStore.signals = []
  ASSERT tradeStore.openPositions = []
  ASSERT websocketService.isConnected = false
END FOR

// Property: Preservation Checking
FOR ALL logoutCall WHERE NOT isBugCondition_2(logoutCall) DO
  ASSERT F(logoutCall) = F'(logoutCall)
END FOR
```
