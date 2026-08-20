import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';
import type { Signal } from '../store/signalStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

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
    const response = await apiClient.get<Signal[]>(ENDPOINTS.signals.list, {
      params,
    });
    return response.data;
  },
};
