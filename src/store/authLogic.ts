/**
 * Pure auth business logic — no framework dependencies.
 * Tested by authStore.test.ts.
 */

export const MAX_FAILED_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface AuthStateSnapshot {
  failedAttempts: number;
  lockedUntil: Date | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * Compute updated state after a failed login attempt.
 */
export function applyFailedAttempt(
  current: AuthStateSnapshot
): AuthStateSnapshot {
  const newCount = current.failedAttempts + 1;
  const lockedUntil =
    newCount >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : current.lockedUntil;
  return { ...current, failedAttempts: newCount, lockedUntil };
}

/**
 * Check if the account is currently locked out.
 */
export function isLockedOut(state: AuthStateSnapshot): boolean {
  if (!state.lockedUntil) return false;
  return new Date() < state.lockedUntil;
}

/**
 * Compute remaining lockout time in milliseconds.
 */
export function getLockoutRemainingMs(state: AuthStateSnapshot): number {
  if (!state.lockedUntil) return 0;
  return Math.max(0, state.lockedUntil.getTime() - Date.now());
}

/**
 * Produce a logged-in state snapshot.
 */
export function applyLogin(
  _current: AuthStateSnapshot,
  token: string
): AuthStateSnapshot {
  return {
    token,
    isAuthenticated: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

/**
 * Produce a logged-out state snapshot.
 */
export function applyLogout(_current: AuthStateSnapshot): AuthStateSnapshot {
  return {
    token: null,
    isAuthenticated: false,
    failedAttempts: 0,
    lockedUntil: null,
  };
}

/**
 * Reset failed attempts and clear lockout.
 */
export function resetFailedAttempts(
  current: AuthStateSnapshot
): AuthStateSnapshot {
  return { ...current, failedAttempts: 0, lockedUntil: null };
}
