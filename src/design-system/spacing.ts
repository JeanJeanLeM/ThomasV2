// Thomas V2 Spacing System
// Consistent spacing for mobile agriculture app

export const spacing = {
  // Base spacing unit (4px)
  unit: 4,

  // Spacing scale
  xs: 4,    // 4px  - Tight spacing
  sm: 8,    // 8px  - Small spacing
  md: 12,   // 12px - Medium spacing
  lg: 16,   // 16px - Large spacing
  xl: 20,   // 20px - Extra large spacing
  '2xl': 24, // 24px - 2x extra large
  '3xl': 32, // 32px - 3x extra large
  '4xl': 40, // 40px - 4x extra large
  '5xl': 48, // 48px - 5x extra large
  '6xl': 64, // 64px - 6x extra large

  // Semantic spacing
  component: {
    padding: 16,      // Standard component padding
    margin: 16,       // Standard component margin
    gap: 12,          // Gap between related elements
    section: 24,      // Gap between sections
  },

  // Layout spacing
  layout: {
    screenPadding: 20,    // Screen edge padding
    cardPadding: 16,      // Card internal padding
    listItemPadding: 12,  // List item padding
    buttonPadding: 12,    // Button padding
    inputPadding: 12,     // Input field padding
  },

  // Navigation spacing
  navigation: {
    tabHeight: 60,        // Bottom tab bar height
    headerHeight: 56,     // Header height
    statusBarHeight: 44,  // iOS status bar height
  },

  // Interactive element spacing
  interactive: {
    minTouchTarget: 44,   // Minimum touch target size
    buttonHeight: 48,     // Standard button height
    inputHeight: 48,      // Standard input height
    iconSize: 24,         // Standard icon size
    avatarSize: 40,       // Standard avatar size
  },
} as const;

// Spacing utility functions
export const getSpacing = (size: keyof typeof spacing): number => {
  return spacing[size] as number;
};

export const getMultipleSpacing = (multiplier: number): number => {
  return spacing.unit * multiplier;
};
