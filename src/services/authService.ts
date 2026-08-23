import { createAuthenticatedClient } from './apiClient';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { AuthUser } from '../store/authStore';

const apiClient = createAuthenticatedClient(API_BASE_URL);

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

// Shape the backend actually returns (snake_case)
interface BackendAuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  // Register also returns user info at top level
  user_id?: string;
  email?: string;
}

function mapBackendResponse(data: BackendAuthResponse, email?: string): LoginResponse {
  return {
    user: {
      userId: data.user_id ?? '',
      email:  data.email  ?? email ?? '',
    },
    token:        data.access_token,
    refreshToken: data.refresh_token,
  };
}

export interface BiometricChallengeResponse {
  challenge: string;
}

export const authService = {
  /**
   * Authenticate with email and password.
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<BackendAuthResponse>(
      ENDPOINTS.auth.login,
      { email, password }
    );
    return mapBackendResponse(response.data, email);
  },

  /**
   * Register a new user account.
   * Backend returns 201 with user_id, email, message — no tokens.
   * We immediately log the user in to get tokens.
   */
  register: async (
    email: string,
    password: string
  ): Promise<RegisterResponse> => {
    // Step 1: create account
    await apiClient.post<{ success: boolean; user_id: string; email: string }>(
      ENDPOINTS.auth.register,
      { email, password }
    );
    // Step 2: auto-login to get JWT pair
    const loginRes = await apiClient.post<BackendAuthResponse>(
      ENDPOINTS.auth.login,
      { email, password }
    );
    return mapBackendResponse(loginRes.data, email);
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
   */
  loginWithBiometric: async (
    userId: string,
    signature: string
  ): Promise<LoginResponse> => {
    const response = await apiClient.post<BackendAuthResponse>(
      ENDPOINTS.auth.biometric,
      { userId, signature }
    );
    return mapBackendResponse(response.data);
  },

  /**
   * Authenticate with a Google ID token obtained from the OAuth flow.
   */
  loginWithGoogle: async (idToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post<BackendAuthResponse>(
      ENDPOINTS.auth.google,
      { idToken }
    );
    return mapBackendResponse(response.data);
  },

  /**
   * Authenticate with an Apple identity token obtained from Sign in with Apple.
   */
  loginWithApple: async (
    identityToken: string,
    email: string | null
  ): Promise<LoginResponse> => {
    const response = await apiClient.post<BackendAuthResponse>(
      ENDPOINTS.auth.apple,
      { identityToken, email }
    );
    return mapBackendResponse(response.data, email ?? undefined);
  },

  /**
   * Refresh an expired JWT token.
   */
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await apiClient.post<{ access_token: string }>(
      ENDPOINTS.auth.refresh,
      { refresh_token: refreshToken }
    );
    return { token: response.data.access_token };
  },
};
