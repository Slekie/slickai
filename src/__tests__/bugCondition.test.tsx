/**
 * Bug Condition Exploration Tests
 *
 * These tests run against UNFIXED code to confirm both bugs exist.
 *
 * Bug 1 — DashboardScreen `wsConnected` ReferenceError:
 *   The component body uses `wsConnected` in JSX but never calls useWebSocket()
 *   to declare it. This causes a ReferenceError at runtime on every render path.
 *   Verified via source-code inspection + `npx tsc --noEmit --skipLibCheck` (which
 *   reports TS2304: Cannot find name 'wsConnected').
 *
 * Bug 2 — PaywallScreen incomplete logout:
 *   The Log Out handler calls useAuthStore().logout() directly. That action only
 *   clears the auth slice. The other four stores (subscription, account, signal,
 *   trade) and the WebSocket connection are left untouched.
 *
 * EXPECTED OUTCOMES ON UNFIXED CODE:
 *   - Bug 1 source-inspection tests → PASS on unfixed, FAIL after fix (source changes)
 *   - Bug 2 store-state tests       → PASS on unfixed (prove stale state exists),
 *                                      FAIL after fix (stores ARE cleared)
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

// ── Mock: expo-secure-store (needed by authStore) ────────────────────────────
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => { store[key] = value; }),
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
  };
});

// ── Mock: socket.io-client (prevent real network connections) ─────────────────
jest.mock('socket.io-client', () => {
  const socket = {
    connected: false,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  };
  return { io: jest.fn(() => socket) };
});

import fs from 'fs';
import path from 'path';

import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAccountStore } from '../store/accountStore';
import { useSignalStore } from '../store/signalStore';
import { useTradeStore } from '../store/tradeStore';
import { websocketService } from '../services/websocketService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Reset all five stores to their initial empty state between tests. */
function resetAllStores(): void {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    failedAttempts: 0,
    lockedUntil: null,
    isLoading: false,
  });
  useSubscriptionStore.setState({
    isSubscribed: false,
    planName: null,
    expiresAt: null,
    isLoading: false,
    error: null,
  });
  useAccountStore.setState({ accounts: [], isLoading: false, error: null });
  useSignalStore.setState({ signals: [], isLoading: false, error: null });
  useTradeStore.setState({
    trades: [],
    openPositions: [],
    performanceSummary: null,
    selectedPeriod: '7D',
    isLoading: false,
    error: null,
  });
}

/** Seed all five stores with non-empty "user A" session data. */
async function seedAllStoresWithUserAData(): Promise<void> {
  // Auth store — user A is authenticated
  await useAuthStore.getState().login(
    { userId: 'user-a', email: 'usera@example.com' },
    'token-user-a',
    'refresh-user-a',
  );

  // Subscription store — user A has an active subscription
  useSubscriptionStore.setState({
    isSubscribed: true,
    planName: 'Monthly',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Account store — user A has a connected broker account
  useAccountStore.setState({
    accounts: [
      {
        accountId: 'acc-a1',
        userId: 'user-a',
        broker: 'OANDA',
        balance: '10000',
        currency: 'USD',
        status: 'active',
        subscriptionMode: 'signal_delivery',
        connectedAt: new Date().toISOString(),
        lastSync: null,
      },
    ],
  });

  // Signal store — user A has received a signal
  useSignalStore.setState({
    signals: [
      {
        signalId: 'sig-a1',
        userAccountId: 'acc-a1',
        asset: 'XAUUSD',
        direction: 'BUY',
        entryPrice: '2350.00',
        stopLoss: '2330.00',
        takeProfit: '2390.00',
        confidence: 88,
        modelVersion: 'v2',
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'pending',
      },
    ],
  });

  // Trade store — user A has open positions and closed trades
  useTradeStore.setState({
    openPositions: [
      {
        tradeId: 'trade-a1',
        userAccountId: 'acc-a1',
        asset: 'XAUUSD',
        direction: 'BUY',
        entryTime: new Date().toISOString(),
        entryPrice: '2350.00',
        positionSize: '0.1',
        stopLoss: '2330.00',
        takeProfit: '2390.00',
        exitTime: null,
        exitPrice: null,
        profitLoss: null,
        profitLossPercentage: null,
        closeReason: null,
        modelVersion: 'v2',
        confidence: 88,
        status: 'open',
        unrealizedPnl: '+40.00',
        unrealizedPnlPercentage: 1.7,
        currentPrice: '2390.00',
      },
    ],
    trades: [
      {
        tradeId: 'trade-a1',
        userAccountId: 'acc-a1',
        asset: 'XAUUSD',
        direction: 'BUY',
        entryTime: new Date().toISOString(),
        entryPrice: '2350.00',
        positionSize: '0.1',
        stopLoss: '2330.00',
        takeProfit: '2390.00',
        exitTime: null,
        exitPrice: null,
        profitLoss: null,
        profitLossPercentage: null,
        closeReason: null,
        modelVersion: 'v2',
        confidence: 88,
        status: 'open',
      },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bug 1 — DashboardScreen `wsConnected` Source-Level Bug Condition
//
// The React Native test environment cannot fully render DashboardScreen because
// several RN internal files (e.g. ScrollViewNativeComponent, ViewConfigIgnore)
// contain Flow-type syntax that Babel cannot parse in Jest. The runtime crash
// is therefore verified via source-code inspection instead.
//
// Source inspection is an equivalent proof:
//   - If wsConnected IS referenced in source AND useWebSocket is NOT called,
//     a ReferenceError is guaranteed on every render path — no workaround exists.
//   - TypeScript confirms this statically: TS2304 "Cannot find name 'wsConnected'"
//     in DashboardScreen.tsx (verified separately via `npx tsc --noEmit`).
// ─────────────────────────────────────────────────────────────────────────────

const DASHBOARD_SCREEN_PATH = path.resolve(
  __dirname,
  '../screens/dashboard/DashboardScreen.tsx',
);

describe('Bug 1 — DashboardScreen wsConnected undeclared (source inspection, unfixed code)', () => {
  let dashboardSource: string;

  beforeAll(() => {
    dashboardSource = fs.readFileSync(DASHBOARD_SCREEN_PATH, 'utf8');
  });

  /**
   * Bug Condition 1.1 — wsConnected IS referenced in JSX.
   *
   * Confirms the identifier is actively used in the component's render output.
   * The bug condition is live — the crash will happen on every render.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('Bug 1.1 — DashboardScreen.tsx references `wsConnected` in its source', () => {
    expect(dashboardSource).toMatch(/wsConnected/);
  });

  /**
   * Bug Condition 1.2 — useWebSocket() is NOT called.
   *
   * Without calling useWebSocket(), `wsConnected` is never put into scope.
   * A ReferenceError is guaranteed on every render path.
   *
   * EXPECTED: passes on UNFIXED code (no useWebSocket call present).
   * Will FAIL once the fix is applied (task 3.1 adds the hook call).
   *
   * Validates: Requirements 1.2, 1.3, 2.1
   */
  it('Bug 1.2 — DashboardScreen.tsx does NOT call useWebSocket() (wsConnected never declared)', () => {
    // On unfixed code: passes — hook is absent, bug is confirmed.
    // On fixed code:   fails — hook is present, fix verified.
    expect(dashboardSource).not.toMatch(/useWebSocket/);
  });

  /**
   * Combined: wsConnected is used AND useWebSocket is absent → guaranteed crash.
   *
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  it('Bug 1 combined — wsConnected referenced AND useWebSocket absent → guaranteed ReferenceError on any render', () => {
    const usesWsConnected   = /wsConnected/.test(dashboardSource);
    const callsUseWebSocket = /useWebSocket/.test(dashboardSource);

    // Both conditions together constitute the full bug condition.
    expect(usesWsConnected).toBe(true);    // identifier is used
    expect(callsUseWebSocket).toBe(false); // hook that declares it is absent
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bug 2 — PaywallScreen incomplete logout (useAuthStore.logout only)
// ─────────────────────────────────────────────────────────────────────────────

describe('Bug 2 — PaywallScreen incomplete logout via useAuthStore().logout() (unfixed code)', () => {
  beforeEach(async () => {
    resetAllStores();
    await seedAllStoresWithUserAData();
  });

  /**
   * Bug 2.1 — subscriptionStore not cleared.
   *
   * Simulates the UNFIXED PaywallScreen.handleLogout:
   *   const { logout } = useAuthStore();
   *   const handleLogout = async () => { await logout(); };
   *
   * After calling useAuthStore().logout(), subscriptionStore is not touched.
   * isSubscribed remains true — the bug is confirmed.
   *
   * PASSES on unfixed code. FAILS after fix (store IS cleared).
   *
   * Validates: Requirements 2.1, 2.3
   */
  it('Bug 2.1 — after useAuthStore().logout(), subscriptionStore.isSubscribed remains true (BUG EXISTS)', async () => {
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);

    // Simulate UNFIXED PaywallScreen logout — bare auth store logout only
    await useAuthStore.getState().logout();

    // BUG: subscription store was NOT cleared
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);
  });

  /**
   * Bug 2.1 — tradeStore.openPositions not cleared.
   *
   * Validates: Requirements 2.1, 2.3
   */
  it("Bug 2.1 — after useAuthStore().logout(), tradeStore.openPositions still contains user A's data (BUG EXISTS)", async () => {
    expect(useTradeStore.getState().openPositions).toHaveLength(1);
    expect(useTradeStore.getState().openPositions[0].tradeId).toBe('trade-a1');

    await useAuthStore.getState().logout();

    // BUG: trade store was NOT cleared
    expect(useTradeStore.getState().openPositions).toHaveLength(1);
    expect(useTradeStore.getState().openPositions[0].tradeId).toBe('trade-a1');
  });

  /**
   * Bug 2.1 — accountStore.accounts not cleared.
   *
   * Validates: Requirements 2.1, 2.3
   */
  it("Bug 2.1 — after useAuthStore().logout(), accountStore.accounts still contains user A's account (BUG EXISTS)", async () => {
    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect(useAccountStore.getState().accounts[0].userId).toBe('user-a');

    await useAuthStore.getState().logout();

    // BUG: account store was NOT cleared
    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect(useAccountStore.getState().accounts[0].userId).toBe('user-a');
  });

  /**
   * Bug 2.1 — signalStore.signals not cleared.
   *
   * Validates: Requirements 2.1, 2.3
   */
  it("Bug 2.1 — after useAuthStore().logout(), signalStore.signals still contains user A's signal (BUG EXISTS)", async () => {
    expect(useSignalStore.getState().signals).toHaveLength(1);
    expect(useSignalStore.getState().signals[0].signalId).toBe('sig-a1');

    await useAuthStore.getState().logout();

    // BUG: signal store was NOT cleared
    expect(useSignalStore.getState().signals).toHaveLength(1);
    expect(useSignalStore.getState().signals[0].signalId).toBe('sig-a1');
  });

  /**
   * Bug 2.3 — cross-session data isolation failure.
   *
   * After an incomplete PaywallScreen logout, a second user logs in and
   * immediately sees stale data from user A's session in all four non-auth stores.
   *
   * Validates: Requirements 2.3
   */
  it("Bug 2.3 — second user sees user A's stale data after PaywallScreen logout (BUG EXISTS)", async () => {
    // Simulate UNFIXED PaywallScreen logout
    await useAuthStore.getState().logout();

    // Auth IS cleared (only the auth store was touched)
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // Second user logs in — only auth store is updated
    await useAuthStore.getState().login(
      { userId: 'user-b', email: 'userb@example.com' },
      'token-user-b',
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.userId).toBe('user-b');

    // BUG: user B still sees user A's stale data across all four other stores
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);
    expect(useTradeStore.getState().openPositions[0].tradeId).toBe('trade-a1');
    expect(useAccountStore.getState().accounts[0].userId).toBe('user-a');
    expect(useSignalStore.getState().signals[0].signalId).toBe('sig-a1');
  });

  /**
   * Bug 2.2 — websocketService.disconnect() is NOT called.
   *
   * Confirms the WebSocket connection is never torn down by useAuthStore.logout().
   * A spy on websocketService.disconnect() must show zero calls.
   *
   * Validates: Requirements 2.2
   */
  it('Bug 2.2 — useAuthStore().logout() does NOT call websocketService.disconnect() (BUG EXISTS)', async () => {
    const disconnectSpy = jest.spyOn(websocketService, 'disconnect');

    // Simulate UNFIXED PaywallScreen logout
    await useAuthStore.getState().logout();

    // BUG: websocketService.disconnect() was never called
    expect(disconnectSpy).not.toHaveBeenCalled();

    disconnectSpy.mockRestore();
  });
});
