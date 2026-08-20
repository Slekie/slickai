import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import { accountService } from '../services/accountService';
import { signalService } from '../services/signalService';
import { tradeService } from '../services/tradeService';
import { websocketService } from '../services/websocketService';

/**
 * Hook that provides auth actions and state from the auth store.
 * Also wires auth token into all API services.
 */
export function useAuth() {
  const store = useAuthStore();

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (store.isLockedOut()) {
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      store.setLoading(true);
      try {
        const { user, token } = await authService.login(email, password);
        await store.login(user, token);
        _setTokenOnServices(token);
        store.resetFailedAttempts();
      } catch (err) {
        store.incrementFailedAttempts();
        throw err;
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const register = useCallback(
    async (email: string, password: string): Promise<void> => {
      store.setLoading(true);
      try {
        const { user, token } = await authService.register(email, password);
        await store.register(user, token);
        _setTokenOnServices(token);
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const loginWithBiometrics = useCallback(async (): Promise<boolean> => {
    const available = await authService.isBiometricAvailable();
    if (!available) return false;

    const success = await authService.authenticateWithBiometrics();
    if (!success) return false;

    // If we already have a stored token, just return true
    if (store.token) {
      _setTokenOnServices(store.token);
      return true;
    }
    return false;
  }, [store]);

  const logout = useCallback(async (): Promise<void> => {
    websocketService.disconnect();
    await store.logout();
  }, [store]);

  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    failedAttempts: store.failedAttempts,
    isLockedOut: store.isLockedOut(),
    lockoutRemainingMs: store.getLockoutRemainingMs(),
    login,
    register,
    logout,
    loginWithBiometrics,
  };
}

function _setTokenOnServices(token: string): void {
  accountService.setAuthToken(token);
  signalService.setAuthToken(token);
  tradeService.setAuthToken(token);
  websocketService.setToken(token);
}
