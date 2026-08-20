export const COLORS = {
  // Backgrounds
  bg: '#080B14',
  bgCard: '#0F1420',
  bgCardElevated: '#161B2E',
  bgModal: '#0A0D1A',

  // Brand
  primary: '#00C851',
  primaryDark: '#009E3F',
  primaryLight: 'rgba(0, 200, 81, 0.15)',

  // Semantic
  buy: '#00C851',
  sell: '#FF3B5C',
  warning: '#FF9500',
  info: '#0A84FF',

  // Text
  text: '#FFFFFF',
  textSecondary: '#8B9AB8',
  textMuted: '#4A5568',

  // Borders
  border: '#1E2840',
  borderLight: '#252D42',

  // Status
  active: '#00C851',
  inactive: '#4A5568',
  error: '#FF3B5C',

  // Gradients (use with LinearGradient — typed as readonly tuple)
  gradientBuy: ['#00C851', '#009E3F'] as const,
  gradientSell: ['#FF3B5C', '#CC0033'] as const,
  gradientCard: ['#0F1420', '#161B2E'] as const,
  gradientBg: ['#080B14', '#0A0D1A'] as const,
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
