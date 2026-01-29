// Thomas V2 Typography System
// French Agriculture App Typography

import { TextStyle } from 'react-native';

export const typography = {
  // Font families
  fonts: {
    primary: 'System', // iOS: San Francisco, Android: Roboto
    mono: 'Menlo',     // Monospace for codes/data
  },

  // Font sizes (mobile optimized)
  sizes: {
    xs: 12,    // Small labels, captions
    sm: 14,    // Secondary text, descriptions
    base: 16,  // Body text, inputs
    lg: 18,    // Emphasized text
    xl: 20,    // Small headings
    '2xl': 24, // Medium headings
    '3xl': 28, // Large headings
    '4xl': 32, // Display headings
  },

  // Font weights
  weights: {
    normal: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
  },

  // Line heights (mobile optimized)
  lineHeights: {
    tight: 1.2,    // Headings
    normal: 1.4,   // Body text
    relaxed: 1.6,  // Longer text blocks
  },
} as const;

// Typography styles for common use cases
export const textStyles = {
  // Headings
  h1: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
    color: '#111827', // text-gray-900
  },
  h2: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
    color: '#111827',
  },
  h3: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.xl * typography.lineHeights.tight,
    color: '#111827',
  },
  h4: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.lg * typography.lineHeights.normal,
    color: '#374151', // text-gray-700
  },

  // Body text
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    color: '#374151',
  },
  bodySmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: '#6b7280', // text-gray-500
  },
  bodyLarge: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.lg * typography.lineHeights.relaxed,
    color: '#374151',
  },

  // Specialized text
  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    color: '#9ca3af', // text-gray-400
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: '#374151',
  },
  button: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.base * typography.lineHeights.tight,
  },
  input: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    color: '#111827',
  },

  // Status text
  success: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#15803d', // text-green-700
  },
  warning: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#92400e', // text-yellow-700
  },
  error: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: '#dc2626', // text-red-600
  },

  // French agriculture specific
  taskTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.base * typography.lineHeights.tight,
    color: '#111827',
  },
  plotName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: '#16a34a', // primary-600
  },
  cropName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    color: '#6b7280',
  },

  // Statistics and metrics
  statNumber: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    lineHeight: 38,
    color: '#111827',
  },

  // Large emoji/icons for visual impact
  emojiLarge: {
    fontSize: 48,
    lineHeight: 56,
  },

  // Small badges and indicators
  badge: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    lineHeight: 14,
  },

  // Form labels
  formLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * 1.4,
    color: '#374151',
  },
} as const;
