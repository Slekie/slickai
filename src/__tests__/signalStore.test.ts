/**
 * signalStore + tradeStore unit tests
 * Validates: Requirements 10.4, 12.1
 */

import { useSignalStore, Signal } from '../store/signalStore';
import { useTradeStore, Trade, OpenPosition } from '../store/tradeStore';
import * as fc from 'fast-check';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    signalId: 's1',
    userAccountId: 'a1',
    asset: 'EURUSD',
    direction: 'BUY',
    entryPrice: '1.1000',
    stopLoss: '1.0950',
    takeProfit: '1.1100',
    confidence: 80,
    modelVersion: '1.0',
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: 'pending',
    ...overrides,
  };
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    tradeId: 't1',
    userAccountId: 'a1',
    asset: 'EURUSD',
    direction: 'BUY',
    entryTime: new Date().toISOString(),
    entryPrice: '1.1000',
    positionSize: '0.1',
    stopLoss: '1.0950',
    takeProfit: '1.1100',
    exitTime: null,
    exitPrice: null,
    profitLoss: null,
    profitLossPercentage: null,
    closeReason: null,
    modelVersion: '1.0',
    confidence: 80,
    status: 'open',
    ...overrides,
  };
}

function makePosition(overrides: Partial<OpenPosition> = {}): OpenPosition {
  return {
    ...makeTrade(),
    unrealizedPnl: '0',
    unrealizedPnlPercentage: 0,
    currentPrice: '1.1010',
    ...overrides,
  };
}

// ── signalStore ──────────────────────────────────────────────────────────────

beforeEach(() => {
  useSignalStore.setState({ signals: [], isLoading: false, error: null });
  useTradeStore.setState({
    trades: [],
    openPositions: [],
    performanceSummary: null,
    selectedPeriod: '7D',
    isLoading: false,
    error: null,
  });
});

describe('signalStore — markExpiredSignals', () => {
  it('marks signals older than 15 minutes as expired', () => {
    const old = makeSignal({
      signalId: 'old',
      generatedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    });
    useSignalStore.getState().addSignal(old);
    useSignalStore.getState().markExpiredSignals();
    const updated = useSignalStore.getState().signals.find((s) => s.signalId === 'old');
    expect(updated?.status).toBe('expired');
  });

  it('does NOT mark signals within 15 minutes as expired', () => {
    const fresh = makeSignal({
      signalId: 'fresh',
      generatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    });
    useSignalStore.getState().addSignal(fresh);
    useSignalStore.getState().markExpiredSignals();
    const updated = useSignalStore.getState().signals.find((s) => s.signalId === 'fresh');
    expect(updated?.status).not.toBe('expired');
  });

  it('leaves already-expired signals unchanged', () => {
    const alreadyExpired = makeSignal({
      signalId: 'expired',
      generatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      status: 'expired',
    });
    useSignalStore.getState().addSignal(alreadyExpired);
    useSignalStore.getState().markExpiredSignals();
    const updated = useSignalStore.getState().signals.find((s) => s.signalId === 'expired');
    expect(updated?.status).toBe('expired');
  });
});

describe('signalStore — addSignal', () => {
  it('prepends new signal to the list', () => {
    const s1 = makeSignal({ signalId: 's1' });
    const s2 = makeSignal({ signalId: 's2' });
    useSignalStore.getState().addSignal(s1);
    useSignalStore.getState().addSignal(s2);
    expect(useSignalStore.getState().signals[0].signalId).toBe('s2');
  });

  /**
   * Bug Condition Exploration Test — Bug 4: addSignal creates duplicates
   * Validates: Requirements 1.4, 2.4
   *
   * CRITICAL: This test MUST FAIL on unfixed code — failure confirms Bug 4 exists.
   * Bug condition: addSignal always prepends unconditionally regardless of existing signalId.
   * Expected behavior: calling addSignal twice with the same signalId must leave signals.length === 1.
   */
  it('BUG 4 EXPLORATION: does not create duplicate when addSignal called twice with same signalId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }),
        (signalId) => {
          // Reset store for each property iteration
          useSignalStore.setState({ signals: [], isLoading: false, error: null });

          const signal = makeSignal({ signalId });

          // Call addSignal twice with the identical signalId
          useSignalStore.getState().addSignal(signal);
          useSignalStore.getState().addSignal(signal);

          const { signals } = useSignalStore.getState();

          // Must not duplicate — only one entry per signalId
          const duplicates = signals.filter((s) => s.signalId === signalId);
          return duplicates.length === 1;
        },
      ),
    );
  });

  /**
   * Preservation §3.5 — addSignal prepends a new (unseen) signal at index 0
   *
   * For any signal whose signalId does NOT already exist in the store,
   * addSignal must prepend it so signals[0].signalId === signal.signalId.
   *
   * MUST PASS on unfixed code — this path is non-buggy.
   * Validates: Requirements 3.5
   */
  it('PRESERVATION §3.5: addSignal prepends a signal with a new signalId at index 0 (concrete)', () => {
    const existing = makeSignal({ signalId: 'existing-001' });
    useSignalStore.getState().addSignal(existing);

    const newSignal = makeSignal({ signalId: 'brand-new-999' });
    useSignalStore.getState().addSignal(newSignal);

    const { signals } = useSignalStore.getState();
    expect(signals[0].signalId).toBe('brand-new-999');
  });

  /**
   * Preservation §3.5 — PBT: for any unique signalId not in the store,
   * addSignal always puts it at index 0.
   *
   * Validates: Requirements 3.5
   */
  it('PRESERVATION §3.5: PBT — addSignal always prepends a genuinely new signalId at index 0', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty list of distinct IDs, use the last one as the "new" signal
        fc.array(fc.string({ minLength: 1, maxLength: 24 }), { minLength: 1, maxLength: 10 })
          .filter((ids) => new Set(ids).size === ids.length), // all distinct
        (ids) => {
          useSignalStore.setState({ signals: [], isLoading: false, error: null });

          // Pre-populate store with all signals except the last
          const priorIds = ids.slice(0, -1);
          const newId = ids[ids.length - 1];

          for (const id of priorIds) {
            useSignalStore.getState().addSignal(makeSignal({ signalId: id }));
          }

          // Add the new signal — its ID is guaranteed absent
          const newSignal = makeSignal({ signalId: newId });
          useSignalStore.getState().addSignal(newSignal);

          const { signals } = useSignalStore.getState();
          // Must be at index 0
          return signals[0].signalId === newId;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Preservation §3.7: setSignals bulk-replace, no duplicates ────────────────

/**
 * Preservation §3.7 — setSignals replaces the entire array.
 *
 * When the REST poll calls setSignals with N signals, the store always ends up
 * with exactly those N signals — regardless of what was already in the store.
 * Calling setSignals with signals that overlap what arrived via WebSocket never
 * produces duplicates, because setSignals is a full replacement.
 *
 * MUST PASS on unfixed code — setSignals is unaffected by Bug 4.
 * Validates: Requirements 3.7
 */
describe('signalStore — setSignals (Preservation §3.7)', () => {
  it('replaces the entire signal list — store contains exactly the supplied signals (concrete)', () => {
    // Pre-populate via addSignal (simulating WebSocket deliveries)
    useSignalStore.getState().addSignal(makeSignal({ signalId: 'ws-001' }));
    useSignalStore.getState().addSignal(makeSignal({ signalId: 'ws-002' }));

    // REST poll returns a fresh list that overlaps with the WebSocket signals
    const restSignals = [
      makeSignal({ signalId: 'ws-001' }), // overlap
      makeSignal({ signalId: 'rest-003' }),
    ];
    useSignalStore.getState().setSignals(restSignals);

    const { signals } = useSignalStore.getState();
    expect(signals).toHaveLength(2);
    expect(signals.map((s) => s.signalId).sort()).toEqual(['rest-003', 'ws-001'].sort());
  });

  it('PBT — setSignals with N signals always results in exactly N signals in the store', () => {
    fc.assert(
      fc.property(
        // Generate up to 20 signals with distinct IDs
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 0, maxLength: 20 },
        ).filter((ids) => new Set(ids).size === ids.length),
        (ids) => {
          useSignalStore.setState({ signals: [], isLoading: false, error: null });

          const batch = ids.map((id) => makeSignal({ signalId: id }));
          useSignalStore.getState().setSignals(batch);

          return useSignalStore.getState().signals.length === ids.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('PBT — calling setSignals twice with the same list yields no duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 1, maxLength: 15 },
        ).filter((ids) => new Set(ids).size === ids.length),
        (ids) => {
          useSignalStore.setState({ signals: [], isLoading: false, error: null });

          const batch = ids.map((id) => makeSignal({ signalId: id }));
          // Simulate WebSocket then REST poll delivering the same signals
          for (const s of batch) useSignalStore.getState().addSignal(s);
          useSignalStore.getState().setSignals(batch); // REST poll replaces

          const allIds = useSignalStore.getState().signals.map((s) => s.signalId);
          const uniqueIds = new Set(allIds);
          return allIds.length === uniqueIds.size;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── tradeStore ───────────────────────────────────────────────────────────────

describe('tradeStore — closeTrade', () => {
  it('removes position from openPositions', () => {
    const pos = makePosition({ tradeId: 'p1' });
    useTradeStore.setState({ openPositions: [pos] });
    useTradeStore.getState().closeTrade('p1', '1.1050', '50');
    expect(useTradeStore.getState().openPositions).toHaveLength(0);
  });

  it('updates the matching trade status to closed', () => {
    const trade = makeTrade({ tradeId: 'p1' });
    useTradeStore.setState({ trades: [trade] });
    useTradeStore.getState().closeTrade('p1', '1.1050', '50');
    const updated = useTradeStore.getState().trades.find((t) => t.tradeId === 'p1');
    expect(updated?.status).toBe('closed');
    expect(updated?.exitPrice).toBe('1.1050');
    expect(updated?.profitLoss).toBe('50');
  });

  it('does not affect other open positions', () => {
    const p1 = makePosition({ tradeId: 'p1' });
    const p2 = makePosition({ tradeId: 'p2' });
    useTradeStore.setState({ openPositions: [p1, p2] });
    useTradeStore.getState().closeTrade('p1', '1.1050', '50');
    const remaining = useTradeStore.getState().openPositions;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tradeId).toBe('p2');
  });
});

describe('tradeStore — updatePosition', () => {
  it('updates only the matching position', () => {
    const p1 = makePosition({ tradeId: 'p1', unrealizedPnl: '10' });
    const p2 = makePosition({ tradeId: 'p2', unrealizedPnl: '20' });
    useTradeStore.setState({ openPositions: [p1, p2] });
    useTradeStore.getState().updatePosition('p1', { unrealizedPnl: '99' });
    const positions = useTradeStore.getState().openPositions;
    expect(positions.find((p) => p.tradeId === 'p1')?.unrealizedPnl).toBe('99');
    expect(positions.find((p) => p.tradeId === 'p2')?.unrealizedPnl).toBe('20');
  });
});
