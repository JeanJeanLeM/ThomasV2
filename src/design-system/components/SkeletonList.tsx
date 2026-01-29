import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { spacing } from '../spacing';

export interface SkeletonListProps {
  /**
   * Number of skeleton items to display
   * @default 3
   */
  count?: number;
  
  /**
   * Variant of the skeleton list
   * @default 'card'
   */
  variant?: 'card' | 'list' | 'grid';
  
  /**
   * Height of each skeleton item
   * @default 100
   */
  itemHeight?: number;
  
  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * SkeletonList component for displaying multiple loading placeholders
 * 
 * Provides a list of animated skeleton cards while content is loading.
 * 
 * @example
 * ```tsx
 * // Basic list skeleton
 * <SkeletonList count={5} variant="list" />
 * 
 * // Grid skeleton
 * <SkeletonList count={6} variant="grid" itemHeight={150} />
 * 
 * // Card skeleton
 * <SkeletonList count={3} variant="card" itemHeight={120} />
 * ```
 */
export function SkeletonList({
  count = 3,
  variant = 'card',
  itemHeight = 100,
  style,
}: SkeletonListProps) {
  const containerStyle = 
    variant === 'grid' 
      ? styles.gridContainer 
      : styles.listContainer;

  const itemStyle = 
    variant === 'grid' 
      ? styles.gridItem 
      : styles.listItem;

  return (
    <View style={[containerStyle, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={itemStyle}>
          <SkeletonCard
            width="100%"
            height={itemHeight}
            borderRadius={variant === 'list' ? 4 : 12}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: spacing.md,
  },
  listItem: {
    width: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '48%',
  },
});




