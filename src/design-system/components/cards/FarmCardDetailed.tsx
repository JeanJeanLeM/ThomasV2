import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { FarmPhoto } from '../FarmPhoto';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { 
  MapPinIcon, 
  UserGroupIcon,
  EditIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
} from '../../icons';
import { FarmWithMembers } from '../../../services/FarmService';

export interface FarmCardDetailedProps {
  farm: FarmWithMembers;
  isActive?: boolean;
  onPress?: (farm: FarmWithMembers) => void;
  onEdit?: (farm: FarmWithMembers) => void;
  style?: ViewStyle;
}

export const FarmCardDetailed: React.FC<FarmCardDetailedProps> = ({
  farm,
  isActive = false,
  onPress,
  onEdit,
  style,
}) => {
  // Couleurs selon le statut actif
  const getCardColors = () => {
    if (isActive) {
      return {
        border: colors.primary[500],
        background: colors.background.primary,
        borderWidth: 2,
      };
    } else {
      return {
        border: colors.gray[200],
        background: colors.background.primary,
        borderWidth: 1,
      };
    }
  };

  const cardColors = getCardColors();

  // Couleur de type de ferme
  const getFarmTypeColor = () => {
    switch (farm.farm_type) {
      case 'Agriculture biologique': return colors.primary[600];
      case 'Agriculture conventionnelle': return colors.secondary.blue;
      case 'Permaculture': return colors.status.success;
      case 'Élevage': return colors.secondary.orange;
      default: return colors.gray[600];
    }
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
          borderLeftColor: isActive ? colors.primary[500] : colors.gray[300],
          borderWidth: cardColors.borderWidth,
          borderColor: cardColors.border,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        },
        style,
      ]}
      onPress={() => onPress?.(farm)}
      activeOpacity={0.7}
    >
      {/* Header avec photo, titre et statut */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: spacing.md 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.md }}>
          <FarmPhoto 
            photoUrl={(farm as any).photo_url} 
            size={48} 
            borderRadius={8}
            style={{ marginRight: spacing.sm }}
          />
          <View style={{ flex: 1 }}>
            <Text variant="taskTitle" numberOfLines={2}>
              {farm.name}
            </Text>
            {farm.farm_type && (
              <View style={{
                backgroundColor: `${getFarmTypeColor()}20`,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginTop: spacing.xs,
              }}>
                <Text 
                  variant="caption" 
                  color={getFarmTypeColor()}
                  weight="medium"
                >
                  {farm.farm_type}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Badge statut actif */}
        {isActive && (
          <View style={{
            backgroundColor: colors.primary[100],
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <CheckCircleIcon size={12} color={colors.primary[700]} />
            <Text variant="caption" color={colors.primary[700]} weight="semibold">
              Active
            </Text>
          </View>
        )}
      </View>

      {/* Description si présente */}
      {farm.description && (
        <View style={{
          backgroundColor: colors.gray[50],
          padding: spacing.sm,
          borderRadius: 8,
          marginBottom: spacing.md,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: spacing.xs,
          }}>
            <BuildingOfficeIcon size={14} color={colors.gray[600]} />
            <Text variant="caption" color={colors.gray[700]} weight="semibold">
              Description :
            </Text>
          </View>
          <Text variant="bodySmall" color={colors.gray[600]} numberOfLines={3}>
            {farm.description}
          </Text>
        </View>
      )}

      {/* Informations détaillées */}
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: spacing.sm,
        marginBottom: spacing.md 
      }}>
        {/* Superficie */}
        {farm.total_area && (
          <View style={{
            backgroundColor: colors.primary[100],
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <MapPinIcon size={14} color={colors.primary[600]} />
            <Text variant="caption" color={colors.primary[700]} weight="medium">
              {farm.total_area} ha
            </Text>
          </View>
        )}

        {/* Nombre de membres */}
        <View style={{
          backgroundColor: colors.gray[100],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <UserGroupIcon size={14} color={colors.gray[600]} />
          <Text variant="caption" color={colors.gray[700]} weight="medium">
            {farm.member_count || 1} membre{(farm.member_count || 1) > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Rôle de l'utilisateur */}
        {farm.user_role && (
          <View style={{
            backgroundColor: colors.secondary.blue + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
          }}>
            <Text 
              variant="caption" 
              color={colors.secondary.blue} 
              weight="medium"
            >
              {farm.user_role === 'owner' ? 'Propriétaire' : 
               farm.user_role === 'manager' ? 'Gestionnaire' : 
               farm.user_role === 'worker' ? 'Employé' : farm.user_role}
            </Text>
          </View>
        )}

        {/* Région */}
        {farm.region && (
          <View style={{
            backgroundColor: colors.secondary.orange + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 16,
          }}>
            <Text variant="caption" color={colors.secondary.orange} weight="medium">
              {farm.region}
            </Text>
          </View>
        )}
      </View>

      {/* Footer avec adresse et actions */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        {/* Adresse */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          flex: 1,
        }}>
          {farm.address && farm.city ? (
            <>
              <MapPinIcon size={14} color={colors.gray[500]} />
              <Text variant="caption" color={colors.gray[600]} numberOfLines={1}>
                {farm.address}, {farm.city}
              </Text>
            </>
          ) : farm.city ? (
            <>
              <MapPinIcon size={14} color={colors.gray[500]} />
              <Text variant="caption" color={colors.gray[600]}>
                {farm.city}
              </Text>
            </>
          ) : (
            <Text variant="caption" color={colors.gray[500]}>
              {farm.created_at ? `Créée le ${formatDate(farm.created_at)}` : 'Ferme'}
            </Text>
          )}
        </View>

        {/* Action modifier */}
        {onEdit && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onEdit(farm);
            }}
            style={{
              padding: spacing.xs,
              borderRadius: 6,
              backgroundColor: colors.primary[100],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <EditIcon size={16} color={colors.primary[600]} />
            <Text variant="caption" color={colors.primary[700]} weight="medium">
              Modifier
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};


