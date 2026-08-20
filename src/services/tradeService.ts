import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';
import type { OpenPosition, PerformanceSummary, Trade } from '../store/tradeStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

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
