/**
 * apiClient.ts
 *
 * Factory for authenticated Axios instances with a 401 → token-refresh interceptor.
 *
 * Interceptor behaviour:
 *  1. On 401 (and !config._isRetry): read refresh token from SecureStore, call
 *     POST /auth/refresh, store new JWT in authStore, retry original request.
 *  2. On double-401 (refresh also fails): call authStore.logout() and navigate to
 *     AuthNavigator by setting isAuthenticated → false (RootNavigator reacts).
 *
 * The `_isRetry` flag on the request config prevents infinite retry loops.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';

// Augment axios request config with our retry flag
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _isRetry?: boolean;
  }
}

const SECURE_STORE_REFRESH_KEY = 'SlickAI_refresh_token';
const SECURE_STORE_TOKEN_KEY   = 'SlickAI_auth_token';

/**
 * Create an Axios instance with:
 * - 15 s timeout
 * - JSON content-type header
 * - 401 → refresh → retry interceptor
 */
export function createAuthenticatedClient(
  baseURL: string = API_BASE_URL,
): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: API_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.response.use(
    // Pass through successful responses unchanged
    (response) => response,

    async (error: unknown) => {
      // Type-guard: must be an axios error with a config
      if (!axios.isAxiosError(error)) return Promise.reject(error);

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _isRetry?: boolean;
      };

      const status = error.response?.status;

      // Only attempt refresh on 401 and only once per request
      if (status !== 401 || originalRequest?._isRetry) {
        return Promise.reject(error);
      }

      originalRequest._isRetry = true;

      try {
        // Read refresh token directly from SecureStore to avoid circular imports
        const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_REFRESH_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Exchange refresh token for new access token
        const refreshResponse = await axios.post<{ token: string; access_token?: string }>(
          `${baseURL}${ENDPOINTS.auth.refresh}`,
          { refresh_token: refreshToken },
          { timeout: API_TIMEOUT_MS },
        );

        const newToken = refreshResponse.data.access_token ?? refreshResponse.data.token;

        // Persist new token and update auth store
        await SecureStore.setItemAsync(SECURE_STORE_TOKEN_KEY, newToken);
        // Dynamically import authStore to avoid circular dep at module level
        const { useAuthStore } = await import('../store/authStore');
        const state = useAuthStore.getState();
        if (state.user) {
          await state.login(state.user, newToken);
        }

        // Update the Authorization header on the shared client and retry
        client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }

        return client(originalRequest);
      } catch {
        // Refresh failed — force logout so RootNavigator routes to AuthNavigator
        try {
          const { useAuthStore } = await import('../store/authStore');
          await useAuthStore.getState().logout();
        } catch {
          // Best-effort — ignore errors during logout
        }
        return Promise.reject(error);
      }
    },
  );

  return client;
}
