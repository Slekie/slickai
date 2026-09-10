import { create } from 'zustand';

export type AccountStatus = 'active' | 'inactive' | 'error' | 'circuit_breaker_active';
export type SubscriptionMode = 'signal_delivery' | 'automated_trading';

export interface ConnectedAccount {
  accountId: string;
  userId: string;
  broker: string;
  /** Human-readable broker label from the backend, e.g. "Deriv Demo MT5" */
  brokerDisplayName: string | null;
  /** Broker login number for display, e.g. "62668499" */
  loginId: string | null;
  /** MetaApi cloud account UUID — null for non-MT5 or pre-MetaApi accounts */
  metaApiAccountId: string | null;
  balance: string;
  currency: string;
  status: AccountStatus;
  subscriptionMode: SubscriptionMode;
  connectedAt: string;
  lastSync: string | null;
}

export interface AccountState {
  accounts: ConnectedAccount[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setAccounts: (accounts: ConnectedAccount[]) => void;
  addAccount: (account: ConnectedAccount) => void;
  removeAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Partial<ConnectedAccount>) => void;
  setSubscriptionMode: (accountId: string, mode: SubscriptionMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  isLoading: false,
  error: null,

  setAccounts: (accounts) => set({ accounts }),

  addAccount: (account) =>
    set((state) => ({ accounts: [...state.accounts, account] })),

  removeAccount: (accountId) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.accountId !== accountId),
    })),

  updateAccount: (accountId, updates) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.accountId === accountId ? { ...a, ...updates } : a
      ),
    })),

  setSubscriptionMode: (accountId, mode) =>
    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.accountId === accountId ? { ...a, subscriptionMode: mode } : a
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
