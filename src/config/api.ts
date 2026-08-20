// ── API Configuration ─────────────────────────────────────────────────────────
// Override API_BASE_URL via EAS environment variables in eas.json.

export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) ?? 'https://api.slickai.com';

export const WS_URL: string =
  (process.env.EXPO_PUBLIC_WS_URL as string) ?? 'wss://api.slickai.com';

export const API_TIMEOUT_MS = 15_000;

export const ENDPOINTS = {
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  refreshToken: '/auth/refresh',
  biometric: '/auth/biometric',

  // Accounts
  accounts: '/accounts',
  connectAccount: '/accounts/connect',
  disconnectAccount: (id: string) => `/accounts/${id}`,
  derivListAccounts: '/accounts/deriv/list-accounts',
  subscriptionMode: '/settings/subscription-mode',

  // Signals
  signals: '/signals',

  // Trades
  openPositions: '/trades/open',
  closedTrades: '/trades',
  performance: (period: string) => `/trades/performance/${period}`,

  // Notifications
  registerPushToken: '/notifications/register',
} as const;
