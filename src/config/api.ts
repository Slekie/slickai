// ── API Configuration ─────────────────────────────────────────────────────────
// Override API_BASE_URL via EAS environment variables in eas.json.

export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) ?? 'https://api.slickai.com';

export const WS_URL: string =
  (process.env.EXPO_PUBLIC_WS_URL as string) ?? 'wss://api.slickai.com';

export const API_TIMEOUT_MS = 15_000;

export const ENDPOINTS = {
  auth: {
    login:     '/auth/login',
    register:  '/auth/register',
    refresh:   '/auth/refresh',
    biometric: '/auth/biometric',
    google:    '/auth/google',
    apple:     '/auth/apple',
  },

  accounts: {
    list:             '/accounts',
    connect:          '/accounts/connect',
    disconnect:       (id: string) => `/accounts/${id}`,
    derivListAccounts:'/accounts/deriv/list-accounts',
  },

  settings: {
    subscriptionMode: '/settings/subscription-mode',
  },

  signals: {
    list: '/signals',
  },

  trades: {
    list:   '/trades',
    detail: (id: string) => `/trades/${id}`,
  },

  performance: {
    positions: '/trades/open',
    summary:   '/trades/performance',
  },

  notifications: {
    register: '/notifications/register',
  },
} as const;
