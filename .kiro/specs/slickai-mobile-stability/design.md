# Slick AI Mobile Stability Bugfix Design

## Overview

Two bugs prevent the Slick AI React Native app (`slickai/`) from running correctly
on a physical device.

**Bug 1** is a compile-time and runtime crash in `DashboardScreen.tsx`. The component
renders a LIVE indicator that conditionally checks `wsConnected`, but that variable is
never declared — `useWebSocket()` is never called inside the component. This causes a
TypeScript "Cannot find name 'wsConnected'" build error and a `ReferenceError` at
runtime.

**Bug 2** is a silent data-integrity defect in `PaywallScreen.tsx`. The Log Out button
calls `useAuthStore().logout` directly, which only clears the auth store. The
subscription, account, signal, and trade Zustand stores are left dirty, and the
WebSocket connection stays open. A subsequent session for a different user can observe
stale data from the previous session.

The fix for both bugs is minimal and surgical:

- **Bug 1**: Add one import and one hook call (`const { isConnected: wsConnected } = useWebSocket()`) inside `DashboardScreen`.
- **Bug 2**: Replace `const { logout } = useAuthStore()` with `const { logout } = useAuth()` in `PaywallScreen`, and remove the now-unused `useAuthStore` import.

---

## Glossary

- **Bug_Condition (C)**: The precise condition that triggers the defect — evaluated per
  bug below.
- **Property (P)**: The desired, correct behavior that the fixed code must satisfy for
  all inputs where C holds.
- **Preservation**: Existing correct behaviors that must be unchanged by the fix.
- **`useWebSocket()`**: Hook in `src/hooks/useWebSocket.ts` that subscribes to
  `websocketService` connection-change events and returns `{ isConnected: boolean }`.
- **`useAuth()`**: Hook in `src/hooks/useAuth.ts` that wraps `useAuthStore` and
  provides a `logout` action that disconnects the WebSocket and clears all five
  Zustand stores before removing auth credentials.
- **`useAuthStore()`**: Raw Zustand store in `src/store/authStore.ts`. Its `logout`
  action only removes auth credentials (token, user, refreshToken) from SecureStore
  and resets the auth slice — it does NOT touch other stores or the WebSocket.
- **`websocketService`**: Singleton service in `src/services/websocketService.ts`
  that manages the WebSocket connection lifecycle.

---

## Bug Details

### Bug 1 — `wsConnected` Undeclared in DashboardScreen

#### Bug Condition

The bug manifests when `DashboardScreen.tsx` is compiled or rendered. The component
body references the identifier `wsConnected` in JSX without ever declaring it via a
hook call or variable assignment.

**Formal Specification:**
```
FUNCTION isBugCondition_1(component)
  INPUT: component of type React functional component
  OUTPUT: boolean

  RETURN component = DashboardScreen
     AND useWebSocket NOT IN hook_calls(component)
     AND "wsConnected" NOT IN declared_identifiers(component)
END FUNCTION
```

#### Examples

- **TypeScript build**: Compiler processes `DashboardScreen.tsx` → reports
  `TS2304: Cannot find name 'wsConnected'` → build fails.
- **Runtime render (connected)**: JavaScript evaluates `{wsConnected && ...}` →
  throws `ReferenceError: wsConnected is not defined` → Dashboard tab crashes.
- **Runtime render (disconnected)**: Same crash; the condition value is irrelevant
  because the identifier itself is undefined.
- **Edge case — hot reload**: Developer removes the LIVE indicator JSX but leaves
  the missing hook; build succeeds but the indicator is permanently gone, which is
  also incorrect.

---

### Bug 2 — PaywallScreen Uses Incomplete Logout

#### Bug Condition

The bug manifests when the user taps "Log Out" on `PaywallScreen`. The `handleLogout`
callback invokes `useAuthStore().logout`, which only clears the auth slice and does
not orchestrate a full session teardown.

**Formal Specification:**
```
FUNCTION isBugCondition_2(logoutCallSite)
  INPUT: logoutCallSite of type { source: Component, logoutFn: function }
  OUTPUT: boolean

  RETURN logoutCallSite.source   = PaywallScreen
     AND logoutCallSite.logoutFn = useAuthStore().logout
     AND logoutCallSite.logoutFn ≠ useAuth().logout
END FUNCTION
```

#### Examples

- **Stale subscription store**: User A logs out via Paywall → User B logs in →
  `subscriptionStore.isSubscribed` is still `true` from User A's session.
- **Stale trade data**: User A has 3 open positions → logs out via Paywall → User B
  sees User A's positions until their own data loads.
- **Open WebSocket**: After Paywall logout, `websocketService.isConnected` remains
  `true` and continues delivering `signal`/`trade_executed` events for the previous
  user's token.
- **Edge case — immediate re-login**: A second user logs in within milliseconds of the
  Paywall logout; they receive WebSocket events addressed to User A's account.

---

## Expected Behavior

### Preservation Requirements

These behaviors must be completely unchanged by both fixes.

**Unchanged Behaviors:**
- Mouse/touch taps on Dashboard trade cards, period tabs, and the equity chart must
  continue to function exactly as before.
- `DashboardScreen` pull-to-refresh must continue to reload positions, performance
  summary, and equity curve without errors.
- `SettingsScreen` logout (already uses `useAuth().logout`) must continue to clear all
  stores and disconnect the WebSocket unchanged.
- `PaywallScreen` "Skip" button must continue to navigate to the dashboard without
  triggering any logout or store reset.
- `PaywallScreen` subscription purchase and restore flows must be completely unaffected.
- WebSocket `signal`, `trade_executed`, `trade_closed`, and `position_update` event
  handlers registered in `RootNavigator`/`AppContent` via `useWebSocket` must continue
  to update the relevant Zustand stores.
- The LIVE indicator in `DashboardScreen` must only be shown when
  `websocketService.isConnected` is `true`, consistent with what the rest of the app
  expects.

**Scope:**
All inputs that do NOT satisfy `isBugCondition_1` or `isBugCondition_2` must produce
identical behavior before and after the fix.

---

## Hypothesized Root Cause

### Bug 1 — Missing Hook Call

1. **Omitted hook call during refactor**: The LIVE indicator JSX was written (or
   retained from a template) but the corresponding `useWebSocket()` call was never
   added to the component body. Since `wsConnected` is not in scope, TypeScript
   should have caught this immediately — it likely surfaced as a lint warning that was
   suppressed or deferred.

2. **No runtime safety net**: React Native's JavaScript bundle in development mode
   surfaces the `ReferenceError` only when the Dashboard tab renders. If the app was
   primarily tested on other tabs during development, this could have been missed.

### Bug 2 — Wrong Hook at Call Site

1. **Direct store access instead of orchestrating hook**: The developer imported
   `useAuthStore` (which is correct for reading subscription/account data elsewhere)
   and destructured `logout` from it, not realising that `useAuthStore().logout` is
   a bare store action — it only manages the auth slice. The full logout sequence
   (clear all stores, disconnect WebSocket) lives in the `useAuth()` hook's `logout`
   callback, which was added specifically to avoid this kind of fragmentation.

2. **No integration test for Paywall logout path**: The `SettingsScreen` logout was
   implemented correctly and presumably tested. The `PaywallScreen` logout was added
   later without a test that verified cross-store cleanup, so the regression went
   undetected.

---

## Correctness Properties

Property 1: Bug Condition — DashboardScreen Declares `wsConnected`

_For any_ render of `DashboardScreen`, the fixed component SHALL call `useWebSocket()`
and bind its `isConnected` return value to the identifier `wsConnected`, such that no
`ReferenceError` is thrown, no TypeScript compilation error is emitted, and the LIVE
indicator is visible if and only if `websocketService.isConnected` is `true`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

---

Property 2: Bug Condition — PaywallScreen Logout Clears All Stores and WebSocket

_For any_ invocation of the Log Out action on `PaywallScreen`, the fixed `handleLogout`
SHALL use `useAuth().logout`, which disconnects the WebSocket and resets the
subscription, account, signal, trade, and auth Zustand stores to their initial empty
state before navigating away.

**Validates: Requirements 2.5, 2.6, 2.7**

---

Property 3: Preservation — PaywallScreen Logout Is Idempotent with SettingsScreen Logout

_For any_ user session state S, calling logout via `PaywallScreen` (fixed) SHALL
produce the same observable post-logout application state as calling logout via
`SettingsScreen`. Both paths call `useAuth().logout`, so the resulting store states
and WebSocket connection status must be identical regardless of which screen initiated
the logout.

**Validates: Requirements 3.3**

---

## Fix Implementation

### Bug 1 — `DashboardScreen.tsx`

**File**: `src/screens/dashboard/DashboardScreen.tsx`

**Function**: `DashboardScreen` component body

**Specific Changes:**

1. **Add import**: At the top of the file, alongside the other hook imports, add:
   ```tsx
   import { useWebSocket } from '../../hooks/useWebSocket';
   ```

2. **Add hook call**: Inside the `DashboardScreen` component body, after the existing
   store hooks (`useTradeStore`, `useAccountStore`, `useAuthStore`), add:
   ```tsx
   const { isConnected: wsConnected } = useWebSocket();
   ```
   This declares `wsConnected` in the component scope, satisfying both TypeScript and
   the runtime reference in the JSX LIVE indicator block.

No other changes are required. The conditional JSX `{wsConnected && (...)}` is already
correct and needs no modification.

---

### Bug 2 — `PaywallScreen.tsx`

**File**: `src/screens/paywall/PaywallScreen.tsx`

**Function**: `PaywallScreen` component body

**Specific Changes:**

1. **Add import**: Add the `useAuth` hook import:
   ```tsx
   import { useAuth } from '../../hooks/useAuth';
   ```

2. **Replace hook call**: Remove the logout destructure from `useAuthStore`:
   ```tsx
   // Remove this line:
   const { logout } = useAuthStore();
   ```
   Replace with:
   ```tsx
   const { logout } = useAuth();
   ```

3. **Remove unused import**: The `useAuthStore` import is now only used for the
   `logout` destructure. Remove it entirely:
   ```tsx
   // Remove this line:
   import { useAuthStore } from '../../store/authStore';
   ```

The `handleLogout` callback (`async () => { await logout(); }`) and the JSX wiring
are already correct and need no changes.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach: first write exploratory tests against the
**unfixed** code to surface the bug and confirm the root cause hypothesis, then verify
the fix satisfies Properties 1–3 and that preservation holds.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on the unfixed code. Confirm or refute root cause
analysis. If the hypothesis is refuted, re-hypothesize before implementing the fix.

#### Bug 1 — Exploratory Tests (run on unfixed `DashboardScreen`)

**Test Plan**: Render `DashboardScreen` in a test environment and assert that
`wsConnected` resolves without error, and that the LIVE indicator appears/disappears
based on WebSocket connection state.

**Test Cases:**
1. **Render with WebSocket connected** — render `DashboardScreen` with
   `websocketService.isConnected = true`; assert no `ReferenceError` is thrown and
   LIVE indicator is present. *(will fail on unfixed code)*
2. **Render with WebSocket disconnected** — render with `isConnected = false`; assert
   no error and LIVE indicator is absent. *(will fail on unfixed code)*
3. **TypeScript compilation** — run `tsc --noEmit` on the project; assert zero
   errors. *(will fail on unfixed code — TS2304)*

**Expected Counterexamples:**
- `ReferenceError: wsConnected is not defined` on every render path.
- TypeScript error `TS2304: Cannot find name 'wsConnected'` in `DashboardScreen.tsx`.

#### Bug 2 — Exploratory Tests (run on unfixed `PaywallScreen`)

**Test Plan**: Simulate a `handleLogout` call in `PaywallScreen` and inspect all
Zustand store states and `websocketService.isConnected` afterward.

**Test Cases:**
1. **Store cleanup** — seed all five stores with non-empty state; call
   `handleLogout`; assert each store matches its initial empty state. *(will fail —
   only authStore is cleared)*
2. **WebSocket disconnect** — connect `websocketService`; call `handleLogout`; assert
   `websocketService.isConnected` is `false`. *(will fail — WS stays open)*
3. **Cross-session data isolation** — after `handleLogout`, log in as a second user;
   assert they cannot observe any trade, signal, or account data from the first user's
   session. *(will fail — stale store data persists)*

**Expected Counterexamples:**
- `subscriptionStore.isSubscribed` remains `true` after logout.
- `tradeStore.openPositions` contains the previous user's positions.
- `websocketService.isConnected` remains `true`.

---

### Fix Checking

**Goal**: After applying both fixes, verify that every input satisfying the bug
condition now produces the correct output (Properties 1 and 2).

```
// Bug 1
FOR ALL render WHERE isBugCondition_1(DashboardScreen) DO
  result := render(DashboardScreen_fixed)
  ASSERT no_reference_error(result, 'wsConnected')
  ASSERT no_typescript_error(result, 'wsConnected')
  ASSERT liveIndicatorVisible(result) = websocketService.isConnected
END FOR

// Bug 2
FOR ALL session WHERE isBugCondition_2(PaywallScreen.handleLogout) DO
  invoke handleLogout_fixed()
  ASSERT subscriptionStore.isSubscribed       = false
  ASSERT subscriptionStore.customerInfo       = null
  ASSERT accountStore.accounts                = []
  ASSERT signalStore.signals                  = []
  ASSERT tradeStore.openPositions             = []
  ASSERT tradeStore.trades                    = []
  ASSERT tradeStore.performanceSummary        = null
  ASSERT authStore.isAuthenticated            = false
  ASSERT websocketService.isConnected         = false
END FOR
```

---

### Preservation Checking

**Goal**: Verify that all inputs NOT satisfying either bug condition produce identical
behavior before and after the fix (Property 3 and requirements 3.1–3.6).

```
FOR ALL input WHERE NOT isBugCondition_1(input) AND NOT isBugCondition_2(input) DO
  ASSERT F_original(input) = F_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing (PBT) is used here because the input
space for "all possible non-logout interactions in PaywallScreen and DashboardScreen"
is large and manual enumeration would leave gaps.

**Test Cases:**
1. **Dashboard data load preservation** — generate random `PerformanceSummary` and
   `OpenPosition[]` values; render the fixed `DashboardScreen`; assert the same
   summary cards and trade cards appear as with the original component.
2. **Dashboard refresh preservation** — trigger `onRefresh` in the fixed component;
   assert `tradeService.getOpenPositions` and friends are called identically to
   before.
3. **PaywallScreen subscribe flow preservation** — call `handleSubscribe` in the fixed
   `PaywallScreen`; assert `subscriptionService.purchasePackage` is called and
   `setSubscription` is invoked with the returned `customerInfo`, identical to before.
4. **PaywallScreen restore flow preservation** — call `handleRestore`; assert behavior
   is unchanged.
5. **PaywallScreen skip preservation** — press the Skip button; assert `onSkip` is
   called with no side effects on any store.
6. **SettingsScreen logout parity (Property 3)** — given the same seeded store state,
   call logout via the fixed `PaywallScreen` and separately via `SettingsScreen`;
   assert both result in identical final store states and WebSocket status.

---

### Unit Tests

- Render `DashboardScreen` with `websocketService.isConnected = true`; assert LIVE
  indicator present.
- Render `DashboardScreen` with `websocketService.isConnected = false`; assert LIVE
  indicator absent.
- Call `handleLogout` in fixed `PaywallScreen`; assert `useAuth().logout` (not
  `useAuthStore().logout`) is called.
- After fixed `handleLogout`, assert all five Zustand stores are in initial state.
- After fixed `handleLogout`, assert `websocketService.disconnect()` was called.
- `tsc --noEmit` reports zero errors after applying both fixes.

### Property-Based Tests

- **Property 1**: Generate random WebSocket connection states (true/false, toggling
  mid-render); assert `wsConnected` in `DashboardScreen` always equals
  `websocketService.isConnected` with no errors thrown.
- **Property 2**: Generate random populated store states for all five stores; call
  Paywall logout; assert every store field matches the known initial empty value —
  regardless of what the stores contained.
- **Property 3**: Generate random session states; call logout from `PaywallScreen` and
  from `SettingsScreen`; assert final observable state (all stores + WS status) is
  identical for both paths.

### Integration Tests

- Full app boot → login → Dashboard renders with LIVE indicator tracking WebSocket
  state → logout from Paywall → verify all stores reset and WS disconnected → login
  as second user → verify second user sees only their own data.
- Full app boot → login → navigate to PaywallScreen → tap Skip → verify no store
  mutations and Dashboard loads correctly.
- Full app boot → login → logout from SettingsScreen → verify behavior is identical
  to Paywall logout (parity check).
