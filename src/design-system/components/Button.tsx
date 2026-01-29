import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../colors';
import { textStyles } from '../typography';
import { spacing } from '../spacing';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  onPress,
  ...props
}) => {
  const isDisabled = disabled || loading;

  // Button styles based on variant
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      ...getSizeStyle(),
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? colors.gray[300] : colors.primary[600],
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDisabled ? 0 : 0.1,
          shadowRadius: 4,
          elevation: isDisabled ? 0 : 3,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? colors.gray[100] : colors.secondary.blue,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDisabled ? 0 : 0.1,
          shadowRadius: 4,
          elevation: isDisabled ? 0 : 3,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? colors.gray[300] : colors.primary[600],
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: isDisabled ? colors.gray[300] : colors.semantic.error,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDisabled ? 0 : 0.1,
          shadowRadius: 4,
          elevation: isDisabled ? 0 : 3,
        };
      default:
        return baseStyle;
    }
  };

  // Text styles based on variant
  const getTextStyle = (): TextStyle => {
    const baseTextStyle = {
      ...textStyles.button,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseTextStyle,
          color: isDisabled ? colors.gray[500] : colors.text.inverse,
        };
      case 'secondary':
        return {
          ...baseTextStyle,
          color: isDisabled ? colors.gray[500] : colors.text.inverse,
        };
      case 'outline':
        return {
          ...baseTextStyle,
          color: isDisabled ? colors.gray[400] : colors.primary[600],
        };
      case 'ghost':
        return {
          ...baseTextStyle,
          color: isDisabled ? colors.gray[400] : colors.primary[600],
        };
      case 'danger':
        return {
          ...baseTextStyle,
          color: isDisabled ? colors.gray[500] : colors.text.inverse,
        };
      default:
        return baseTextStyle;
    }
  };

  // Size styles
  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 36,
        };
      case 'md':
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          minHeight: spacing.interactive.buttonHeight,
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.lg,
          minHeight: 56,
        };
      default:
        return {};
    }
  };

  const handlePress = (event: any) => {
    console.log('🔘 [Button] handlePress called:', { title, isDisabled, hasOnPress: !!onPress });
    if (!isDisabled && onPress) {
      console.log('✅ [Button] Calling onPress');
      onPress(event);
    } else {
      console.log('❌ [Button] Press blocked:', { isDisabled, hasOnPress: !!onPress });
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary[600] : colors.text.inverse}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[getTextStyle(), textStyle, leftIcon ? { marginLeft: spacing.sm } : undefined]}>
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};
