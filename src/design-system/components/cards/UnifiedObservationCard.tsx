import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, ViewStyle, Animated } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  CalendarIcon,
  EditIcon,
  TrashIcon,
  AlertTriangleIcon,
  EyeIcon
} from '../../icons';
import { ObservationData } from './ObservationCard';
import { formatObservationTitle } from '../../../utils/observationFormatters';

export interface UnifiedObservationCardProps {
  observation: ObservationData;
  onPress?: (observation: ObservationData) => void;
  onEdit?: (observation: ObservationData) => void;
  onDelete?: (observation: ObservationData) => void;
  onDeleteComplete?: () => void; // Called when animation completes
  isDeleting?: boolean; // Trigger animation
  style?: ViewStyle;
}

// Composant Tag réutilisable
const Tag: React.FC<{
  icon: string;
  text: string;
  bgColor: string;
  textColor: string;
}> = ({ icon, text, bgColor, textColor }) => (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: bgColor,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  }}>
    <Text style={{ fontSize: 12, marginRight: 6 }}>{icon}</Text>
    <Text 
      variant="caption" 
      style={{ 
        color: textColor, 
        fontWeight: '600',
        fontSize: 13
      }}
    >
      {text}
    </Text>
  </View>
);

export const UnifiedObservationCard: React.FC<UnifiedObservationCardProps> = ({
  observation,
  onPress,
  onEdit,
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
  // Configuration de l'observation
  const observationConfig = {
    icon: 'eye-outline',
    color: '#f59e0b', // Amber
    bgColor: '#fef3c7',
    label: 'Observation',
    emoji: '👁️'
  };

  // Format de date
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Configuration de la sévérité
  const getSeverityConfig = (severity?: string) => {
    switch (severity) {
      case 'Critique':
        return { color: '#dc2626', bg: '#fef2f2', text: 'Critique', icon: '🚨' };
      case 'Élevé':
        return { color: '#ea580c', bg: '#fff7ed', text: 'Élevé', icon: '⚠️' };
      case 'Moyen':
        return { color: '#d97706', bg: '#fef3c7', text: 'Moyen', icon: '⚡' };
      case 'Faible':
        return { color: '#65a30d', bg: '#f7fee7', text: 'Faible', icon: '💡' };
      default:
        return { color: '#6b7280', bg: '#f9fafb', text: 'Non défini', icon: '❓' };
    }
  };

  // Configuration de la catégorie
  const getCategoryConfig = (category?: string) => {
    switch (category) {
      case 'ravageurs':
        return { text: 'Ravageurs', icon: '🐛', bg: '#fef2f2', color: '#991b1b' };
      case 'maladies':
        return { text: 'Maladies', icon: '🦠', bg: '#fef3c7', color: '#92400e' };
      case 'carences':
        return { text: 'Carences', icon: '🍃', bg: '#f0fdf4', color: '#166534' };
      case 'dégâts_climatiques':
        return { text: 'Climat', icon: '🌦️', bg: '#eff6ff', color: '#1e40af' };
      case 'croissance_anormale':
        return { text: 'Croissance', icon: '📏', bg: '#f3e8ff', color: '#7c3aed' };
      default:
        return { text: 'Autre', icon: '❓', bg: '#f9fafb', color: '#6b7280' };
    }
  };

  const severityConfig = getSeverityConfig(observation.severity);
  const categoryConfig = getCategoryConfig(observation.category as string);

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
            borderRadius: 12,
            padding: spacing.md,
            marginVertical: spacing.xs,
            borderWidth: 1,
            borderColor: colors.border.secondary,
            borderLeftWidth: 4,
            borderLeftColor: severityConfig.color,
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          },
          style,
        ]}
        onPress={() => onPress?.(observation)}
        activeOpacity={0.7}
        disabled={isDeleting} // Disable interactions during animation
      >
      {/* En-tête avec titre à gauche et actions à droite */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.md
      }}>
        {/* Titre principal - Aligné en haut à gauche */}
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text variant="body" numberOfLines={2} weight="semibold" style={{
            fontSize: 17,
            lineHeight: 24,
            color: colors.text.primary
          }}>
            {formatObservationTitle(observation.title, observation.category as string)}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(observation)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.primary[100],
                marginRight: spacing.xs,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <EditIcon size={14} color={colors.primary[600]} />
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(observation)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.semantic.error + '15',
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <TrashIcon size={14} color={colors.semantic.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Capsules informatiques - Format chat */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.sm
      }}>
        {/* Problème comme capsule principale */}
        {observation.issue && (
          <Tag 
            icon="⚠️" 
            text={observation.issue} 
            bgColor="#fef2f2" 
            textColor="#991b1b" 
          />
        )}

        {/* Sévérité */}
        <Tag 
          icon={severityConfig.icon} 
          text={severityConfig.text} 
          bgColor={severityConfig.bg} 
          textColor={severityConfig.color} 
        />

        {/* Catégorie */}
        <Tag 
          icon={categoryConfig.icon} 
          text={categoryConfig.text} 
          bgColor={categoryConfig.bg} 
          textColor={categoryConfig.color} 
        />

        {/* Cultures affectées */}
        {observation.crops && observation.crops.length > 0 && (
          <Tag 
            icon="🌱" 
            text={observation.crops.join(', ')} 
            bgColor="#f0fdf4" 
            textColor="#166534" 
          />
        )}

        {/* Date comme capsule */}
        <Tag 
          icon="📅" 
          text={formatDate(observation.date)} 
          bgColor="#f0fdf4" 
          textColor="#166534" 
        />
      </View>

      {/* Badge de type "OBSERVATION" en bas à droite */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: observationConfig.color + '20',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text 
            variant="caption" 
            style={{ 
              color: observationConfig.color, 
              fontWeight: '600',
              fontSize: 10
            }}
          >
            OBSERVATION
          </Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
