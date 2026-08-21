/**
 * signalStore + tradeStore unit tests
 * Validates: Requirements 10.4, 12.1
 */

import { useSignalStore, Signal } from '../store/signalStore';
import { useTradeStore, Trade, OpenPosition } from '../store/tradeStore';

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
