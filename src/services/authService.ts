import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE_URL, API_TIMEOUT_MS, ENDPOINTS } from '../config/api';
import type { AuthUser } from '../store/authStore';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface BiometricChallengeResponse {
  challenge: string;
}

export const authService = {
  /**
   * Authenticate with email and password.
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      ENDPOINTS.auth.login,
      { email, password }
    );
    return response.data;
  },

  /**
   * Register a new user account.
   */
  register: async (
    email: string,
    password: string
  ): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
      ENDPOINTS.auth.register,
      { email, password }
    );
    return response.data;
  },

  /**
   * Check if biometric authentication is available on this device.
   */
  isBiometricAvailable: async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  },

  /**
   * Prompt the user for biometric authentication.
   * Returns true if the biometric prompt succeeds.
   */
  authenticateWithBiometrics: async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Slick AI',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  },

  /**
   * Exchange a biometric credential for a JWT token.
   * The caller must first call authenticateWithBiometrics() and obtain a signature.
   */
  loginWithBiometric: async (
    userId: string,
    signature: string
  ): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      ENDPOINTS.auth.biometric,
      { userId, signature }
    );
    return response.data;
  },

  /**
   * Refresh an expired JWT token.
   */
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await apiClient.post<{ token: string }>(
      ENDPOINTS.auth.refresh,
      { refreshToken }
    );
    return response.data;
  },
};
