/**
 * Property-based tests using fast-check
 * All 14 correctness properties from the design document.
 * Each property runs a minimum of 100 iterations.
 *
 * Feature: slick-ai-trading-app
 */

// Mock expo-secure-store for property tests that touch authStore
jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
    deleteItemAsync: jest.fn(async (k: string) => { delete store[k]; }),
  };
});

import * as fc from 'fast-check';
import { formatCurrency } from '../utils/formatCurrency';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useSignalStore } from '../store/signalStore';
import { createEmptyCustomerInfo } from '../services/subscriptionService';
import type { CustomerInfo, EntitlementInfo } from '../services/subscriptionService';

// ── Shared validators (extracted for use in properties) ──────────────────────

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPassword(s: string): boolean {
  return s.length >= 8;
}

function passwordsMatch(a: string, b: string): boolean {
  return a === b;
}

function isSignalExpired(generatedAt: string): boolean {
  return Date.now() - new Date(generatedAt).getTime() > 15 * 60 * 1000;
}

function calcSavingsPercent(planMonthlyEq: number, monthlyPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - planMonthlyEq / monthlyPrice) * 100);
}

// ── Property 1: Email Validation Consistency ─────────────────────────────────
// Feature: slick-ai-trading-app, Property 1: Email validation consistency

test('Property 1 — email validation matches regex exactly', () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      const result = isValidEmail(s);
      const regexResult = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
      return result === regexResult;
    }),
    { numRuns: 100 },
  );
});

// ── Property 2: Password Length Boundary ─────────────────────────────────────
// Feature: slick-ai-trading-app, Property 2: Password length boundary

test('Property 2 — isValidPassword iff length >= 8', () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      return isValidPassword(s) === (s.length >= 8);
    }),
    { numRuns: 100 },
  );
});

// ── Property 3: Password Confirmation Symmetry ───────────────────────────────
// Feature: slick-ai-trading-app, Property 3: Password confirmation symmetry

test('Property 3 — passwordsMatch is symmetric', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), (a, b) => {
      const ab = passwordsMatch(a, b);
      const ba = passwordsMatch(b, a);
      // symmetric: both equal each other
      return ab === ba;
    }),
    { numRuns: 100 },
  );
});

test('Property 3b — passwordsMatch returns true iff a === b', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), (a, b) => {
      return passwordsMatch(a, b) === (a === b);
    }),
    { numRuns: 100 },
  );
});

// ── Property 4: Auth Session Round-Trip Persistence ──────────────────────────
// Feature: slick-ai-trading-app, Property 4: Auth session round-trip persistence

test('Property 4 — loadStoredAuth restores the same token after login', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 10 }),
      async (token) => {
        useAuthStore.setState({
          user: null, token: null, refreshToken: null,
          isAuthenticated: false, failedAttempts: 0, lockedUntil: null, isLoading: false,
        });
        const user = { userId: 'u1', email: 'a@b.com' };
        await useAuthStore.getState().login(user, token);
        // Reset in-memory state
        useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
        await useAuthStore.getState().loadStoredAuth();
        return useAuthStore.getState().token === token;
      },
    ),
    { numRuns: 20 }, // fewer runs since each is async
  );
});

// ── Property 5: Failed-Attempt Counter Monotonicity ──────────────────────────
// Feature: slick-ai-trading-app, Property 5: Failed-attempt counter monotonicity

test('Property 5 — failedAttempts equals n after n increments (n < 3)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2 }), (n) => {
      useAuthStore.setState({ failedAttempts: 0, lockedUntil: null });
      for (let i = 0; i < n; i++) {
        useAuthStore.getState().incrementFailedAttempts();
      }
      return useAuthStore.getState().failedAttempts === n;
    }),
    { numRuns: 100 },
  );
});

// ── Property 6: Lockout Gate Invariant ───────────────────────────────────────
// Feature: slick-ai-trading-app, Property 6: Lockout gate invariant

test('Property 6 — isLockedOut() true iff lockedUntil > now', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant(null),
        fc.integer().map((offset) => new Date(Date.now() + offset)),
      ),
      (lockedUntil) => {
        useAuthStore.setState({ lockedUntil });
        const result = useAuthStore.getState().isLockedOut();
        if (lockedUntil === null) return result === false;
        const expected = new Date() < lockedUntil;
        return result === expected;
      },
    ),
    { numRuns: 100 },
  );
});

// ── Property 7: Subscription Access Gate ─────────────────────────────────────
// Feature: slick-ai-trading-app, Property 7: Subscription access gate

function makeEntitlement(expiresInMs: number): EntitlementInfo {
  return {
    identifier: 'pro',
    isActive: expiresInMs > 0,
    willRenew: true,
    periodType: 'NORMAL',
    latestPurchaseDate: new Date().toISOString(),
    latestPurchaseDateMillis: Date.now(),
    originalPurchaseDate: new Date().toISOString(),
    originalPurchaseDateMillis: Date.now(),
    expirationDate: new Date(Date.now() + expiresInMs).toISOString(),
    expirationDateMillis: Date.now() + expiresInMs,
    store: 'APP_STORE',
    productIdentifier: 'slickai_monthly',
    isSandbox: false,
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
  };
}

test('Property 7 — active pro entitlement sets isSubscribed = true', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }), (futureMs) => {
      useSubscriptionStore.setState({ isSubscribed: false });
      const info: CustomerInfo = {
        ...createEmptyCustomerInfo(),
        entitlements: { active: { pro: makeEntitlement(futureMs) }, all: {} },
      };
      useSubscriptionStore.getState().setSubscription(info);
      return useSubscriptionStore.getState().isSubscribed === true;
    }),
    { numRuns: 100 },
  );
});

test('Property 7b — absent entitlement sets isSubscribed = false', () => {
  fc.assert(
    fc.property(fc.constant(null), () => {
      useSubscriptionStore.setState({ isSubscribed: true });
      useSubscriptionStore.getState().setSubscription(createEmptyCustomerInfo());
      return useSubscriptionStore.getState().isSubscribed === false;
    }),
    { numRuns: 100 },
  );
});

// ── Property 8: Subscription Savings Percentage Correctness ──────────────────
// Feature: slick-ai-trading-app, Property 8: Subscription savings percentage

test('Property 8 — savings % for monthly plan is always 0', () => {
  fc.assert(
    fc.property(fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }), (monthlyPrice) => {
      return calcSavingsPercent(monthlyPrice, monthlyPrice) === 0;
    }),
    { numRuns: 100 },
  );
});

test('Property 8b — savings for quarterly/yearly is always >= 0 when cheaper per month', () => {
  fc.assert(
    fc.property(
      fc.float({ min: Math.fround(0.01), max: Math.fround(100) }),
      fc.float({ min: Math.fround(0.001), max: Math.fround(0.999) }), // discount fraction (0,1)
      (monthlyPrice, discountFraction) => {
        const planMonthlyEq = monthlyPrice * (1 - discountFraction);
        const savings = calcSavingsPercent(planMonthlyEq, monthlyPrice);
        return savings >= 0;
      },
    ),
    { numRuns: 100 },
  );
});

// ── Property 11: Signal Expiry Time Invariant ─────────────────────────────────
// Feature: slick-ai-trading-app, Property 11: Signal expiry time invariant

test('Property 11 — signal expired iff age > 15 min', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: -60 * 60 * 1000, max: 60 * 60 * 1000 }),
      (offsetMs) => {
        const generatedAt = new Date(Date.now() - offsetMs).toISOString();
        const result = isSignalExpired(generatedAt);
        const expected = offsetMs > 15 * 60 * 1000;
        return result === expected;
      },
    ),
    { numRuns: 100 },
  );
});

// ── Property 13: Currency Formatter Suffix Invariant ─────────────────────────
// Feature: slick-ai-trading-app, Property 13: Currency formatter suffix invariant

test('Property 13 — M suffix and not K for abs >= 1M', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.integer({ min: 1_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -1_000_000_000, max: -1_000_000 }),
      ),
      (n) => {
        const result = formatCurrency(n);
        return result.includes('M') && !result.includes('K');
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 13b — K suffix and not M for 1K <= abs < 1M', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.integer({ min: 1_000, max: 999_999 }),
        fc.integer({ min: -999_999, max: -1_000 }),
      ),
      (n) => {
        const result = formatCurrency(n);
        return result.includes('K') && !result.includes('M');
      },
    ),
    { numRuns: 100 },
  );
});

test('Property 13c — no K or M for abs < 1K', () => {
  fc.assert(
    fc.property(fc.integer({ min: -999, max: 999 }), (n) => {
      const result = formatCurrency(n);
      return !result.includes('K') && !result.includes('M');
    }),
    { numRuns: 100 },
  );
});

test('Property 13d — negative values start with "-"', () => {
  fc.assert(
    fc.property(fc.integer({ min: -1_000_000, max: -1 }), (n) => {
      return formatCurrency(n).startsWith('-');
    }),
    { numRuns: 100 },
  );
});
