/**
 * signalService tests
 *
 * Bug 3 — Exploration test: signalService.getSignals returns wrapper object
 *
 * Bug condition: apiClient.get<Signal[]> is typed incorrectly; `return response.data`
 * returns the full wrapper `{ success, signals, total }` rather than a `Signal[]`.
 *
 * This test MUST FAIL on unfixed code (confirms the bug exists).
 * After the fix (return response.data.signals ?? []) it should PASS.
 *
 * Validates: Requirements 1.3, 2.3
 *
 * Preservation tests — §3.4
 * These tests MUST PASS on unfixed code (non-buggy paths).
 * Validates: Requirements 3.4
 */

// Mock the entire apiClient module so we control what `get` returns
jest.mock('../services/apiClient', () => ({
  createAuthenticatedClient: jest.fn(() => ({
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  })),
}));

import * as fc from 'fast-check';
import { createAuthenticatedClient } from '../services/apiClient';
import { signalService } from '../services/signalService';
import type { Signal } from '../store/signalStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMockSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    signalId: 'sig-001',
    userAccountId: 'user-123',
    asset: 'EURUSD',
    direction: 'BUY',
    entryPrice: '1.1000',
    stopLoss: '1.0950',
    takeProfit: '1.1100',
    confidence: 85,
    modelVersion: 'v1',
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: 'pending',
    ...overrides,
  };
}

// ── Bug 3 exploration test ────────────────────────────────────────────────────

describe('signalService.getSignals — Bug 3: response unwrap', () => {
  let mockGet: jest.Mock;

  beforeEach(() => {
    // Grab the mocked `get` from the factory returned client
    const mockClient = (createAuthenticatedClient as jest.Mock).mock.results[0]?.value ?? {
      get: jest.fn(),
      defaults: { headers: { common: {} } },
    };
    mockGet = mockClient.get as jest.Mock;
  });

  it('returns a Signal[] (not a wrapper object) when the API responds with { success, signals, total }', async () => {
    const mockSignal = makeMockSignal();

    // Simulate the actual API response shape: a wrapper object
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        signals: [mockSignal],
        total: 1,
      },
    });

    const result = await signalService.getSignals();

    // On UNFIXED code: result === { success: true, signals: [...], total: 1 }
    // Array.isArray returns false  → test FAILS  → bug confirmed
    //
    // On FIXED code:  result === [mockSignal]
    // Array.isArray returns true   → test PASSES → bug resolved
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect((result as Signal[])[0].signalId).toBe('sig-001');
  });

  it('returns an empty array when the API signals field is absent', async () => {
    mockGet.mockResolvedValueOnce({
      data: {},
    });

    const result = await signalService.getSignals();

    // On UNFIXED code: result === {} — Array.isArray is false → test FAILS
    // On FIXED code:   result === [] — Array.isArray is true  → test PASSES
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ── Preservation §3.4: Query params forwarded unchanged ─────────────────────

/**
 * Preservation Property — §3.4
 * For any combination of limit, offset, status params, getSignals forwards them
 * to the API URL unchanged.
 *
 * MUST PASS on unfixed code — the params forwarding path is non-buggy.
 * Validates: Requirements 3.4
 */
describe('signalService.getSignals — Preservation §3.4: query params forwarded unchanged', () => {
  let mockGet: jest.Mock;

  beforeEach(() => {
    const mockClient = (createAuthenticatedClient as jest.Mock).mock.results[0]?.value ?? {
      get: jest.fn(),
      defaults: { headers: { common: {} } },
    };
    mockGet = mockClient.get as jest.Mock;
    mockGet.mockReset();
    // Always resolve with a valid wrapper so the call doesn't throw
    mockGet.mockResolvedValue({
      data: { success: true, signals: [], total: 0 },
    });
  });

  it('forwards limit, offset, and status params to apiClient.get unchanged (concrete case)', async () => {
    await signalService.getSignals({ limit: 10, offset: 5, status: 'pending' });

    expect(mockGet).toHaveBeenCalledTimes(1);
    const [, config] = mockGet.mock.calls[0];
    expect(config).toEqual({ params: { limit: 10, offset: 5, status: 'pending' } });
  });

  it('forwards only limit when offset and status are omitted', async () => {
    await signalService.getSignals({ limit: 20 });

    const [, config] = mockGet.mock.calls[0];
    expect(config.params).toEqual({ limit: 20 });
  });

  it('passes no params object when called with no arguments', async () => {
    await signalService.getSignals();

    const [, config] = mockGet.mock.calls[0];
    // params is undefined (or absent) when nothing is passed
    expect(config.params).toBeUndefined();
  });

  /**
   * Property-based: for any combination of limit (1–200), offset (0–1000),
   * and status values, the exact same params object must be forwarded.
   *
   * Validates: Requirements 3.4
   */
  it('PBT — forwards any combination of params unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          limit: fc.integer({ min: 1, max: 200 }),
          offset: fc.integer({ min: 0, max: 1000 }),
          status: fc.oneof(
            fc.constant('pending'),
            fc.constant('delivered'),
            fc.constant('expired'),
            fc.constant('failed'),
          ),
        }),
        async (params) => {
          mockGet.mockReset();
          mockGet.mockResolvedValue({
            data: { success: true, signals: [], total: 0 },
          });

          await signalService.getSignals(params);

          const [, config] = mockGet.mock.calls[0];
          // Each param must appear in the outgoing config with its original value
          return (
            config.params.limit === params.limit &&
            config.params.offset === params.offset &&
            config.params.status === params.status
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
