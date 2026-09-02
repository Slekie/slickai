import { createAuthenticatedClient } from './apiClient';
import { API_BASE_URL, ENDPOINTS } from '../config/api';
import type { OpenPosition, PerformanceSummary, Trade } from '../store/tradeStore';

const apiClient = createAuthenticatedClient(API_BASE_URL);

type BackendTradeListResponse = { trades?: Trade[] };
type BackendPositionsResponse = { open_positions?: Array<Record<string, unknown>> };
type BackendPerformanceResponse = {
  total_profit_loss: number;
  win_rate: number;
  total_trades: number;
  open_positions: number;
  equity_curve?: Array<{ date: string; equity: number }>;
};

function mapOpenPosition(position: Record<string, unknown>): OpenPosition {
  return {
    tradeId: String(position.trade_id ?? position.tradeId ?? ''),
    userAccountId: String(position.user_account_id ?? position.userAccountId ?? ''),
    asset: String(position.asset ?? ''),
    direction: position.direction as OpenPosition['direction'],
    entryTime: String(position.entry_time ?? position.entryTime ?? ''),
    entryPrice: String(position.entry_price ?? position.entryPrice ?? '0'),
    positionSize: String(position.position_size ?? position.positionSize ?? '0'),
    stopLoss: String(position.stop_loss ?? position.stopLoss ?? '0'),
    takeProfit: String(position.take_profit ?? position.takeProfit ?? '0'),
    exitTime: null,
    exitPrice: null,
    profitLoss: null,
    profitLossPercentage: null,
    closeReason: null,
    modelVersion: String(position.model_version ?? position.modelVersion ?? ''),
    confidence: Number(position.confidence ?? 0),
    status: 'open',
    unrealizedPnl: String(position.unrealized_pnl ?? position.unrealizedPnl ?? '0'),
    unrealizedPnlPercentage: Number(position.unrealized_pnl_percentage ?? position.unrealizedPnlPercentage ?? 0),
    currentPrice: String(position.current_price ?? position.currentPrice ?? '0'),
  };
}

export const tradeService = {
  setAuthToken: (token: string) => {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /**
   * Fetch trade history.
   */
  getTrades: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<Trade[]> => {
    const response = await apiClient.get<BackendTradeListResponse>(ENDPOINTS.trades.list, {
      params,
    });
    return response.data.trades ?? [];
  },

  /**
   * Fetch a single trade by ID.
   */
  getTrade: async (tradeId: string): Promise<Trade> => {
    const response = await apiClient.get<Trade>(
      ENDPOINTS.trades.detail(tradeId)
    );
    return response.data;
  },

  /**
   * Fetch open positions with unrealized P&L.
   */
  getOpenPositions: async (): Promise<OpenPosition[]> => {
    const response = await apiClient.get<BackendPositionsResponse>(
      ENDPOINTS.performance.positions
    );
    return (response.data.open_positions ?? []).map(mapOpenPosition);
  },

  /**
   * Fetch performance summary for the given period.
   */
  getPerformanceSummary: async (
    period: '1D' | '7D' | '30D' | 'ALL' = '7D'
  ): Promise<PerformanceSummary> => {
    const backendPeriod = period.toLowerCase() as '1d' | '7d' | '30d' | 'all';
    const response = await apiClient.get<BackendPerformanceResponse>(
      ENDPOINTS.performance.summary,
      { params: { period: backendPeriod } }
    );
    return {
      totalPnl: String(response.data.total_profit_loss ?? 0),
      winRate: response.data.win_rate ?? 0,
      tradeCount: response.data.total_trades ?? 0,
      openPositionCount: response.data.open_positions ?? 0,
      period,
    };
  },

  /**
   * Fetch equity curve data points for the given period.
   * Returns an empty array if the endpoint returns 404 (no trade history yet).
   */
  getEquityCurve: async (
    period: '1D' | '7D' | '30D' | 'ALL' = '7D'
  ): Promise<{ timestamp: string; equity: number }[]> => {
    const backendPeriod = period.toLowerCase() as '1d' | '7d' | '30d' | 'all';
    const response = await apiClient.get<BackendPerformanceResponse>(
      ENDPOINTS.performance.summary,
      { params: { period: backendPeriod } },
    );
    return (response.data.equity_curve ?? []).map((point) => ({
      timestamp: point.date,
      equity: point.equity,
    }));
  },
};
