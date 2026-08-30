import { createAuthenticatedClient } from './apiClient';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { ConnectedAccount, SubscriptionMode } from '../store/accountStore';

const apiClient = createAuthenticatedClient(API_BASE_URL);

export type SupportedBroker = 'deriv' | 'mt5' | 'oanda';

export interface ConnectAccountPayload {
  broker: SupportedBroker;
  credentials: Record<string, string>;
}

export interface DerivAccount {
  accountId:   string;
  accountType: 'real' | 'demo' | string;
  status:      'active' | 'inactive' | string;
  balance:     number;
  currency:    string;
}

export const accountService = {
  setAuthToken: (token: string) => {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /** Fetch all connected accounts for the authenticated user. */
  getAccounts: async (): Promise<ConnectedAccount[]> => {
    const response = await apiClient.get<{ success: boolean; accounts: ConnectedAccount[]; total: number }>(
      ENDPOINTS.accounts.list
    );
    return response.data.accounts ?? [];
  },

  /** Fetch all Deriv trading accounts associated with a PAT. */
  listDerivAccounts: async (pat: string): Promise<DerivAccount[]> => {
    const response = await apiClient.post<{ success: boolean; accounts: DerivAccount[] }>(
      ENDPOINTS.accounts.derivListAccounts,
      { pat },
      { timeout: 12_000 },
    );
    return response.data.accounts;
  },

  /**
   * Connect a new broker account.
   * Retries up to 2 times with exponential backoff on 429 rate-limit responses.
   */
  connectAccount: async (payload: ConnectAccountPayload): Promise<ConnectedAccount> => {
    const MAX_RETRIES = 2;
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Wait 2s then 4s before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      try {
        const response = await apiClient.post<{ success: boolean; account: ConnectedAccount; message: string }>(
          ENDPOINTS.accounts.connect,
          payload,
          { timeout: 15_000 },
        );
        return response.data.account;
      } catch (err: unknown) {
        lastError = err;
        const status = (err as { response?: { status: number } }).response?.status;
        if (status !== 429) throw err;  // non-429 errors surface immediately
      }
    }
    throw lastError;
  },

  /** Disconnect a broker account. */
  disconnectAccount: async (accountId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.accounts.disconnect(accountId));
  },

  /**
   * Update the subscription mode for an account.
   * Passes confirm:true automatically when switching to automated_trading (Req 12.4).
   */
  setSubscriptionMode: async (accountId: string, mode: SubscriptionMode): Promise<void> => {
    await apiClient.post(ENDPOINTS.settings.subscriptionMode, {
      accountId,
      mode,
      ...(mode === 'automated_trading' ? { confirm: true } : {}),
    });
  },
};