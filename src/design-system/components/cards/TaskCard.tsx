import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  ClockIcon, 
  UserIcon, 
  MapIcon, 
  SproutIcon,
  CalendarIcon,
  EditIcon,
  MessageCircleIcon,
  TrashIcon 
} from '../../icons';

export interface TaskData {
  id: string;
  title: string;
  action?: string; // Action principale (récolter, planter, traiter, etc.)
  standard_action?: string | null; // Code action standard normalisé (réf. task_standard_actions)
  type: 'completed' | 'planned';
  date: Date | string;
  duration_minutes?: number; // Durée en minutes
  number_of_people?: number; // Nombre de personnes
  plants?: string[]; // Cultures/plantes
  plot_ids?: string[]; // IDs des parcelles
  material_ids?: string[]; // IDs des matériels/outils
  quantity?: { value: number; unit: string }; // Quantité avec unité
  quantity_converted?: { value: number; unit: string }; // Quantité convertie (ex: bottes -> kg)
  quantity_nature?: string; // Nature spécifique (laitues, compost, bouillie...)
  quantity_type?: string; // Type: engrais, produit_phyto, recolte, plantation, vente
  phytosanitary_product_amm?: string | null; // AMM du produit phytosanitaire (pour matching)
  priority?: 'basse' | 'moyenne' | 'haute' | 'urgente'; // Priorité
  category?: string; // Catégorie
  notes?: string;
  status?: 'Terminée' | 'Prévue' | 'En cours' | 'Annulée';
  dbStatus?: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee'; // Statut original de la DB
}

export interface TaskCardProps {
  task: TaskData;
  onPress?: (task: TaskData) => void;
  onEdit?: (task: TaskData) => void;
  onComment?: (task: TaskData) => void;
  onDelete?: (task: TaskData) => void;
  style?: ViewStyle;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPress,
  onEdit,
  onComment,
  onDelete,
  style,
}) => {
  // Couleurs selon le type et statut
  const getCardColors = () => {
    if (task.type === 'completed') {
      return {
        border: colors.status.completed,
        background: colors.background.primary,
        typeColor: colors.status.completed,
      };
    } else {
      return {
        border: colors.status.planned,
        background: colors.background.primary,
        typeColor: colors.status.planned,
      };
    }
  };

  const cardColors = getCardColors();

  // Couleur de catégorie
  const getCategoryColor = () => {
    switch (task.category) {
      case 'Production': return colors.primary[600];
      case 'Marketing': return colors.secondary.blue;
      case 'Administrative': return colors.secondary.purple;
      default: return colors.gray[600];
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: cardColors.background,
          borderRadius: 12,
          padding: spacing.lg,
          marginVertical: spacing.sm,
          borderLeftWidth: 4,
          borderLeftColor: cardColors.border,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      onPress={() => onPress?.(task)}
      activeOpacity={0.7}
    >
      {/* Header avec titre et type */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: spacing.md 
      }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          {task.action && (
            <Text variant="caption" style={{ 
              color: colors.primary[600], 
              fontWeight: '600',
              marginBottom: spacing.xs 
            }}>
              {task.action}
            </Text>
          )}
          <Text variant="taskTitle" numberOfLines={2}>
            {task.title}
          </Text>
          <View style={{
            backgroundColor: cardColors.typeColor,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 12,
            alignSelf: 'flex-start',
            marginTop: spacing.xs,
          }}>
            <Text 
              variant="caption" 
              color={colors.text.inverse}
              weight="medium"
            >
              {task.type === 'completed' ? 'Tâche' : 'Planifiée'}
            </Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {task.duration && (
            <View style={{
              backgroundColor: colors.secondary.blue,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}>
              <ClockIcon size={12} color={colors.text.inverse} />
              <Text variant="caption" color={colors.text.inverse} weight="medium">
                {formatDuration(task.duration)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Cartouches d'information */}
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: spacing.sm,
        marginBottom: spacing.md 
      }}>
        {/* Cultures */}
        {task.crops?.map((crop, index) => (
          <View
            key={`crop-${index}`}
            style={{
              backgroundColor: colors.primary[100],
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <SproutIcon size={14} color={colors.primary[600]} />
            <Text variant="caption" color={colors.primary[700]} weight="medium">
              {crop}
            </Text>
          </View>
        ))}

        {/* Nombre de personnes */}
        {task.people && (
          <View style={{
            backgroundColor: colors.gray[100],
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <UserIcon size={14} color={colors.gray[600]} />
            <Text variant="caption" color={colors.gray[700]} weight="medium">
              {task.people} personne{task.people > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Catégorie */}
        {task.category && (
          <View style={{
            backgroundColor: `${getCategoryColor()}20`,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
          }}>
            <Text 
              variant="caption" 
              color={getCategoryColor()} 
              weight="medium"
            >
              {task.category}
            </Text>
          </View>
        )}

        {/* Parcelles */}
        {task.plots?.map((plot, index) => (
          <View
            key={`plot-${index}`}
            style={{
              backgroundColor: colors.secondary.orange + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapIcon size={14} color={colors.secondary.orange} />
            <Text variant="caption" color={colors.secondary.orange} weight="medium">
              {plot}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer avec date et actions */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        {/* Date */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <CalendarIcon size={14} color={colors.gray[500]} />
          <Text variant="caption" color={colors.gray[600]}>
            {formatDate(task.date)}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {onComment && (
            <TouchableOpacity
              onPress={() => onComment(task)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.gray[100],
              }}
            >
              <MessageCircleIcon size={16} color={colors.gray[600]} />
            </TouchableOpacity>
          )}
          
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(task)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.primary[100],
              }}
            >
              <EditIcon size={16} color={colors.primary[600]} />
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(task)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.semantic.error + '20',
              }}
            >
              <TrashIcon size={16} color={colors.semantic.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
