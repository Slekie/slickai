import { createAuthenticatedClient } from './apiClient';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { OpenPosition, PerformanceSummary, Trade } from '../store/tradeStore';

const apiClient = createAuthenticatedClient(API_BASE_URL);

export const tradeService = {
  setAuthToken: (token: string) => {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /**
   * Fetch trade history.
   */
  getTrades: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<Trade[]> => {
    const response = await apiClient.get<Trade[]>(ENDPOINTS.trades.list, {
      params,
    });
    return response.data;
  },

  /**
   * Fetch a single trade by ID.
   */
  getTrade: async (tradeId: string): Promise<Trade> => {
    const response = await apiClient.get<Trade>(
      ENDPOINTS.trades.detail(tradeId)
    );
    return response.data;
  },

  /**
   * Fetch open positions with unrealized P&L.
   */
  getOpenPositions: async (): Promise<OpenPosition[]> => {
    const response = await apiClient.get<OpenPosition[]>(
      ENDPOINTS.performance.positions
    );
    return response.data;
  },

  /**
   * Fetch performance summary for the given period.
   */
  getPerformanceSummary: async (
    period: '1D' | '7D' | '30D' | 'ALL' = '7D'
  ): Promise<PerformanceSummary> => {
    const response = await apiClient.get<PerformanceSummary>(
      ENDPOINTS.performance.summary,
      { params: { period } }
    );
    return response.data;
  },
};
