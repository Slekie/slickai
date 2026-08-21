/**
 * authStore unit tests
 * Validates: Requirements 3.7, 3.8, 3.9, 3.10
 */

// Mock expo-secure-store so tests run without native modules
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _store: store, // exposed for assertions
  };
});

import { useAuthStore } from '../store/authStore';

const mockUser = { userId: 'u1', email: 'test@example.com' };

// Reset store state between tests
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    failedAttempts: 0,
    lockedUntil: null,
    isLoading: false,
  });
});

describe('authStore — login', () => {
  it('sets isAuthenticated to true and stores token on login', async () => {
    await useAuthStore.getState().login(mockUser, 'jwt-token-abc');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('jwt-token-abc');
    expect(state.user?.email).toBe('test@example.com');
  });

  it('stores refreshToken when provided', async () => {
    await useAuthStore.getState().login(mockUser, 'jwt', 'refresh-xyz');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-xyz');
  });

  it('resets failedAttempts on successful login', async () => {
    useAuthStore.setState({ failedAttempts: 2 });
    await useAuthStore.getState().login(mockUser, 'jwt');
    expect(useAuthStore.getState().failedAttempts).toBe(0);
  });
});

describe('authStore — failed attempts', () => {
  it('increments failedAttempts on each call', () => {
    useAuthStore.getState().incrementFailedAttempts();
    expect(useAuthStore.getState().failedAttempts).toBe(1);
    useAuthStore.getState().incrementFailedAttempts();
    expect(useAuthStore.getState().failedAttempts).toBe(2);
  });

  it('sets lockedUntil ~15 minutes in the future on 3rd failure', () => {
    useAuthStore.setState({ failedAttempts: 2 });
    const before = Date.now();
    useAuthStore.getState().incrementFailedAttempts();
    const { lockedUntil } = useAuthStore.getState();
    expect(lockedUntil).not.toBeNull();
    const lockMs = lockedUntil!.getTime();
    expect(lockMs).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(lockMs).toBeLessThanOrEqual(before + 16 * 60 * 1000);
  });

  it('does not set lockedUntil before 3rd failure', () => {
    useAuthStore.getState().incrementFailedAttempts();
    useAuthStore.getState().incrementFailedAttempts();
    expect(useAuthStore.getState().lockedUntil).toBeNull();
  });
});

describe('authStore — isLockedOut', () => {
  it('returns true when lockedUntil is in the future', () => {
    useAuthStore.setState({
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
    });
    expect(useAuthStore.getState().isLockedOut()).toBe(true);
  });

  it('returns false when lockedUntil is null', () => {
    useAuthStore.setState({ lockedUntil: null });
    expect(useAuthStore.getState().isLockedOut()).toBe(false);
  });

  it('returns false when lockedUntil is in the past', () => {
    useAuthStore.setState({
      lockedUntil: new Date(Date.now() - 1000),
    });
    expect(useAuthStore.getState().isLockedOut()).toBe(false);
  });
});

describe('authStore — logout', () => {
  it('clears all auth state on logout', async () => {
    await useAuthStore.getState().login(mockUser, 'jwt', 'refresh');
    await useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });
});

describe('authStore — loadStoredAuth', () => {
  it('restores token and user from SecureStore', async () => {
    // Store values first
    await useAuthStore.getState().login(mockUser, 'stored-jwt', 'stored-refresh');
    // Reset in-memory state to simulate app restart
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    // Reload from store
    await useAuthStore.getState().loadStoredAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('stored-jwt');
    expect(state.user?.email).toBe('test@example.com');
  });
});
