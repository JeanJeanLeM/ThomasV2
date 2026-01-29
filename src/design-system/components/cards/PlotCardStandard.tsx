import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  MapIcon,
  TrashIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '../../icons';

export interface PlotData {
  id: string;
  name: string;
  area: number;
  unit: string;
  is_active?: boolean; // ✅ Conforme au SOFT_DELETE_SYSTEM_GUIDE.md
  code: string;
  type: 'serre_plastique' | 'serre_verre' | 'plein_champ' | 'tunnel' | 'hydroponique' | 'pepiniere' | 'autre';
  length: number;
  width: number;
  description: string;
  /**
   * Slug principal pour la parcelle (ex: "parcelle-3-serre-tomates-nord").
   * Servira au matching LLM côté backend.
   */
  slug?: string | undefined;
  /**
   * Autres variantes de slugs / mots-clés (synonymes, surnoms…).
   * Aligné conceptuellement sur aliases / llm_keywords du schéma SQL.
   */
  aliases?: string[] | undefined;
  /**
   * Libellé de type personnalisé pour la parcelle lorsque type = "autre".
   * Exemple : "Mandala", "Jardin pédagogique", etc.
   */
  customTypeLabel?: string | undefined;
  /**
   * Unités de surface rattachées à la parcelle (planches, rangs, lignes…).
   * Modèle aligné sur la table surface_units (id local, code, type, dimensions…).
   */
  surfaceUnits?: {
    id: string;
    name: string;
    code?: string;
    fullName?: string;
    type?: string;
    sequenceNumber?: number;
    length?: number;
    width?: number;
  }[] | undefined;
}

export interface PlotCardStandardProps {
  plot: PlotData;
  onPress?: (plot: PlotData) => void;
  onEdit?: (plot: PlotData) => void;
  onDelete?: (plot: PlotData) => void;
  style?: ViewStyle;
  showActions?: boolean;
}

export const PlotCardStandard: React.FC<PlotCardStandardProps> = ({
  plot,
  onPress,
  onEdit,
  onDelete,
  style,
  showActions = true,
}) => {
  // Couleurs selon le statut
  const getStatusColor = (status: PlotData['status']) => {
    switch (status) {
      case 'active':
        return colors.semantic.success;
      case 'inactive':
        return colors.gray[400];
      default:
        return colors.gray[400];
    }
  };

  const getTypeLabel = () => {
    if (plot.customTypeLabel && plot.customTypeLabel.trim().length > 0) {
      return plot.customTypeLabel;
    }
    switch (plot.type) {
      case 'plein_champ':
        return 'Plein champ';
      case 'serre_plastique':
        return 'Serre plastique';
      case 'serre_verre':
        return 'Serre verre';
      case 'tunnel':
        return 'Tunnel';
      case 'hydroponique':
        return 'Hydroponique';
      case 'pepiniere':
        return 'Pépinière';
      case 'autre':
      default:
        return 'Autre';
    }
  };

  const isActive = plot.is_active !== false;
  const statusColor = getStatusColor(isActive ? 'active' : 'inactive');

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
          padding: spacing.lg,
          marginBottom: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      onPress={() => onPress?.(plot)}
      activeOpacity={0.7}
    >
      {/* Header avec icône et titre */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
        {/* Icône de parcelle */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.gray[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          }}
        >
          <MapIcon color={colors.semantic.success} size={24} />
        </View>
        
        {/* Informations principales */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text
              variant="h4"
              style={{
                color: colors.text.primary,
                flex: 1,
              }}
            >
              {plot.name}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              variant="body"
              style={{
                color: colors.text.secondary,
              }}
            >
              {plot.area} {plot.unit}
            </Text>
            
            {/* Cartouche actif/inactif */}
            <View
              style={{
                backgroundColor: isActive ? colors.semantic.success + '20' : colors.gray[200],
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: isActive ? colors.semantic.success : colors.gray[600],
                  fontSize: 11,
                  fontWeight: '500',
                }}
              >
                {isActive ? 'Actif' : 'Inactif'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action soft delete / réactivation */}
        {showActions && onDelete && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginLeft: spacing.sm }}>
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={(e) => {
                e.stopPropagation();
                onDelete(plot);
              }}
            >
              {!isActive ? (
                <CheckCircleIcon color={colors.semantic.success} size={18} />
              ) : (
                <TrashIcon color={colors.semantic.error} size={16} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Informations supplémentaires */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {/* Infos de structure (code / type) */}
        <View style={{ flex: 1 }}>
          {plot.code && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <MapPinIcon color={colors.gray[500]} size={14} />
              <Text
                variant="caption"
                style={{
                  color: colors.text.secondary,
                  marginLeft: spacing.xs,
                }}
              >
                Code: {plot.code}
              </Text>
            </View>
          )}

          {plot.type && (
            <Text
              variant="caption"
              style={{
                color: colors.text.secondary,
              }}
            >
              Type: {getTypeLabel()}
            </Text>
          )}
        </View>

        {/* Surface en grand */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.primary[600],
            }}
          >
            {plot.area}
          </Text>
          <Text
            variant="caption"
            style={{
              color: colors.text.secondary,
              fontSize: 12,
            }}
          >
            {plot.unit}
          </Text>
        </View>
      </View>

      {/* Unités de surface si disponibles */}
      {plot.surfaceUnits && plot.surfaceUnits.length > 0 && (
        <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray[200] }}>
          <Text
            variant="caption"
            style={{
              color: colors.text.secondary,
              fontWeight: '600',
              marginBottom: spacing.xs,
            }}
          >
            Unités de surface ({plot.surfaceUnits.length})
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {plot.surfaceUnits.slice(0, 3).map((unit) => (
              <View
                key={unit.id}
                style={{
                  backgroundColor: colors.gray[100],
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 8,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: colors.text.secondary,
                    fontSize: 11,
                  }}
                >
                  {unit.fullName || unit.name}
                </Text>
              </View>
            ))}
            {plot.surfaceUnits.length > 3 && (
              <View
                style={{
                  backgroundColor: colors.primary[100],
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 8,
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: colors.primary[700],
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  +{plot.surfaceUnits.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Description si disponible */}
      {plot.description && (
        <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.gray[200] }}>
          <Text
            variant="caption"
            style={{
              color: colors.text.secondary,
              fontStyle: 'italic',
            }}
            numberOfLines={2}
          >
            {plot.description}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
