import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, ViewStyle, Animated } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  CalendarIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  MapIcon,
  SproutIcon
} from '../../icons';
import { TaskData } from './TaskCard';

export interface UnifiedTaskCardProps {
  task: TaskData;
  onPress?: (task: TaskData) => void;
  onEdit?: (task: TaskData) => void;
  onDelete?: (task: TaskData) => void;
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

export const UnifiedTaskCard: React.FC<UnifiedTaskCardProps> = ({
  task,
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
  // Configuration selon le type de tâche
  const getTaskConfig = () => {
    if (task.type === 'completed') {
      return {
        icon: 'checkmark-circle-outline',
        color: '#10b981', // Emerald
        bgColor: '#d1fae5',
        label: 'Tâche effectuée',
        emoji: '✅'
      };
    } else {
      return {
        icon: 'calendar-outline',
        color: '#6366f1', // Indigo
        bgColor: '#e0e7ff',
        label: 'Tâche planifiée',
        emoji: '📅'
      };
    }
  };

  const config = getTaskConfig();

  // Format de date
  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };


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
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          },
          style,
        ]}
        onPress={() => onPress?.(task)}
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
            {task.title}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(task)}
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
              onPress={() => onDelete(task)}
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
        {/* Action principale comme capsule */}
        {task.action && (
          <Tag 
            icon="🔧" 
            text={task.action} 
            bgColor={config.bgColor} 
            textColor={config.color} 
          />
        )}

        {/* Cultures (plants) */}
        {task.plants && task.plants.length > 0 && (
          <Tag 
            icon="🌱" 
            text={task.plants.join(', ')} 
            bgColor="#f0fdf4" 
            textColor="#166534" 
          />
        )}

        {/* Parcelles (plots) */}
        {task.plot_ids && task.plot_ids.length > 0 && (
          <Tag 
            icon="📍" 
            text={`${task.plot_ids.length} parcelle${task.plot_ids.length > 1 ? 's' : ''}`} 
            bgColor="#fff7ed" 
            textColor="#9a3412" 
          />
        )}

        {/* Matériel (materials) */}
        {task.material_ids && task.material_ids.length > 0 && (
          <Tag 
            icon="🔧" 
            text={`${task.material_ids.length} outil${task.material_ids.length > 1 ? 's' : ''}`} 
            bgColor="#e5e7eb" 
            textColor="#374151" 
          />
        )}

        {/* Quantité (si disponible dans les notes ou description) */}
        {task.quantity && (
          <Tag 
            icon="📊" 
            text={`${task.quantity.value} ${task.quantity.unit}`} 
            bgColor="#dbeafe" 
            textColor="#1e40af" 
          />
        )}

        {/* Quantité convertie (si disponible) */}
        {task.quantity_converted && (
          <Tag 
            icon="⚖️" 
            text={`${task.quantity_converted.value} ${task.quantity_converted.unit}`} 
            bgColor="#ecfdf5" 
            textColor="#047857" 
          />
        )}

        {/* Nature de la quantité */}
        {task.quantity_nature && (
          <Tag 
            icon="🏷️" 
            text={task.quantity_nature} 
            bgColor="#f0f9ff" 
            textColor="#0c4a6e" 
          />
        )}

        {/* Type de quantité */}
        {task.quantity_type && (
          <Tag 
            icon="📋" 
            text={task.quantity_type} 
            bgColor="#fef3c7" 
            textColor="#92400e" 
          />
        )}

        {/* Durée */}
        {task.duration_minutes && task.duration_minutes > 0 && (
          <Tag 
            icon="⏱️" 
            text={`${task.duration_minutes} min`} 
            bgColor="#dbeafe" 
            textColor="#1e40af" 
          />
        )}

        {/* Nombre de personnes */}
        {task.number_of_people && task.number_of_people > 1 && (
          <Tag 
            icon="👥" 
            text={`${task.number_of_people} pers.`} 
            bgColor="#f3e8ff" 
            textColor="#7c3aed" 
          />
        )}

        {/* Date comme capsule */}
        <Tag 
          icon="📅" 
          text={formatDate(task.date)} 
          bgColor="#f0fdf4" 
          textColor="#166534" 
        />
      </View>

      {/* Badge de type en bas à droite */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: config.color + '20',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 12,
        }}>
          <Text 
            variant="caption" 
            style={{ 
              color: config.color, 
              fontWeight: '600',
              fontSize: 10
            }}
          >
            {task.type === 'completed' ? 'EFFECTUÉE' : 'PLANIFIÉE'}
          </Text>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
