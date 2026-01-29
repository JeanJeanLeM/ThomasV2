// Thomas V2 Design System - Tailwind Integration
// Utility functions to bridge our design system with Tailwind classes

import { colors } from '../colors';
import { spacing } from '../spacing';

// Map our design system colors to Tailwind classes
export const tailwindColors = {
  // Primary colors
  'bg-primary-50': colors.primary[50],
  'bg-primary-500': colors.primary[500],
  'bg-primary-600': colors.primary[600],
  'text-primary-600': colors.primary[600],
  'text-primary-900': colors.primary[900],
  
  // Secondary colors
  'bg-secondary-blue': colors.secondary.blue,
  'bg-secondary-orange': colors.secondary.orange,
  'bg-secondary-red': colors.secondary.red,
  'bg-secondary-purple': colors.secondary.purple,
  
  // Status colors
  'bg-status-completed': colors.status.completed,
  'bg-status-pending': colors.status.pending,
  'bg-status-cancelled': colors.status.cancelled,
  
  // Gray colors
  'text-gray-600': colors.gray[600],
  'text-gray-900': colors.gray[900],
  'bg-white': colors.background.primary,
} as const;

// Map our spacing system to Tailwind classes
export const tailwindSpacing = {
  'p-1': spacing.xs,
  'p-2': spacing.sm,
  'p-3': spacing.md,
  'p-4': spacing.lg,
  'p-5': spacing.xl,
  'p-6': spacing['2xl'],
  
  'm-1': spacing.xs,
  'm-2': spacing.sm,
  'm-3': spacing.md,
  'm-4': spacing.lg,
  'm-5': spacing.xl,
  'm-6': spacing['2xl'],
} as const;

// Helper function to get Tailwind class values
export const getTailwindValue = (className: string): string | number | undefined => {
  if (className in tailwindColors) {
    return tailwindColors[className as keyof typeof tailwindColors];
  }
  if (className in tailwindSpacing) {
    return tailwindSpacing[className as keyof typeof tailwindSpacing];
  }
  return undefined;
};

// Common Tailwind class combinations for Thomas V2
export const tailwindPresets = {
  // Cards
  card: 'bg-white rounded-xl p-4 shadow-lg',
  cardElevated: 'bg-white rounded-xl p-6 shadow-lg',
  
  // Buttons
  buttonPrimary: 'bg-primary-600 px-6 py-3 rounded-lg',
  buttonSecondary: 'bg-secondary-blue px-6 py-3 rounded-lg',
  
  // Text
  title: 'text-2xl font-bold text-primary-600',
  subtitle: 'text-lg font-semibold text-gray-900',
  body: 'text-base text-gray-600',
  caption: 'text-sm text-gray-500',
  
  // Layout
  container: 'flex-1 bg-primary-50 p-4',
  centerContent: 'flex-1 justify-center items-center',
  
  // Agriculture specific
  plotCard: 'bg-white rounded-xl p-4 border-l-4 border-primary-500',
  taskCard: 'bg-white rounded-lg p-3 shadow-sm border border-gray-200',
  observationCard: 'bg-white rounded-lg p-3 shadow-sm border-l-4 border-secondary-orange',
} as const;
