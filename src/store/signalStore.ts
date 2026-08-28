import { create } from 'zustand';

export type SignalDirection = 'BUY' | 'SELL';
export type SignalStatus = 'pending' | 'delivered' | 'expired' | 'failed';

export interface Signal {
  signalId: string;
  userAccountId: string;
  asset: string;
  direction: SignalDirection;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  confidence: number;
  modelVersion: string;
  generatedAt: string;
  expiresAt: string;
  status: SignalStatus;
}

export interface SignalState {
  signals: Signal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  updateSignal: (signalId: string, updates: Partial<Signal>) => void;
  markExpiredSignals: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const SIGNAL_EXPIRY_MINUTES = 15;

export const useSignalStore = create<SignalState>((set, get) => ({
  signals: [],
  isLoading: false,
  error: null,

  setSignals: (signals) =>
    set({ signals: [...signals].sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )}),

  addSignal: (signal) =>
    set((state) => {
      if (state.signals.some((s) => s.signalId === signal.signalId)) return state;
      return { signals: [signal, ...state.signals] };
    }),

  updateSignal: (signalId, updates) =>
    set((state) => ({
      signals: state.signals.map((s) =>
        s.signalId === signalId ? { ...s, ...updates } : s
      ),
    })),

  markExpiredSignals: () => {
    const now = new Date();
    const { signals } = get();
    const updated = signals.map((s) => {
      if (s.status === 'expired') return s;
      const expiryMs = SIGNAL_EXPIRY_MINUTES * 60 * 1000;
      const age = now.getTime() - new Date(s.generatedAt).getTime();
      if (age > expiryMs) {
        return { ...s, status: 'expired' as SignalStatus };
      }
      return s;
    });
    set({ signals: updated });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
