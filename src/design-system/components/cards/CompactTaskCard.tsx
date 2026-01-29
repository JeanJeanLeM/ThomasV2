import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, ViewStyle, Animated } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon
} from '../../icons';
import { TaskData } from './TaskCard';

export interface CompactTaskCardProps {
  task: TaskData;
  onPress?: (task: TaskData) => void;
  onDelete?: (task: TaskData) => void;
  onDeleteComplete?: () => void; // Called when animation completes
  isDeleting?: boolean; // Trigger animation
  style?: ViewStyle;
}

export const CompactTaskCard: React.FC<CompactTaskCardProps> = ({
  task,
  onPress,
  onDelete,
  onDeleteComplete,
  isDeleting = false,
  style,
}) => {
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Trigger slide-out animation when isDeleting becomes true
  useEffect(() => {
    if (isDeleting) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300, // Slide to the right
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0, // Fade out
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Animation completed, notify parent
        onDeleteComplete?.();
      });
    }
  }, [isDeleting, slideAnim, fadeAnim, onDeleteComplete]);

  // Configuration selon le type de tâche
  const getTaskConfig = () => {
    if (task.type === 'completed') {
      return {
        icon: CheckCircleIcon,
        color: '#10b981', // Emerald
        emoji: '✓'
      };
    } else {
      return {
        icon: ClockIcon,
        color: '#6366f1', // Indigo
        emoji: '⏰'
      };
    }
  };

  const config = getTaskConfig();
  const StatusIcon = config.icon;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: slideAnim }],
        opacity: fadeAnim,
      }}
    >
      <TouchableOpacity
        style={[
          {
            backgroundColor: '#ffffff',
            borderRadius: 8,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            marginVertical: spacing.xs / 2,
            borderWidth: 1,
            borderColor: colors.border.secondary,
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
          },
          style,
        ]}
        onPress={() => onPress?.(task)}
        activeOpacity={0.7}
        disabled={isDeleting} // Disable interactions during animation
      >
        {/* Icône de statut */}
        <View style={{ marginRight: spacing.sm }}>
          <StatusIcon size={20} color={config.color} />
        </View>

        {/* Titre */}
        <View style={{ flex: 1 }}>
          <Text 
            variant="body" 
            numberOfLines={1} 
            weight="medium" 
            style={{
              fontSize: 15,
              color: colors.text.primary
            }}
          >
            {task.title}
          </Text>
        </View>

        {/* Chevron */}
        <View style={{ marginLeft: spacing.xs }}>
          <ChevronRightIcon size={18} color={colors.gray[400]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
