// Thomas V2 Color System
// French Agriculture Color Palette

export const colors = {
  // Primary brand colors (green agriculture theme)
  primary: {
    50: '#f0fdf4',   // Very light green - backgrounds
    100: '#dcfce7',  // Light green - subtle backgrounds
    200: '#bbf7d0',  // Lighter green - hover states
    300: '#86efac',  // Light-medium green - disabled states
    400: '#4ade80',  // Medium green - secondary actions
    500: '#22c55e',  // Main brand green - primary actions
    600: '#16a34a',  // Dark green - titles, emphasis
    700: '#15803d',  // Darker green - pressed states
    800: '#166534',  // Very dark green - text on light
    900: '#14532d',  // Darkest green - high contrast text
    // Legacy aliases
    light: '#dcfce7',
    main: '#22c55e',
  },

  // Secondary functional colors
  secondary: {
    blue: '#3b82f6',    // Actions, buttons, links
    orange: '#f59e0b',  // Observations, warnings
    red: '#ef4444',     // Treatments, alerts, errors
    purple: '#8b5cf6',  // Experiments, trials
    yellow: '#eab308',  // Planning, future tasks
    // Legacy alias
    main: '#3b82f6',
  },

  // Neutral grays
  gray: {
    50: '#f9fafb',   // Lightest background
    100: '#f3f4f6',  // Light background
    200: '#e5e7eb',  // Borders, dividers
    300: '#d1d5db',  // Disabled text
    400: '#9ca3af',  // Placeholder text
    500: '#6b7280',  // Secondary text
    600: '#4b5563',  // Primary text
    700: '#374151',  // Headings
    800: '#1f2937',  // Dark headings
    900: '#111827',  // Darkest text
  },

  // Legacy neutral aliases built on gray scale
  neutral: {
    light: '#f3f4f6',   // gray[100]
    medium: '#6b7280',  // gray[500]
    dark: '#374151',    // gray[700]
  },

  // Status colors for tasks and activities
  status: {
    // Task status tokens
    completed: '#22c55e',   // Green - completed tasks
    pending: '#f59e0b',     // Orange - pending tasks
    cancelled: '#ef4444',   // Red - cancelled tasks
    planned: '#3b82f6',     // Blue - planned tasks
    inProgress: '#8b5cf6',  // Purple - in progress

    // Legacy semantic aliases
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    warningLight: '#fef3c7', // warning[100]
    errorLight: '#fee2e2',   // error[100]
  },

  // Semantic colors with full palette
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Semantic colors (legacy compatibility)
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Background colors
  background: {
    // App background: léger gris (anciennement blanc)
    primary: '#f3f4f6',     // Main background (gris clair, ~ gray[100])
    // Cartes / éléments: blanc (anciennement gris)
    secondary: '#ffffff',   // Secondary background (cards, blocs)
    tertiary: '#f0fdf4',    // Subtle green background
  },

  // Text colors
  text: {
    primary: '#111827',     // Main text
    secondary: '#6b7280',   // Secondary text
    tertiary: '#9ca3af',    // Tertiary text
    inverse: '#ffffff',     // Text on dark backgrounds
    success: '#15803d',     // Success text
    warning: '#92400e',     // Warning text
    error: '#dc2626',       // Error text
  },

  // Border colors
  border: {
    primary: '#e5e7eb',     // Main borders
    secondary: '#d1d5db',   // Secondary borders
    focus: '#3b82f6',       // Focus borders
    error: '#ef4444',       // Error borders
    success: '#22c55e',     // Success borders
  },

  // Overlay colors (for badges, overlays, semi-transparent)
  overlay: {
    white25: 'rgba(255, 255, 255, 0.25)',  // White 25% opacity
    white90: 'rgba(255, 255, 255, 0.9)',   // White 90% opacity
    black10: 'rgba(0, 0, 0, 0.1)',         // Black 10% opacity
    black25: 'rgba(0, 0, 0, 0.25)',        // Black 25% opacity
    primary20: 'rgba(34, 197, 94, 0.2)',   // Primary 20% opacity
  },
} as const;

// Color utility functions
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'terminée':
    case 'completed':
      return colors.status.completed;
    case 'en_cours':
    case 'in_progress':
      return colors.status.inProgress;
    case 'prévue':
    case 'planned':
      return colors.status.planned;
    case 'annulée':
    case 'cancelled':
      return colors.status.cancelled;
    default:
      return colors.status.pending;
  }
};

export const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'production':
      return colors.primary[600];
    case 'marketing':
      return colors.secondary.blue;
    case 'administrative':
      return colors.secondary.purple;
    case 'observation':
      return colors.secondary.orange;
    case 'traitement':
      return colors.secondary.red;
    default:
      return colors.gray[600];
  }
};
