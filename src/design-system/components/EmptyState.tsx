import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { typography } from '../typography';

export interface EmptyStateProps {
  /**
   * Icon element to display (usually from design-system/icons)
   */
  icon: ReactNode;
  
  /**
   * Main title of the empty state
   */
  title: string;
  
  /**
   * Optional description text
   */
  description?: string;
  
  /**
   * Optional action button
   */
  action?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
  };
  
  /**
   * Additional custom styles
   */
  style?: ViewStyle;
}

/**
 * EmptyState component for displaying when no content is available
 * 
 * Provides a consistent and accessible empty state experience across the app.
 * 
 * @example
 * ```tsx
 * // Basic empty state
 * <EmptyState
 *   icon={<DocumentIcon size={48} color={colors.gray[400]} />}
 *   title="Aucun document"
 *   description="Vous n'avez pas encore ajouté de documents"
 * />
 * 
 * // With action button
 * <EmptyState
 *   icon={<CalendarIcon size={48} color={colors.gray[400]} />}
 *   title="Aucune tâche"
 *   description="Commencez par créer votre première tâche"
 *   action={{
 *     label: "Créer une tâche",
 *     onPress: handleCreateTask,
 *     variant: "primary"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Icon Circle */}
      <View style={styles.iconContainer}>
        {icon}
      </View>
      
      {/* Title */}
      <Text 
        variant="h3" 
        color={colors.gray[600]}
        style={styles.title}
      >
        {title}
      </Text>
      
      {/* Description */}
      {description && (
        <Text 
          variant="body" 
          color={colors.text.secondary}
          style={styles.description}
        >
          {description}
        </Text>
      )}
      
      {/* Optional Action Button */}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant={action.variant || 'primary'}
          size="md"
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.md,
  },
});




