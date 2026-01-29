import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  ArrowsRightLeftIcon,
  TrashIcon,
  CheckmarkIcon,
} from '../../icons';

export interface ConversionData {
  id: string;
  name: string;
  category: 'recolte' | 'intrant' | 'custom';
  fromUnit: string;
  toUnit: string;
  factor: number;
  description?: string;
  isActive?: boolean;
  containerType?: string;
  whatType?: 'culture' | 'phytosanitary' | 'material' | 'custom';
}

export interface ConversionCardMinimalProps {
  conversion: ConversionData;
  onPress?: (conversion: ConversionData) => void;
  onEdit?: (conversion: ConversionData) => void;
  onToggleActive?: (conversion: ConversionData) => void;
  style?: ViewStyle;
  isSelected?: boolean;
}

export const ConversionCardMinimal: React.FC<ConversionCardMinimalProps> = ({
  conversion,
  onPress,
  onEdit,
  onToggleActive,
  style,
  isSelected = false,
}) => {
  // Couleurs selon la catégorie
  const getCategoryColor = (category: ConversionData['category']) => {
    switch (category) {
      case 'recolte':
        return colors.semantic.success;
      case 'intrant':
        return colors.semantic.warning;
      case 'custom':
        return colors.gray[600];
      default:
        return colors.gray[400];
    }
  };

  const getCategoryLabel = (category: ConversionData['category']) => {
    switch (category) {
      case 'recolte':
        return 'Récolte';
      case 'intrant':
        return 'Intrant';
      case 'custom':
        return 'Personnalisé';
      default:
        return 'Autre';
    }
  };

  const categoryColor = getCategoryColor(conversion.category);

  const isActive = conversion.isActive !== false; // Par défaut actif si non spécifié

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: 8,
          padding: spacing.md,
          marginVertical: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: categoryColor,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          opacity: isActive ? 1 : 0.6, // Réduire l'opacité si inactif
        },
        isSelected && {
          borderWidth: 2,
          borderColor: colors.primary[600],
        },
        !isActive && {
          backgroundColor: colors.gray[100], // Fond grisé si inactif
        },
        style,
      ]}
      onPress={() => onEdit?.(conversion)} // Clic pour éditer
      activeOpacity={0.7}
    >
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
      }}>
        {/* Contenu principal */}
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text variant="body" numberOfLines={1} weight="medium">
            {conversion.name}
          </Text>
          
          {/* Informations compactes */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.xs,
          }}>
            {/* Conversion */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}>
              <ArrowsRightLeftIcon size={12} color={colors.gray[500]} />
              <Text variant="caption" color={colors.gray[600]}>
                {conversion.fromUnit} → {conversion.toUnit}
              </Text>
            </View>

            {/* Facteur */}
            <Text variant="caption" color={colors.gray[600]}>
              ×{conversion.factor}
            </Text>

            {/* Catégorie */}
            <View style={{
              backgroundColor: categoryColor,
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderRadius: 6,
            }}>
              <Text 
                variant="caption" 
                color={colors.text.inverse}
                weight="medium"
                style={{ fontSize: 10 }}
              >
                {getCategoryLabel(conversion.category)}
              </Text>
            </View>

            {/* ✅ CONFORME AU GUIDE : Badge inactif standardisé */}
            {!isActive && (
              <View style={styles.inactiveStatusBadge}>
                <Text 
                  variant="caption" 
                  color={colors.gray[600]}
                  weight="semibold"
                  style={{ fontSize: 10 }}
                >
                  Inactif
                </Text>
              </View>
            )}
          </View>

          {/* Description si disponible */}
          {conversion.description && (
            <Text 
              variant="caption" 
              color={colors.text.secondary}
              numberOfLines={1}
              style={{ marginTop: spacing.xs }}
            >
              {conversion.description}
            </Text>
          )}
        </View>

        {/* UN SEUL BOUTON qui switch selon l'état */}
        {onToggleActive && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleActive(conversion);
            }}
            style={{
              padding: spacing.xs,
              borderRadius: 6,
              backgroundColor: isActive ? colors.semantic.error + '15' : colors.semantic.success + '15',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* Icône qui switch : Actif = Poubelle, Inactif = Checkmark */}
            {isActive ? (
              <TrashIcon size={14} color={colors.semantic.error} />
            ) : (
              <CheckmarkIcon size={14} color={colors.semantic.success} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ✅ CONFORME AU GUIDE : Style du badge inactif standardisé
const styles = StyleSheet.create({
  inactiveStatusBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
});
