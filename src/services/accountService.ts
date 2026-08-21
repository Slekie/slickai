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

  /**
   * Fetch all connected accounts for the authenticated user.
   */
  getAccounts: async (): Promise<ConnectedAccount[]> => {
    const response = await apiClient.get<ConnectedAccount[]>(
      ENDPOINTS.accounts.list
    );
    return response.data;
  },

  /**
   * Fetch all Deriv trading accounts associated with a PAT.
   * Called before connect so the user can pick which account to use.
   */
  listDerivAccounts: async (pat: string): Promise<DerivAccount[]> => {
    const response = await apiClient.post<{ success: boolean; accounts: DerivAccount[] }>(
      `${ENDPOINTS.accounts.list}/deriv/list-accounts`,
      { pat },
      { timeout: 12_000 },
    );
    return response.data.accounts;
  },

  /**
   * Connect a new broker account.
   */
  connectAccount: async (
    payload: ConnectAccountPayload
  ): Promise<ConnectedAccount> => {
    const response = await apiClient.post<ConnectedAccount>(
      ENDPOINTS.accounts.connect,
      payload,
      { timeout: 15_000 },
    );
    return response.data;
  },

  /**
   * Disconnect a broker account.
   */
  disconnectAccount: async (accountId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.accounts.disconnect(accountId));
  },

  /**
   * Update the subscription mode for an account.
   */
  setSubscriptionMode: async (
    accountId: string,
    mode: SubscriptionMode
  ): Promise<void> => {
    await apiClient.post(ENDPOINTS.settings.subscriptionMode, {
      accountId,
      mode,
    });
  },
};
