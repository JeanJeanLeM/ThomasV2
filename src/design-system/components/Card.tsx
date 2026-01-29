import React from 'react';
import {
  View,
  TouchableOpacity,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';

export interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  margin?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  margin = 'none',
  onPress,
  style,
  ...props
}) => {
  // Base card styles
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      backgroundColor: colors.background.primary,
      ...getPaddingStyle(),
      ...getMarginStyle(),
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: colors.border.primary,
        };
      case 'flat':
        return {
          ...baseStyle,
          backgroundColor: colors.background.secondary,
        };
      case 'default':
      default:
        return {
          ...baseStyle,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
    }
  };

  // Padding styles
  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return {};
      case 'sm':
        return { padding: spacing.sm };
      case 'md':
        return { padding: spacing.layout.cardPadding };
      case 'lg':
        return { padding: spacing.xl };
      default:
        return { padding: spacing.layout.cardPadding };
    }
  };

  // Margin styles
  const getMarginStyle = (): ViewStyle => {
    switch (margin) {
      case 'none':
        return {};
      case 'sm':
        return { margin: spacing.sm };
      case 'md':
        return { margin: spacing.md };
      case 'lg':
        return { margin: spacing.lg };
      default:
        return {};
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};
