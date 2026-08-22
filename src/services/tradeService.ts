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

  /**
   * Fetch equity curve data points for the given period.
   * Returns an empty array if the endpoint returns 404 (no trade history yet).
   */
  getEquityCurve: async (
    period: '1D' | '7D' | '30D' | 'ALL' = '7D'
  ): Promise<{ timestamp: string; equity: number }[]> => {
    try {
      const response = await apiClient.get<{ timestamp: string; equity: number }[]>(
        ENDPOINTS.performance.equity,
        { params: { period } }
      );
      return response.data;
    } catch (err) {
      // Graceful fallback — no equity history yet or endpoint not available
      const { default: axios } = await import('axios');
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },
};
