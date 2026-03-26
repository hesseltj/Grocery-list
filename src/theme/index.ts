import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// ─── Brand Colors ─────────────────────────────────────────────────────────────

export const colors = {
  // Primary
  primary: '#4F6EF7',
  primaryLight: '#7B93F9',
  primaryDark: '#3452D0',

  // Secondary
  secondary: '#10C4A0',
  secondaryLight: '#4FD6BC',
  secondaryDark: '#0A9980',

  // Accent
  accent: '#F7934F',
  accentLight: '#F9B27B',
  accentDark: '#D4712A',

  // Semantic
  success: '#2ECC71',
  successLight: '#A8F0CB',
  warning: '#F39C12',
  warningLight: '#FDEAA7',
  danger: '#E74C3C',
  dangerLight: '#FADBD8',
  info: '#3498DB',
  infoLight: '#AED6F1',

  // Neutrals
  white: '#FFFFFF',
  background: '#F8F9FE',
  surface: '#FFFFFF',
  border: '#E5E9F0',
  borderLight: '#F0F3F9',

  // Text
  textPrimary: '#1A1F3C',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Dark Theme
  darkBackground: '#0F1225',
  darkSurface: '#1A1F3C',
  darkBorder: '#2D3452',
  darkText: '#E8ECF4',
  darkTextSecondary: '#8892B0',

  // Chart Colors
  chartIncome: '#10C4A0',
  chartExpenses: '#E74C3C',
  chartForecast: '#4F6EF7',
  chartTax: '#F39C12',

  // Category Colors
  categoryColors: {
    client_payment: '#10C4A0',
    freelance_income: '#2ECC71',
    other_income: '#3498DB',
    software_tools: '#9B59B6',
    home_office: '#E67E22',
    equipment: '#E74C3C',
    marketing: '#F39C12',
    professional_services: '#1ABC9C',
    travel: '#3498DB',
    meals_entertainment: '#E91E63',
    health_insurance: '#00BCD4',
    retirement: '#795548',
    taxes_paid: '#607D8B',
    transfer: '#9E9E9E',
    personal: '#FF9800',
    uncategorized: '#BDBDBD',
  },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1A1F3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── React Native Paper Theme ────────────────────────────────────────────────

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.danger,
    onPrimary: colors.white,
    onSurface: colors.textPrimary,
  },
  roundness: 10,
} as const;

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.darkBackground,
    surface: colors.darkSurface,
    error: colors.danger,
    onPrimary: colors.white,
    onSurface: colors.darkText,
  },
  roundness: 10,
} as const;
