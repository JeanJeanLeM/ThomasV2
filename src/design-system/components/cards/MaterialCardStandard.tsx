import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  WrenchScrewdriverIcon,
  TruckIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  CheckmarkIcon,
} from '../../icons';

export interface MaterialData {
  id: string;
  name: string;
  // Type d'affichage dans la carte (regroupement visuel)
  type: 'tractor' | 'implement' | 'tool' | 'vehicle';
  brand: string;
  model: string;
  year?: number;
  description?: string;
  // Catégorie fonctionnelle (colonne "category" de la table materials)
  category?: 'tracteurs' | 'outils_tracteur' | 'outils_manuels' | 'materiel_marketing' | 'petit_equipement' | 'autre';
  // Libellé de catégorie personnalisé (colonne custom_category)
  custom_category?: string | null;
  // Slugs / mots-clés LLM stockés dans llm_keywords
  llm_keywords?: string[];
  // Statut actif / inactif (soft delete)
  is_active?: boolean;
}

export interface MaterialCardStandardProps {
  material: MaterialData;
  onPress?: (material: MaterialData) => void;
  onEdit?: (material: MaterialData) => void;
  onDelete?: (material: MaterialData) => void;
  style?: ViewStyle;
  showActions?: boolean;
}

export const MaterialCardStandard: React.FC<MaterialCardStandardProps> = ({
  material,
  onPress,
  onEdit,
  onDelete,
  style,
  showActions = true,
}) => {
  // Icône selon le type
  const getTypeIcon = (type: MaterialData['type']) => {
    switch (type) {
      case 'tractor':
        return <TruckIcon color={colors.primary[600]} size={24} />;
      case 'implement':
        return <CogIcon color={colors.semantic.warning} size={24} />;
      case 'tool':
        return <WrenchScrewdriverIcon color={colors.semantic.success} size={24} />;
      case 'vehicle':
        return <TruckIcon color={colors.gray[600]} size={24} />;
      default:
        return <WrenchScrewdriverIcon color={colors.gray[600]} size={24} />;
    }
  };

  const typeColor = material.type === 'tractor' ? colors.primary[600] : 
                    material.type === 'implement' ? colors.semantic.warning :
                    material.type === 'tool' ? colors.semantic.success : colors.gray[600];

  const isActive = material.is_active !== false;
  const statusColor = isActive ? colors.semantic.success : colors.gray[600];
  const statusBg = isActive ? colors.semantic.success + '20' : colors.gray[200];

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: typeColor,
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
      onPress={() => onPress?.(material)}
      activeOpacity={0.7}
    >
      {/* Header avec icône et titre */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
        {/* Icône du type */}
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
          {getTypeIcon(material.type)}
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
              {material.name}
            </Text>
          </View>
          
          <Text
            variant="body"
            style={{
              color: colors.text.secondary,
              marginBottom: spacing.xs,
            }}
          >
            {material.brand} {material.model}
          </Text>
          
          {material.year && (
            <Text
              variant="caption"
              style={{
                color: colors.text.secondary,
              }}
            >
              Année: {material.year}
            </Text>
          )}
        </View>

        {/* Statut + actions */}
        {showActions && (
          <View style={{ alignItems: 'flex-end', gap: spacing.sm, marginLeft: spacing.sm }}>
            <View
              style={{
                backgroundColor: statusBg,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 999,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: '500',
                }}
              >
                {isActive ? 'Actif' : 'Inactif'}
              </Text>
            </View>

            {onDelete && (
              <TouchableOpacity
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.gray[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(material);
                }}
              >
                {material.is_active === false ? (
                  <CheckmarkIcon color={colors.semantic.success} size={16} />
                ) : (
                  <TrashIcon color={colors.semantic.error} size={16} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Description (si disponible) */}
      {material.description && (
        <Text
          variant="caption"
          style={{
            color: colors.text.secondary,
            marginTop: spacing.sm,
          }}
          numberOfLines={2}
        >
          {material.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};
