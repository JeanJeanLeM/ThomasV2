import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  EyeIcon,
  AlertTriangleIcon,
  SproutIcon,
  MapIcon,
  CalendarIcon,
  EditIcon,
  CameraIcon,
  ThermometerIcon,
  DropletsIcon,
} from '../../icons';
import { formatObservationTitle } from '../../../utils/observationFormatters';

export interface ObservationData {
  id: string;
  title: string;
  description?: string;
  date: Date;
  severity: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  category: 'ravageurs' | 'maladies' | 'carences' | 'dégâts_climatiques' | 'croissance_anormale' | 'autre';
  issue?: string;
  crops?: string[];
  plots?: string[];
  weather?: {
    temperature?: number;
    humidity?: number;
    conditions?: string;
  };
  photos?: number; // Nombre de photos
  actions?: string[]; // Actions recommandées
  status?: 'Nouvelle' | 'En cours' | 'Résolue' | 'Suivie';
}

export interface ObservationCardProps {
  observation: ObservationData;
  onPress?: (observation: ObservationData) => void;
  onEdit?: (observation: ObservationData) => void;
  onViewPhotos?: (observation: ObservationData) => void;
  style?: ViewStyle;
}

export const ObservationCard: React.FC<ObservationCardProps> = ({
  observation,
  onPress,
  onEdit,
  onViewPhotos,
  style,
}) => {
  // Couleurs selon la sévérité
  const getSeverityColors = () => {
    switch (observation.severity) {
      case 'Faible':
        return {
          border: colors.secondary.yellow,
          background: colors.secondary.yellow + '10',
          text: colors.secondary.yellow,
        };
      case 'Moyen':
        return {
          border: colors.secondary.orange,
          background: colors.secondary.orange + '10',
          text: colors.secondary.orange,
        };
      case 'Élevé':
        return {
          border: colors.secondary.red,
          background: colors.secondary.red + '10',
          text: colors.secondary.red,
        };
      case 'Critique':
        return {
          border: '#dc2626',
          background: '#dc262610',
          text: '#dc2626',
        };
      default:
        return {
          border: colors.gray[400],
          background: colors.gray[100],
          text: colors.gray[600],
        };
    }
  };

  const severityColors = getSeverityColors();

  // Icône selon la catégorie
  const getCategoryIcon = () => {
    switch (observation.category) {
      case 'ravageurs':
        return <AlertTriangleIcon size={16} color={colors.secondary.red} />;
      case 'maladies':
        return <AlertTriangleIcon size={16} color={colors.secondary.orange} />;
      case 'carences':
        return <SproutIcon size={16} color={colors.secondary.yellow} />;
      case 'dégâts_climatiques':
        return <ThermometerIcon size={16} color={colors.secondary.blue} />;
      case 'croissance_anormale':
        return <SproutIcon size={16} color={colors.primary[600]} />;
      default:
        return <EyeIcon size={16} color={colors.gray[600]} />;
    }
  };

  const getCategoryLabel = () => {
    switch (observation.category) {
      case 'ravageurs': return 'Ravageurs';
      case 'maladies': return 'Maladies';
      case 'carences': return 'Carences';
      case 'dégâts_climatiques': return 'Dégâts climatiques';
      case 'croissance_anormale': return 'Croissance anormale';
      default: return 'Autre';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.background.primary,
          borderRadius: 12,
          padding: spacing.lg,
          marginVertical: spacing.sm,
          borderLeftWidth: 4,
          borderLeftColor: severityColors.border,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      onPress={() => onPress?.(observation)}
      activeOpacity={0.7}
    >
      {/* Header avec titre et sévérité */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: spacing.md 
      }}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text variant="taskTitle" numberOfLines={2}>
            {formatObservationTitle(observation.title, observation.category as string)}
          </Text>
          <View style={{
            backgroundColor: colors.secondary.orange,
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
              Observation
            </Text>
          </View>
        </View>

        {/* Sévérité */}
        <View style={{
          backgroundColor: severityColors.background,
          borderWidth: 1,
          borderColor: severityColors.border,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <AlertTriangleIcon size={12} color={severityColors.text} />
          <Text variant="caption" color={severityColors.text} weight="bold">
            {observation.severity}
          </Text>
        </View>
      </View>

      {/* Description si présente */}
      {observation.description && (
        <Text 
          variant="bodySmall" 
          color={colors.gray[600]}
          numberOfLines={2}
          style={{ marginBottom: spacing.md }}
        >
          {observation.description}
        </Text>
      )}

      {/* Cartouches d'information */}
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: spacing.sm,
        marginBottom: spacing.md 
      }}>
        {/* Catégorie */}
        <View style={{
          backgroundColor: colors.gray[100],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          {getCategoryIcon()}
          <Text variant="caption" color={colors.gray[700]} weight="medium">
            {getCategoryLabel()}
          </Text>
        </View>

        {/* Cultures affectées */}
        {observation.crops?.map((crop, index) => (
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

        {/* Parcelles */}
        {observation.plots?.map((plot, index) => (
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

        {/* Conditions météo */}
        {observation.weather?.temperature && (
          <View style={{
            backgroundColor: colors.secondary.blue + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <ThermometerIcon size={14} color={colors.secondary.blue} />
            <Text variant="caption" color={colors.secondary.blue} weight="medium">
              {observation.weather.temperature}°C
            </Text>
          </View>
        )}

        {observation.weather?.humidity && (
          <View style={{
            backgroundColor: colors.secondary.blue + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <DropletsIcon size={14} color={colors.secondary.blue} />
            <Text variant="caption" color={colors.secondary.blue} weight="medium">
              {observation.weather.humidity}%
            </Text>
          </View>
        )}

        {/* Photos */}
        {observation.photos && observation.photos > 0 && (
          <TouchableOpacity
            onPress={() => onViewPhotos?.(observation)}
            style={{
              backgroundColor: colors.secondary.purple + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CameraIcon size={14} color={colors.secondary.purple} />
            <Text variant="caption" color={colors.secondary.purple} weight="medium">
              {observation.photos} photo{observation.photos > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Actions recommandées */}
      {observation.actions && observation.actions.length > 0 && (
        <View style={{
          backgroundColor: colors.primary[50],
          padding: spacing.sm,
          borderRadius: 8,
          marginBottom: spacing.md,
        }}>
          <Text variant="caption" color={colors.primary[700]} weight="semibold" style={{ marginBottom: spacing.xs }}>
            Actions recommandées :
          </Text>
          {observation.actions.slice(0, 2).map((action, index) => (
            <Text key={index} variant="caption" color={colors.primary[600]}>
              • {action}
            </Text>
          ))}
          {observation.actions.length > 2 && (
            <Text variant="caption" color={colors.primary[500]}>
              +{observation.actions.length - 2} autre{observation.actions.length - 2 > 1 ? 's' : ''}...
            </Text>
          )}
        </View>
      )}

      {/* Footer avec date/heure et actions */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        {/* Date et heure */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <CalendarIcon size={14} color={colors.gray[500]} />
            <Text variant="caption" color={colors.gray[600]}>
              {formatDate(observation.date)}
            </Text>
          </View>
          <Text variant="caption" color={colors.gray[500]}>
            {formatTime(observation.date)}
          </Text>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {onEdit && (
            <TouchableOpacity
              onPress={() => onEdit(observation)}
              style={{
                padding: spacing.xs,
                borderRadius: 6,
                backgroundColor: colors.secondary.orange + '20',
              }}
            >
              <EditIcon size={16} color={colors.secondary.orange} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
