import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { Text } from './Text';
import { colors } from '../colors';

export interface AvatarProps {
  /**
   * Size of the avatar
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  /**
   * Initials to display (1-2 characters)
   */
  initials?: string;
  
  /**
   * Image URL for the avatar
   */
  imageUrl?: string;
  
  /**
   * Background color for the avatar
   * @default colors.primary[600]
   */
  backgroundColor?: string;
  
  /**
   * Text color for the initials
   * @default colors.text.inverse
   */
  textColor?: string;
  
  /**
   * Additional style for the container
   */
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  xs: {
    size: 24,
    fontSize: 10,
  },
  sm: {
    size: 32,
    fontSize: 12,
  },
  md: {
    size: 40,
    fontSize: 16,
  },
  lg: {
    size: 48,
    fontSize: 18,
  },
  xl: {
    size: 64,
    fontSize: 24,
  },
  '2xl': {
    size: 80,
    fontSize: 32,
  },
};

/**
 * Avatar component for displaying user profile pictures or initials
 * 
 * @example
 * ```tsx
 * // With initials
 * <Avatar initials="JD" size="md" />
 * 
 * // With image
 * <Avatar imageUrl="https://..." size="lg" />
 * 
 * // Custom colors
 * <Avatar 
 *   initials="AB" 
 *   backgroundColor={colors.secondary.blue}
 *   textColor={colors.text.inverse}
 * />
 * ```
 */
export function Avatar({
  size = 'md',
  initials,
  imageUrl,
  backgroundColor = colors.primary[600],
  textColor = colors.text.inverse,
  style,
}: AvatarProps) {
  const config = SIZE_CONFIG[size];
  
  const containerStyle: ViewStyle = {
    width: config.size,
    height: config.size,
    borderRadius: config.size / 2,
    backgroundColor: imageUrl ? 'transparent' : backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // Format initials (max 2 characters, uppercase)
  const formattedInitials = initials
    ? initials.substring(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[containerStyle, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            fontSize: config.fontSize,
            color: textColor,
            fontWeight: '600',
          }}
        >
          {formattedInitials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});




