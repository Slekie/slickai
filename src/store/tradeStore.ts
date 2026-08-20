import { create } from 'zustand';

export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'pending' | 'open' | 'closed' | 'cancelled' | 'error';
export type TradeCloseReason =
  | 'take_profit'
  | 'stop_loss'
  | 'manual'
  | 'timeout'
  | 'circuit_breaker';

export interface Trade {
  tradeId: string;
  userAccountId: string;
  asset: string;
  direction: TradeDirection;
  entryTime: string;
  entryPrice: string;
  positionSize: string;
  stopLoss: string;
  takeProfit: string;
  exitTime: string | null;
  exitPrice: string | null;
  profitLoss: string | null;
  profitLossPercentage: number | null;
  closeReason: TradeCloseReason | null;
  modelVersion: string;
  confidence: number;
  status: TradeStatus;
}

export interface OpenPosition extends Trade {
  unrealizedPnl: string;
  unrealizedPnlPercentage: number;
  currentPrice: string;
}

export interface PerformanceSummary {
  totalPnl: string;
  winRate: number;
  tradeCount: number;
  openPositionCount: number;
  period: '1D' | '7D' | '30D' | 'ALL';
}

export interface TradeState {
  trades: Trade[];
  openPositions: OpenPosition[];
  performanceSummary: PerformanceSummary | null;
  selectedPeriod: '1D' | '7D' | '30D' | 'ALL';
  isLoading: boolean;
  error: string | null;

  // Actions
  setTrades: (trades: Trade[]) => void;
  addTrade: (trade: Trade) => void;
  closeTrade: (tradeId: string, exitPrice: string, profitLoss: string) => void;
  setOpenPositions: (positions: OpenPosition[]) => void;
  updatePosition: (tradeId: string, updates: Partial<OpenPosition>) => void;
  setPerformanceSummary: (summary: PerformanceSummary) => void;
  setSelectedPeriod: (period: '1D' | '7D' | '30D' | 'ALL') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  trades: [],
  openPositions: [],
  performanceSummary: null,
  selectedPeriod: '7D',
  isLoading: false,
  error: null,

  setTrades: (trades) => set({ trades }),

  addTrade: (trade) =>
    set((state) => ({ trades: [trade, ...state.trades] })),

  closeTrade: (tradeId, exitPrice, profitLoss) =>
    set((state) => ({
      trades: state.trades.map((t) =>
        t.tradeId === tradeId
          ? {
              ...t,
              status: 'closed' as TradeStatus,
              exitPrice,
              profitLoss,
              exitTime: new Date().toISOString(),
            }
          : t
      ),
      openPositions: state.openPositions.filter((p) => p.tradeId !== tradeId),
    })),

  setOpenPositions: (openPositions) => set({ openPositions }),

  updatePosition: (tradeId, updates) =>
    set((state) => ({
      openPositions: state.openPositions.map((p) =>
        p.tradeId === tradeId ? { ...p, ...updates } : p
      ),
    })),

  setPerformanceSummary: (performanceSummary) => set({ performanceSummary }),

  setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
