import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { textStyles } from '../typography';
import { colors } from '../colors';

export interface TextProps extends RNTextProps {
  variant?: 
    | 'h1' | 'h2' | 'h3' | 'h4'
    | 'body' | 'bodySmall' | 'bodyLarge'
    | 'caption' | 'label' | 'button'
    | 'taskTitle' | 'plotName' | 'cropName'
    | 'success' | 'warning' | 'error';
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
  children,
  ...props
}) => {
  // Get base text style from variant
  const getTextStyle = (): TextStyle => {
    const baseStyle = textStyles[variant] || textStyles.body;
    
    const customStyle: TextStyle = {
      ...baseStyle,
      textAlign: align,
    };

    // Override color if provided
    if (color) {
      customStyle.color = color;
    }

    // Override font weight if provided
    if (weight) {
      switch (weight) {
        case 'normal':
          customStyle.fontWeight = '400';
          break;
        case 'medium':
          customStyle.fontWeight = '500';
          break;
        case 'semibold':
          customStyle.fontWeight = '600';
          break;
        case 'bold':
          customStyle.fontWeight = '700';
          break;
      }
    }

    return customStyle;
  };

  return (
    <RNText style={[getTextStyle(), style]} {...props}>
      {children}
    </RNText>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="h4" {...props} />
);

export const BodyText: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="body" {...props} />
);

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="caption" {...props} />
);

export const Label: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="label" {...props} />
);

// Agriculture-specific text components
export const TaskTitle: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="taskTitle" {...props} />
);

export const PlotName: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="plotName" {...props} />
);

export const CropName: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="cropName" {...props} />
);

// Status text components
export const SuccessText: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="success" {...props} />
);

export const WarningText: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="warning" {...props} />
);

export const ErrorText: React.FC<Omit<TextProps, 'variant'>> = (props) => (
  <Text variant="error" {...props} />
);
