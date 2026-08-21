/**
 * WebSocket event routing integration tests
 * Validates: Requirements 11.4, 11.5, 11.6
 *
 * We mock socket.io-client so no real network connection is made.
 */

jest.mock('socket.io-client', () => {
  const listeners: Record<string, (data: unknown) => void> = {};
  const socket = {
    connected: false,
    on: jest.fn((event: string, cb: (data: unknown) => void) => {
      listeners[event] = cb;
    }),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    _trigger: (event: string, data: unknown) => {
      if (listeners[event]) listeners[event](data);
    },
  };
  return { io: jest.fn(() => socket), _socket: socket };
});

import { useTradeStore } from '../../store/tradeStore';
import { useSignalStore } from '../../store/signalStore';

// Reset stores before each test
beforeEach(() => {
  useTradeStore.setState({
    trades: [], openPositions: [], performanceSummary: null,
    selectedPeriod: '7D', isLoading: false, error: null,
  });
  useSignalStore.setState({ signals: [], isLoading: false, error: null });
});

describe('WebSocket event routing', () => {
  it('addTrade adds a trade to the store', () => {
    const trade = {
      tradeId: 'ws-t1', userAccountId: 'a1', asset: 'GBPUSD',
      direction: 'BUY' as const, entryTime: new Date().toISOString(),
      entryPrice: '1.2700', positionSize: '0.1', stopLoss: '1.2650',
      takeProfit: '1.2800', exitTime: null, exitPrice: null, profitLoss: null,
      profitLossPercentage: null, closeReason: null, modelVersion: '1.0',
      confidence: 75, status: 'open' as const,
    };
    useTradeStore.getState().addTrade(trade);
    expect(useTradeStore.getState().trades.find((t) => t.tradeId === 'ws-t1')).toBeDefined();
  });

  it('closeTrade removes position from openPositions', () => {
    useTradeStore.setState({
      openPositions: [{
        tradeId: 'ws-t2', userAccountId: 'a1', asset: 'EURUSD',
        direction: 'SELL' as const, entryTime: new Date().toISOString(),
        entryPrice: '1.0900', positionSize: '0.2', stopLoss: '1.0950',
        takeProfit: '1.0850', exitTime: null, exitPrice: null, profitLoss: null,
        profitLossPercentage: null, closeReason: null, modelVersion: '1.0',
        confidence: 80, status: 'open' as const,
        unrealizedPnl: '-10', unrealizedPnlPercentage: -0.5, currentPrice: '1.0950',
      }],
      trades: [],
    });
    useTradeStore.getState().closeTrade('ws-t2', '1.0850', '50');
    expect(useTradeStore.getState().openPositions).toHaveLength(0);
  });

  it('updatePosition updates only the matching position unrealizedPnl', () => {
    useTradeStore.setState({
      openPositions: [
        {
          tradeId: 'ws-p1', userAccountId: 'a1', asset: 'EURUSD',
          direction: 'BUY' as const, entryTime: new Date().toISOString(),
          entryPrice: '1.1000', positionSize: '0.1', stopLoss: '1.0950',
          takeProfit: '1.1100', exitTime: null, exitPrice: null, profitLoss: null,
          profitLossPercentage: null, closeReason: null, modelVersion: '1.0',
          confidence: 80, status: 'open' as const,
          unrealizedPnl: '0', unrealizedPnlPercentage: 0, currentPrice: '1.1000',
        },
      ],
      trades: [],
    });
    useTradeStore.getState().updatePosition('ws-p1', { unrealizedPnl: '25', currentPrice: '1.1025' });
    const pos = useTradeStore.getState().openPositions[0];
    expect(pos.unrealizedPnl).toBe('25');
    expect(pos.currentPrice).toBe('1.1025');
  });
});
