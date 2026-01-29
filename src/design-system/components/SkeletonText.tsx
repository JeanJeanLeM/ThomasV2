import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { spacing } from '../spacing';

export interface SkeletonTextProps {
  /**
   * Number of text lines to display
   * @default 3
   */
  lines?: number;
  
  /**
   * Width of each line (can be an array for custom widths per line)
   * @default '100%'
   */
  width?: string | string[];
  
  /**
   * Height of each text line
   * @default 16
   */
  lineHeight?: number;
  
  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * SkeletonText component for displaying loading placeholders for text content
 * 
 * Provides animated skeleton lines that mimic text while content is loading.
 * 
 * @example
 * ```tsx
 * // Basic text skeleton (3 lines)
 * <SkeletonText />
 * 
 * // Custom number of lines
 * <SkeletonText lines={5} lineHeight={14} />
 * 
 * // Custom widths for each line (e.g., for paragraphs)
 * <SkeletonText 
 *   lines={4} 
 *   width={['100%', '95%', '98%', '60%']} 
 * />
 * ```
 */
export function SkeletonText({
  lines = 3,
  width = '100%',
  lineHeight = 16,
  style,
}: SkeletonTextProps) {
  const getLineWidth = (index: number): string => {
    if (Array.isArray(width)) {
      return width[index] || width[0] || '100%';
    }
    return width;
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonCard
          key={index}
          width={getLineWidth(index)}
          height={lineHeight}
          borderRadius={4}
          style={styles.line}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  line: {
    // Individual line styles if needed
  },
});




