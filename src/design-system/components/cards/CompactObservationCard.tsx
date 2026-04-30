import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, ViewStyle, Animated } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  AlertTriangleIcon,
  ChevronRightIcon
} from '../../icons';
import { ObservationData } from './ObservationCard';
import { formatObservationTitle } from '../../../utils/observationFormatters';

export interface CompactObservationCardProps {
  observation: ObservationData;
  attachmentSummary?: { imageCount: number; hasLocation: boolean } | undefined;
  onPress?: (observation: ObservationData) => void;
  onDelete?: (observation: ObservationData) => void;
  onDeleteComplete?: () => void; // Called when animation completes
  isDeleting?: boolean; // Trigger animation
  style?: ViewStyle;
}

export const CompactObservationCard: React.FC<CompactObservationCardProps> = ({
  observation,
  attachmentSummary,
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
            borderLeftWidth: 3,
            borderLeftColor: '#f59e0b', // Amber
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
        onPress={() => onPress?.(observation)}
        activeOpacity={0.7}
        disabled={isDeleting} // Disable interactions during animation
      >
        {/* Icône d'observation */}
        <View style={{ marginRight: spacing.sm }}>
          <AlertTriangleIcon size={20} color="#f59e0b" />
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
            {formatObservationTitle(observation.title, observation.category as string)}
          </Text>
        </View>

        {/* Chevron */}
        {(attachmentSummary?.imageCount || attachmentSummary?.hasLocation) ? (
          <View style={{ flexDirection: 'row', gap: 4, marginLeft: spacing.xs }}>
            {attachmentSummary.imageCount ? (
              <Text style={{ fontSize: 14 }}>📷</Text>
            ) : null}
            {attachmentSummary.hasLocation ? (
              <Text style={{ fontSize: 14 }}>📍</Text>
            ) : null}
          </View>
        ) : null}

        {/* Chevron */}
        <View style={{ marginLeft: spacing.xs }}>
          <ChevronRightIcon size={18} color={colors.gray[400]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
