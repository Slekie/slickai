# Implementation Plan

## Overview

This spec fixes two mobile stability bugs in the SlickAI app:

1. **Bug 1 — `DashboardScreen` `wsConnected` ReferenceError**: The `DashboardScreen` component references `wsConnected` in its JSX without ever declaring it. The `useWebSocket` hook is never called, causing a `ReferenceError` at runtime whenever the dashboard renders.

2. **Bug 2 — `PaywallScreen` incomplete logout**: The `PaywallScreen` logout handler calls `useAuthStore().logout()` directly, which only clears the auth store. It does not disconnect the WebSocket or clear the subscription, account, signal, and trade stores — leaving stale data from the previous user's session.

The fix for Bug 1 adds a `useWebSocket()` hook call inside `DashboardScreen`. The fix for Bug 2 replaces the direct `useAuthStore().logout()` call with `useAuth().logout()`, which performs full teardown across all five stores and the WebSocket connection.

## Tasks

- [x] 1. Write bug condition exploration tests (BEFORE implementing fixes)
  - **Property 1: Bug Condition** - wsConnected Undeclared & Incomplete Logout
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Tests encode the expected behavior — they will validate fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist

  **Bug 1 — DashboardScreen `wsConnected` ReferenceError:**
  - Run `npx tsc --noEmit` in `slickai/` on unfixed code
  - Assert TypeScript reports `TS2304: Cannot find name 'wsConnected'` in `DashboardScreen.tsx`
  - Write a render test for `DashboardScreen` with `websocketService.isConnected = true`; assert `ReferenceError: wsConnected is not defined` is thrown (scoped PBT: both connected=true and connected=false paths crash)
  - Document counterexample: `render(<DashboardScreen />)` throws `ReferenceError: wsConnected is not defined` regardless of WebSocket state
  - **EXPECTED OUTCOME**: tsc and render test FAIL (proves bug 1 exists)

  **Bug 2 — PaywallScreen incomplete logout:**
  - Seed all five stores (`authStore`, `subscriptionStore`, `accountStore`, `signalStore`, `tradeStore`) with non-empty state
  - Connect `websocketService`
  - Call `handleLogout` in the unfixed `PaywallScreen`
  - Assert `subscriptionStore.isSubscribed` is still `true` → FAILS (only authStore cleared)
  - Assert `websocketService.isConnected` is still `true` → FAILS (WS not disconnected)
  - Assert `tradeStore.openPositions` still contains previous user's data → FAILS
  - Document counterexample: after `useAuthStore().logout()`, subscription/trade/signal/account stores remain dirty and WS stays open
  - **EXPECTED OUTCOME**: All store/WS assertions FAIL (proves bug 2 exists)

  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fixes)
  - **Property 2: Preservation** - Dashboard Data Display & PaywallScreen Non-Logout Flows
  - **IMPORTANT**: Follow observation-first methodology — observe behavior on UNFIXED code for non-buggy inputs, then write tests capturing those patterns
  - **EXPECTED OUTCOME**: All preservation tests PASS on unfixed code (confirms baseline behavior to preserve)

  **Dashboard preservation (isBugCondition_1 = false — any screen other than the failing wsConnected reference):**
  - Observe: `DashboardScreen` renders summary cards, equity chart, and trade cards correctly when given valid store data
  - Observe: `onRefresh` triggers `tradeService.getOpenPositions`, `getPerformanceSummary`, `getEquityCurve` in parallel
  - Write property-based test: for any `PerformanceSummary` and `OpenPosition[]` values, the fixed `DashboardScreen` renders the same output as the original component for all non-header JSX
  - Write property-based test: for any `selectedPeriod`, `onRefresh` always calls all three trade service methods
  - Verify LIVE indicator logic: when `websocketService.isConnected = false`, the indicator is absent without error

  **PaywallScreen preservation (isBugCondition_2 = false — all paths except Log Out button):**
  - Observe: `handleSubscribe` calls `subscriptionService.purchasePackage` and then `setSubscription(customerInfo)` unchanged
  - Observe: `handleRestore` calls `subscriptionService.restorePurchases` and conditionally calls `setSubscription` unchanged
  - Observe: pressing the Skip button calls `onSkip` with zero store mutations
  - Write property-based test: for any valid `PurchasesPackage`, `handleSubscribe` always calls `purchasePackage` and `setSubscription` — no store is reset
  - Write property-based test: pressing Skip never mutates any of the five Zustand stores
  - Verify SettingsScreen logout parity baseline: record all store states and WS status after `SettingsScreen` logout (already uses `useAuth().logout`) for comparison in task 3.3

  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix Bug 1 and Bug 2

  - [x] 3.1 Fix `DashboardScreen.tsx` — add `useWebSocket` hook call
    - Add import at top of `src/screens/dashboard/DashboardScreen.tsx` alongside other hook imports:
      ```tsx
      import { useWebSocket } from '../../hooks/useWebSocket';
      ```
    - Add hook call inside `DashboardScreen` component body, after the existing store hooks (`useTradeStore`, `useAccountStore`, `useAuthStore`):
      ```tsx
      const { isConnected: wsConnected } = useWebSocket();
      ```
    - No other changes needed — the conditional JSX `{wsConnected && (...)}` is already correct
    - _Bug_Condition: isBugCondition_1(DashboardScreen) — `wsConnected` not in declared_identifiers(DashboardScreen) AND useWebSocket not in hook_calls(DashboardScreen)_
    - _Expected_Behavior: useWebSocket() is called; `isConnected` is aliased as `wsConnected`; no ReferenceError thrown; LIVE indicator shown iff `websocketService.isConnected = true`_
    - _Preservation: All non-header JSX (summary cards, equity chart, trade cards, period tabs, pull-to-refresh) unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Fix `PaywallScreen.tsx` — replace incomplete logout with `useAuth`
    - Add import in `src/screens/paywall/PaywallScreen.tsx`:
      ```tsx
      import { useAuth } from '../../hooks/useAuth';
      ```
    - Remove the logout destructure from `useAuthStore`:
      ```tsx
      // Remove: const { logout } = useAuthStore();
      ```
    - Add replacement hook call:
      ```tsx
      const { logout } = useAuth();
      ```
    - Remove the now-unused `useAuthStore` import:
      ```tsx
      // Remove: import { useAuthStore } from '../../store/authStore';
      ```
    - The `handleLogout` callback (`async () => { await logout(); }`) and all JSX wiring need no changes
    - _Bug_Condition: isBugCondition_2(PaywallScreen.handleLogout) — logoutFn = useAuthStore().logout ≠ useAuth().logout_
    - _Expected_Behavior: useAuth().logout disconnects websocketService and clears all five stores (subscription, account, signal, trade, auth) before navigating away_
    - _Preservation: handleSubscribe, handleRestore, Skip button, SettingsScreen logout behavior all unchanged_
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - wsConnected Declared & Logout Completes Full Teardown
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - Re-run `npx tsc --noEmit` in `slickai/` — assert zero TypeScript errors
    - Re-run `DashboardScreen` render test — assert no `ReferenceError`, LIVE indicator present when connected, absent when disconnected
    - Re-run PaywallScreen logout test — assert all five stores match initial empty state and `websocketService.isConnected = false`
    - **EXPECTED OUTCOME**: All exploration tests PASS (confirms both bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Dashboard & PaywallScreen Non-Logout Flows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Re-run all Dashboard data display and refresh property tests
    - Re-run PaywallScreen subscribe, restore, and skip property tests
    - Re-run SettingsScreen logout parity check — assert fixed PaywallScreen logout produces identical final store states and WS status as SettingsScreen logout (Property 3 from design)
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `npx tsc --noEmit` in `slickai/` — assert zero errors
  - Run `npm test` (or `npx jest --testPathPattern="DashboardScreen|PaywallScreen"`) — assert all tests pass
  - Confirm Property 1 (bug condition) tests pass → bugs are fixed
  - Confirm Property 2 (preservation) tests pass → no regressions introduced
  - If any test fails, do NOT proceed — diagnose root cause and re-run from the appropriate task
  - Ask the user if any questions arise before closing

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3"] },
    { "wave": 3, "tasks": ["4"] }
  ],
  "dependencies": {
    "3": ["1", "2"],
    "4": ["3"]
  }
}
```

## Notes

- All exploration tests (Task 1) are expected to **fail** on unfixed code — this is the intended outcome confirming the bugs exist. Do not treat test failures in Task 1 as errors.
- All preservation tests (Task 2) are expected to **pass** on unfixed code — they capture baseline behavior that must not regress.
- Tasks 3.3 and 3.4 re-run the same tests from Tasks 1 and 2 respectively; no new tests should be written during the fix phase.
- The `useAuth` hook (used in the Bug 2 fix) already performs full teardown of all five stores and disconnects the WebSocket — no additional store-clearing logic is needed in `PaywallScreen`.
- If any test in Task 4 fails, do not proceed to close the spec — diagnose from the appropriate earlier task.
- TypeScript strict mode (`npx tsc --noEmit`) is used as a lightweight static check for Bug 1; a passing tsc run after the fix is a strong signal the `ReferenceError` is resolved.
