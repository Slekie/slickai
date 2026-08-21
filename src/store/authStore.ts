import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_TOKEN_KEY = 'SlickAI_auth_token';
const SECURE_STORE_USER_KEY = 'SlickAI_auth_user';
const SECURE_STORE_REFRESH_KEY = 'SlickAI_refresh_token';
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthUser {
  userId: string;
  email: string;
  provider?: 'email' | 'google' | 'apple';
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
  isLoading: boolean;

  // Actions
  login: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (user: AuthUser, token: string, refreshToken?: string) => Promise<void>;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setLoading: (loading: boolean) => void;
  loadStoredAuth: () => Promise<void>;
  isLockedOut: () => boolean;
  getLockoutRemainingMs: () => number;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  failedAttempts: 0,
  lockedUntil: null,
  isLoading: false,

  login: async (user: AuthUser, token: string, refreshToken?: string) => {
    await SecureStore.setItemAsync(SECURE_STORE_TOKEN_KEY, token);
    await SecureStore.setItemAsync(SECURE_STORE_USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      await SecureStore.setItemAsync(SECURE_STORE_REFRESH_KEY, refreshToken);
    }
    set({
      user,
      token,
      refreshToken: refreshToken ?? get().refreshToken,
      isAuthenticated: true,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY);
    await SecureStore.deleteItemAsync(SECURE_STORE_USER_KEY);
    await SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_KEY);
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },

  register: async (user: AuthUser, token: string, refreshToken?: string) => {
    await SecureStore.setItemAsync(SECURE_STORE_TOKEN_KEY, token);
    await SecureStore.setItemAsync(SECURE_STORE_USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      await SecureStore.setItemAsync(SECURE_STORE_REFRESH_KEY, refreshToken);
    }
    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
      failedAttempts: 0,
      lockedUntil: null,
    });
  },

  incrementFailedAttempts: () => {
    const { failedAttempts } = get();
    const newCount = failedAttempts + 1;
    const lockedUntil =
      newCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_DURATION_MS)
        : null;
    set({ failedAttempts: newCount, lockedUntil });
  },

  resetFailedAttempts: () => {
    set({ failedAttempts: 0, lockedUntil: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(SECURE_STORE_USER_KEY);
      const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_REFRESH_KEY);
      if (token && userJson) {
        const user: AuthUser = JSON.parse(userJson) as AuthUser;
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
      }
    } catch {
      // Ignore secure store errors on load
    } finally {
      set({ isLoading: false });
    }
  },

  isLockedOut: () => {
    const { lockedUntil } = get();
    if (!lockedUntil) return false;
    return new Date() < lockedUntil;
  },

  getLockoutRemainingMs: () => {
    const { lockedUntil } = get();
    if (!lockedUntil) return 0;
    const remaining = lockedUntil.getTime() - Date.now();
    return Math.max(0, remaining);
  },
}));
