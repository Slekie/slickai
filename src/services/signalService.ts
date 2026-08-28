import { createAuthenticatedClient } from './apiClient';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { Signal } from '../store/signalStore';

const apiClient = createAuthenticatedClient(API_BASE_URL);

export const signalService = {
  setAuthToken: (token: string) => {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /**
   * Fetch historical signals.
   */
  getSignals: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<Signal[]> => {
    const response = await apiClient.get<{ signals: Signal[]; total: number }>(
      ENDPOINTS.signals.list,
      { params },
    );
    return response.data.signals ?? [];
  },
};
