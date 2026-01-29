import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';

export interface SkeletonCardProps {
  /**
   * Width of the skeleton
   * @default '100%'
   */
  width?: number | string;
  
  /**
   * Height of the skeleton
   * @default 100
   */
  height?: number;
  
  /**
   * Border radius
   * @default 8
   */
  borderRadius?: number;
  
  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * SkeletonCard component for displaying loading placeholders
 * 
 * Provides an animated shimmer effect while content is loading.
 * 
 * @example
 * ```tsx
 * // Basic skeleton card
 * <SkeletonCard width="100%" height={120} />
 * 
 * // Custom rounded skeleton
 * <SkeletonCard width={80} height={80} borderRadius={40} />
 * ```
 */
export function SkeletonCard({
  width = '100%',
  height = 100,
  borderRadius = 8,
  style,
}: SkeletonCardProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.gray[200],
  },
});




