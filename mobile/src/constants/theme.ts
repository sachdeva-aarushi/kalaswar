/**
 * Kalaswar Artisan Mobile UI — Theme System
 *
 * Mapped from Stitch Design System ("Artisan Vernacular", Project: "Kalaswar Artisan Mobile UI")
 * Tailored for rural women artisans, SHG coordinators, and ethical buyers.
 *
 * Aesthetic: Warm Untreated Ivory, Deep Forest Green, Muted Raw Gold, Terracotta Alert.
 * Ergonomics: 56dp touch targets, 8dp baseline grid, 20dp tactile cards.
 */

import { Platform } from 'react-native';

export const Palette = {
  // Brand Primary & Forest Greens
  primary: '#083527',
  primaryContainer: '#234c3d',
  primaryFixed: '#c0ecd8',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#90bba8',
  headlineDark: '#18372d',

  // Secondary Accents & Muted Raw Gold
  secondary: '#7b5812',
  secondaryAccent: '#c69b50',
  secondaryContainer: '#fdcd7d',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#78550f',

  // Tertiary Guidance & Sage Celadon (AI / Copilot)
  tertiary: '#273127',
  tertiaryContainer: '#3d473d',
  tertiaryGuidance: '#dde8da',
  onTertiaryContainer: '#aab5a8',

  // Surfaces & Untreated Ivory
  background: '#fef9ee',
  surface: '#fef9ee',
  surfaceCard: '#f1ece1',
  surfaceWhite: '#ffffff',
  surfaceContainerLow: '#f8f3e8',
  surfaceContainer: '#f2ede2',
  surfaceContainerHigh: '#ede8dd',
  surfaceDim: '#dedacf',

  // High-legibility Text & Neutrals
  onSurface: '#1d1c15',
  onSurfaceVariant: '#414844',
  inverseSurface: '#323029',
  inverseOnSurface: '#f5f0e5',

  // Borders & Outlines
  outline: '#717974',
  outlineVariant: '#c0c8c3',
  borderNeutral: '#e5ddcb',

  // Alert & Attention (Terracotta)
  error: '#ba1a1a',
  errorTerracotta: '#b85f45',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
} as const;

export const Colors = {
  light: {
    text: Palette.onSurface,
    textSecondary: Palette.onSurfaceVariant,
    headline: Palette.headlineDark,
    background: Palette.background,
    card: Palette.surfaceCard,
    cardWhite: Palette.surfaceWhite,
    border: Palette.borderNeutral,
    primary: Palette.primary,
    primaryContainer: Palette.primaryContainer,
    onPrimary: Palette.onPrimary,
    accent: Palette.secondaryAccent,
    guidance: Palette.tertiaryGuidance,
    alert: Palette.errorTerracotta,
  },
  dark: {
    text: '#f5f0e5',
    textSecondary: '#c0c8c3',
    headline: '#c0ecd8',
    background: '#1d1c15',
    card: '#273127',
    cardWhite: '#323029',
    border: '#414844',
    primary: '#c0ecd8',
    primaryContainer: '#234c3d',
    onPrimary: '#083527',
    accent: '#fdcd7d',
    guidance: '#3d473d',
    alert: '#ffdad6',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Typography = {
  headlineXl: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700' as const,
    color: Palette.headlineDark,
  },
  headlineLg: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
    color: Palette.headlineDark,
  },
  headlineMd: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    color: Palette.headlineDark,
  },
  headlineSm: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    color: Palette.headlineDark,
  },
  bodyLg: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400' as const,
    color: Palette.onSurface,
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    color: Palette.onSurface,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    color: Palette.onSurfaceVariant,
  },
  labelLg: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  labelMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
};

export const Spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  gutter: 16,
  touchTargetMin: 56, // Enforced 56dp x 56dp for field touch ergonomics
};

export const Radii = {
  sm: 4,
  md: 12,
  lg: 16,
  card: 20,
  full: 9999,
};

export const Shadows = {
  ambient: Platform.select({
    ios: {
      shadowColor: '#18372d',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0 2px 6px rgba(24, 55, 45, 0.08)',
    },
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: '#18372d',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
    },
    android: {
      elevation: 5,
    },
    default: {
      boxShadow: '0 4px 16px rgba(24, 55, 45, 0.14)',
    },
  }),
};
