import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  Alert,
} from 'react-native';
import { Modal } from '../Modal';
import { Text } from '../Text';
import { Button } from '../Button';
import { Input } from '../Input';
import { FarmPhoto } from '../FarmPhoto';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '../../../contexts/FarmContext';
import type { UserFarm } from '../../../services/SimpleInitService';

export interface FarmSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentFarmId?: number | null;
  onFarmSelect: (farm: UserFarm) => void;
  onCreateFarm?: () => void;
}

export const FarmSelectorModal: React.FC<FarmSelectorModalProps> = ({
  visible,
  onClose,
  currentFarmId,
  onFarmSelect,
  onCreateFarm,
}) => {
  const { farms, loading, activeFarm, changeActiveFarm } = useFarm();
  const [searchQuery, setSearchQuery] = useState('');

  console.log('🚀 [DEBUG] FarmSelectorModal - farms:', farms);
  console.log('🚀 [DEBUG] FarmSelectorModal - activeFarm:', activeFarm);
  console.log('🚀 [DEBUG] FarmSelectorModal - currentFarmId:', currentFarmId);

  // Filtrer les fermes selon la recherche
  const filteredFarms = useMemo(() => {
    if (!searchQuery.trim()) return farms;
    
    const query = searchQuery.toLowerCase();
    return farms.filter(farm => 
      farm.farm_name.toLowerCase().includes(query) ||
      farm.role.toLowerCase().includes(query)
    );
  }, [farms, searchQuery]);

  const getFarmTypeLabel = (type?: string) => {
    const types = {
      maraichage: 'Maraîchage',
      arboriculture: 'Arboriculture',
      grandes_cultures: 'Grandes cultures',
      mixte: 'Mixte',
      autre: 'Autre',
    };
    return type ? types[type as keyof typeof types] || type : '';
  };

  const getRoleLabel = (role: string) => {
    const roles = {
      owner: 'Propriétaire',
      manager: 'Gestionnaire',
      employee: 'Employé',
      advisor: 'Conseiller',
      viewer: 'Observateur',
    };
    return roles[role as keyof typeof roles] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors = {
      owner: colors.semantic?.success || '#10B981',
      manager: colors.primary?.[600] || '#16A34A',
      employee: colors.semantic?.info || '#3B82F6',
      advisor: colors.semantic?.warning || '#F59E0B',
      viewer: colors.gray?.[500] || '#6B7280',
    };
    return roleColors[role as keyof typeof roleColors] || colors.gray?.[500];
  };

  const handleFarmSelect = async (farm: UserFarm) => {
    console.log('🚀 [DEBUG] FarmSelectorModal - Sélection ferme:', farm);
    console.log(`✅ Ferme "${farm.farm_name}" sélectionnée comme ferme active`);
    
    try {
      await changeActiveFarm(farm);
      onFarmSelect(farm);
    } catch (error) {
      console.error('❌ Erreur lors du changement de ferme active:', error);
    }
    // Ne pas fermer automatiquement le modal - laisser l'utilisateur choisir
  };

  const farmCardStyle: ViewStyle = {
    backgroundColor: colors.background?.primary || '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray?.[200] || '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  };

  const selectedFarmCardStyle: ViewStyle = {
    ...farmCardStyle,
    borderColor: colors.primary?.[300] || '#86EFAC',
    backgroundColor: colors.primary?.[50] || '#F0FDF4',
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Sélectionner une ferme"
      size="md"
      showCloseButton
    >
      <View style={{ maxHeight: 500 }}>
        {/* Champ de recherche */}
        <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.md }}>
          <Input
            placeholder="Rechercher une ferme..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Ionicons name="search" size={20} color={colors.gray[400]} />}
          />
        </View>

        {loading ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text variant="body" color={colors.text?.secondary}>
              Chargement des fermes...
            </Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={true} 
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={{ padding: spacing.sm }}>
              {filteredFarms.length === 0 && searchQuery.trim() ? (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Ionicons name="search" size={48} color={colors.gray[300]} />
                  <Text variant="body" color={colors.text?.secondary} style={{ marginTop: spacing.md, textAlign: 'center' }}>
                    Aucune ferme trouvée pour "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredFarms.map((farm) => {
                const isSelected = farm.farm_id === activeFarm?.farm_id;
                // Déterminer le rôle de l'utilisateur pour cette ferme
                const userRole = farm.role || 'owner'; // Par défaut owner si pas spécifié
                
                return (
                  <TouchableOpacity
                    key={farm.farm_id}
                    style={isSelected ? selectedFarmCardStyle : farmCardStyle}
                    onPress={() => handleFarmSelect(farm)}
                    activeOpacity={0.7}
                  >
                    {/* Header avec photo, nom et rôle */}
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: spacing.xs 
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <FarmPhoto 
                          photoUrl={null} 
                          size={40} 
                          borderRadius={8}
                          style={{ marginRight: spacing.sm }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            variant="h4"
                            weight="semibold"
                            color={colors.text?.primary}
                            numberOfLines={1}
                          >
                            {farm.farm_name}
                          </Text>
                          <Text
                            variant="caption"
                            color={colors.text?.secondary}
                            numberOfLines={2}
                            style={{ marginTop: 2 }}
                          >
                            {farm.is_owner ? 'Propriétaire' : `Rôle: ${getRoleLabel(farm.role)}`}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Badge rôle */}
                      <View style={{
                        backgroundColor: getRoleColor(userRole),
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 2,
                        borderRadius: 8,
                        marginLeft: spacing.sm,
                      }}>
                        <Text
                          variant="caption"
                          style={{ 
                            color: '#FFFFFF', 
                            fontSize: 10, 
                            fontWeight: '600' 
                          }}
                        >
                          {getRoleLabel(userRole)}
                        </Text>
                      </View>
                    </View>

                    {/* Informations ferme */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: spacing.sm 
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons 
                          name="business-outline" 
                          size={14} 
                          color={colors.text?.secondary} 
                        />
                        <Text
                          variant="caption"
                          color={colors.text?.secondary}
                          style={{ marginLeft: 4 }}
                        >
                          ID: {farm.farm_id}
                        </Text>
                      </View>
                    </View>

                    {/* Indicateur sélection */}
                    {isSelected && (
                      <View style={{
                        position: 'absolute',
                        top: spacing.sm,
                        right: spacing.sm,
                      }}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary?.[600] || '#16A34A'}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
                })
              )}
              
              {farms.length === 0 && !loading && (
                <View style={{ 
                  padding: spacing.xl, 
                  alignItems: 'center',
                  backgroundColor: colors.gray?.[50] || '#F9FAFB',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.gray?.[200] || '#E5E7EB',
                  borderStyle: 'dashed',
                }}>
                  <Ionicons
                    name="business-outline"
                    size={32}
                    color={colors.gray?.[400] || '#9CA3AF'}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Text
                    variant="body"
                    color={colors.text?.secondary}
                    align="center"
                    style={{ marginBottom: spacing.sm }}
                  >
                    Aucune ferme trouvée
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text?.secondary}
                    align="center"
                  >
                    Créez votre première ferme ou demandez à être invité
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Actions */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.gray?.[200] || '#E5E7EB',
      }}>
        <Button
          variant="ghost"
          size="md"
          title="Terminé"
          onPress={onClose}
        />
        
        {onCreateFarm && (
          <Button
            variant="primary"
            size="md"
            title="Gérer les fermes"
            leftIcon={<Ionicons name="settings" size={16} color="#FFFFFF" />}
            onPress={() => {
              onCreateFarm();
              onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
};

