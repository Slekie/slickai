/**
 * accountStore + subscriptionStore unit tests
 * Validates: Requirements 7.9, 7.10
 */

import { useAccountStore, ConnectedAccount } from '../store/accountStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { createEmptyCustomerInfo, CustomerInfo } from '../services/subscriptionService';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<ConnectedAccount> = {}): ConnectedAccount {
  return {
    accountId: 'acc1',
    userId: 'u1',
    broker: 'deriv',
    balance: '1000.00',
    currency: 'USD',
    status: 'active',
    subscriptionMode: 'signal_delivery',
    connectedAt: new Date().toISOString(),
    lastSync: null,
    ...overrides,
  };
}

function makeActiveCustomerInfo(): CustomerInfo {
  return {
    ...createEmptyCustomerInfo(),
    entitlements: {
      active: {
        pro: {
          identifier: 'pro',
          isActive: true,
          willRenew: true,
          periodType: 'NORMAL',
          latestPurchaseDate: new Date().toISOString(),
          latestPurchaseDateMillis: Date.now(),
          originalPurchaseDate: new Date().toISOString(),
          originalPurchaseDateMillis: Date.now(),
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          expirationDateMillis: Date.now() + 30 * 24 * 60 * 60 * 1000,
          store: 'APP_STORE',
          productIdentifier: 'slickai_monthly',
          isSandbox: false,
          unsubscribeDetectedAt: null,
          billingIssueDetectedAt: null,
        },
      },
      all: {},
    },
  };
}

// Reset stores between tests
beforeEach(() => {
  useAccountStore.setState({ accounts: [], isLoading: false, error: null });
  useSubscriptionStore.setState({
    isSubscribed: false,
    planName: null,
    expiresAt: null,
    isLoading: false,
    error: null,
  });
});

// ── accountStore ─────────────────────────────────────────────────────────────

describe('accountStore — addAccount', () => {
  it('appends account to the list', () => {
    const acc = makeAccount({ accountId: 'a1' });
    useAccountStore.getState().addAccount(acc);
    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect(useAccountStore.getState().accounts[0].accountId).toBe('a1');
  });
});

describe('accountStore — removeAccount', () => {
  it('removes the matching account', () => {
    useAccountStore.setState({ accounts: [makeAccount({ accountId: 'a1' }), makeAccount({ accountId: 'a2' })] });
    useAccountStore.getState().removeAccount('a1');
    expect(useAccountStore.getState().accounts).toHaveLength(1);
    expect(useAccountStore.getState().accounts[0].accountId).toBe('a2');
  });

  it('is a no-op if accountId does not exist', () => {
    useAccountStore.setState({ accounts: [makeAccount({ accountId: 'a1' })] });
    useAccountStore.getState().removeAccount('nonexistent');
    expect(useAccountStore.getState().accounts).toHaveLength(1);
  });
});

describe('accountStore — setSubscriptionMode', () => {
  it('updates only the matching account mode', () => {
    useAccountStore.setState({
      accounts: [
        makeAccount({ accountId: 'a1', subscriptionMode: 'signal_delivery' }),
        makeAccount({ accountId: 'a2', subscriptionMode: 'signal_delivery' }),
      ],
    });
    useAccountStore.getState().setSubscriptionMode('a1', 'automated_trading');
    const accounts = useAccountStore.getState().accounts;
    expect(accounts.find((a) => a.accountId === 'a1')?.subscriptionMode).toBe('automated_trading');
    expect(accounts.find((a) => a.accountId === 'a2')?.subscriptionMode).toBe('signal_delivery');
  });
});

// ── subscriptionStore ────────────────────────────────────────────────────────

describe('subscriptionStore — setSubscription', () => {
  it('sets isSubscribed = true when pro entitlement is active', () => {
    useSubscriptionStore.getState().setSubscription(makeActiveCustomerInfo());
    expect(useSubscriptionStore.getState().isSubscribed).toBe(true);
  });

  it('maps productIdentifier to planName correctly', () => {
    useSubscriptionStore.getState().setSubscription(makeActiveCustomerInfo());
    expect(useSubscriptionStore.getState().planName).toBe('Monthly');
  });

  it('sets isSubscribed = false when entitlement is absent', () => {
    useSubscriptionStore.getState().setSubscription(createEmptyCustomerInfo());
    expect(useSubscriptionStore.getState().isSubscribed).toBe(false);
  });

  it('sets expiresAt from the entitlement expiration date', () => {
    const info = makeActiveCustomerInfo();
    const expectedExpiry = info.entitlements.active['pro'].expirationDate;
    useSubscriptionStore.getState().setSubscription(info);
    expect(useSubscriptionStore.getState().expiresAt).toBe(expectedExpiry);
  });
});

describe('subscriptionStore — clearSubscription', () => {
  it('resets all fields to defaults', () => {
    useSubscriptionStore.getState().setSubscription(makeActiveCustomerInfo());
    useSubscriptionStore.getState().clearSubscription();
    const state = useSubscriptionStore.getState();
    expect(state.isSubscribed).toBe(false);
    expect(state.planName).toBeNull();
    expect(state.expiresAt).toBeNull();
    expect(state.error).toBeNull();
  });
});
