import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Text, Button, Input } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { PlusIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, ArrowPathIcon } from '../design-system/icons';
import { useFarm } from '../contexts/FarmContext';

interface FarmListScreenProps {
  navigation?: {
    goBack?: () => void;
  };
  onFarmEdit?: (farmId?: number) => void;
  onCreateFarm?: () => void;
}

export const FarmListScreen: React.FC<FarmListScreenProps> = ({ 
  navigation,
  onFarmEdit,
  onCreateFarm 
}) => {
  const { farms, activeFarm, changeActiveFarm, loading, refreshFarms } = useFarm();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'manager' | 'worker'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ne PAS appeler refreshFarms dans useEffect - les données sont déjà chargées par le FarmContext

  // Calculer les statistiques
  const totalFarms = farms.length;
  const ownerFarms = farms.filter(f => f.is_owner).length;
  const memberFarms = farms.filter(f => !f.is_owner).length;

  // Debug: afficher le nombre de fermes
  console.log('🚀 [DEBUG] FarmListScreen - Nombre de fermes:', farms.length);
  console.log('🚀 [DEBUG] FarmListScreen - Fermes:', farms.map(f => ({ id: f.farm_id, name: f.farm_name, role: f.role })));
  console.log('🚀 [DEBUG] FarmListScreen - Loading:', loading);
  console.log('🚀 [DEBUG] FarmListScreen - Statistiques:', { totalFarms, ownerFarms, memberFarms });

  const handleFarmSelect = async (farm: any) => {
    try {
      await changeActiveFarm(farm);
      // Feedback visuel pour confirmer la sélection
      if (Platform.OS === 'web') {
        console.log(`✅ Ferme "${farm.farm_name}" sélectionnée comme ferme active`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sélection de ferme:', error);
    }
  };

  const handleFarmEdit = (farm: any) => {
    console.log('🏢 [FARM-LIST] Opening farm edit for:', farm.farm_name, 'ID:', farm.farm_id);
    onFarmEdit?.(farm.farm_id);
  };

  const handleCreateFarm = () => {
    console.log('🏢 [FARM-LIST] Creating new farm');
    onCreateFarm?.();
  };

  const handleRefresh = async () => {
    console.log('🔄 [DEBUG] Refresh des fermes');
    setIsRefreshing(true);
    try {
      await refreshFarms();
    } catch (error) {
      console.error('❌ Erreur lors du refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtrage des fermes
  const filteredFarms = farms.filter((farm) => {
    // Filtre par rôle
    if (roleFilter !== 'all') {
      if (roleFilter === 'owner' && !farm.is_owner) return false;
      if (roleFilter !== 'owner' && farm.role !== roleFilter) return false;
    }

    // Filtre par recherche
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const haystack = [
      farm.farm_name,
      '', // description pas disponible dans UserFarm
      '', // address pas disponible dans UserFarm
      farm.city,
      farm.region,
      farm.farm_type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });

  // Statistiques (déjà calculées plus haut)

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}> {/* Fond gris plus clair pour plus de contraste */}
      {/* Pas de header ici - il est géré par le navigateur */}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête avec titre et bouton d'ajout */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.lg,
        }}>
          <View>
            <Text variant="h2" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
              Mes Fermes
            </Text>
            <Text variant="body" color={colors.text.secondary}>
              {totalFarms} ferme{totalFarms > 1 ? 's' : ''} connectée{totalFarms > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={isRefreshing}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isRefreshing ? colors.gray[200] : colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.gray[300],
              }}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={colors.gray[600]} />
              ) : (
                <ArrowPathIcon color={colors.gray[600]} size={20} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleCreateFarm}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary[600],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte de statistiques */}
        <View style={{
          backgroundColor: colors.background.primary,
          borderRadius: 12,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.md,
            gap: spacing.sm,
          }}>
            <WrenchScrewdriverIcon color={colors.semantic.success} size={22} />
            <Text variant="h3" color={colors.text.primary}>
              Aperçu de vos fermes
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.semantic.success,
                marginBottom: 2,
              }}>
                {totalFarms}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.text.secondary,
              }}>
                Total
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.primary[600],
                marginBottom: 2,
              }}>
                {ownerFarms}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.text.secondary,
              }}>
                Propriétaire
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.secondary.blue,
                marginBottom: 2,
              }}>
                {memberFarms}
              </Text>
              <Text style={{
                fontSize: 12,
                color: colors.text.secondary,
              }}>
                Membre
              </Text>
            </View>
          </View>
        </View>

        {/* Recherche et filtres */}
        <View style={{ marginBottom: spacing.lg }}>
          <Input
            placeholder="Rechercher une ferme (nom, ville, type...)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ marginBottom: spacing.md }}
          />
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 0,
              gap: spacing.sm,
            }}
          >
            {[
              { key: 'all', label: 'Toutes', count: totalFarms, color: colors.gray[600] },
              { key: 'owner', label: 'Propriétaire', count: ownerFarms, color: colors.primary[600] },
              { key: 'manager', label: 'Gestionnaire', count: farms.filter(f => f.role === 'manager').length, color: colors.secondary.blue },
              { key: 'worker', label: 'Employé', count: farms.filter(f => f.role === 'worker').length, color: colors.secondary.orange },
            ].map((filter) => {
              const isSelected = roleFilter === filter.key;
              
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 20,
                    backgroundColor: isSelected ? filter.color : colors.background.primary,
                    borderWidth: 1,
                    borderColor: isSelected ? filter.color : colors.gray[300],
                    gap: spacing.xs,
                  }}
                  onPress={() => setRoleFilter(filter.key as any)}
                >
                  <Text
                    variant="caption"
                    weight="medium"
                    color={isSelected ? colors.text.inverse : colors.text.secondary}
                  >
                    {filter.label}
                  </Text>
                  
                  {filter.count > 0 && (
                    <View
                      style={{
                        backgroundColor: isSelected ? colors.background.primary : colors.primary[600],
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text
                        variant="caption"
                        weight="bold"
                        color={isSelected ? filter.color : colors.text.inverse}
                        style={{ fontSize: 10 }}
                      >
                        {filter.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {loading ? (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: 200,
          }}>
            <Text variant="body" color={colors.text.secondary}>
              Chargement des fermes...
            </Text>
            <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.sm }}>
              Connexion à la base de données...
            </Text>
          </View>
        ) : filteredFarms.length === 0 ? (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: 300,
            backgroundColor: colors.background.primary,
            borderRadius: 12,
            padding: spacing.xl,
          }}>
            <BuildingOfficeIcon color={colors.gray[400]} size={48} />
            <Text variant="h3" color={colors.text.primary} style={{ marginTop: spacing.md, textAlign: 'center' }}>
              {farms.length === 0 ? 'Aucune ferme' : 'Aucun résultat'}
            </Text>
            <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {farms.length === 0 
                ? 'Créez votre première ferme pour commencer'
                : 'Aucune ferme ne correspond à vos critères de recherche'
              }
            </Text>
            <Button
              title="Créer une ferme"
              variant="primary"
              onPress={handleCreateFarm}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {filteredFarms.map((farm) => (
              <TouchableOpacity
                key={farm.farm_id}
                onPress={() => handleFarmSelect(farm)}
                style={{
                  backgroundColor: colors.background.primary,
                  borderRadius: 12,
                  padding: spacing.lg,
                  borderWidth: activeFarm?.farm_id === farm.farm_id ? 2 : 1,
                  borderColor: activeFarm?.farm_id === farm.farm_id ? colors.primary[500] : colors.gray[200],
                  shadowColor: colors.gray[900],
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <BuildingOfficeIcon color={colors.primary[600]} size={24} />
                      <Text variant="h3" color={colors.text.primary}>
                        {farm.farm_name}
                      </Text>
                      {activeFarm?.farm_id === farm.farm_id && (
                        <View style={{
                          backgroundColor: colors.primary[100],
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 2,
                          borderRadius: 12,
                        }}>
                          <Text variant="caption" color={colors.primary[700]} weight="semibold">
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="body" color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
                      {farm.is_owner ? 'Propriétaire' : `Rôle: ${farm.role}`}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleFarmEdit(farm);
                    }}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.gray[100],
                      borderRadius: 8,
                    }}
                  >
                    <Text variant="caption" color={colors.primary[600]} weight="semibold">
                      Modifier
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {/* Bouton créer une nouvelle ferme */}
            <TouchableOpacity
              onPress={handleCreateFarm}
              style={{
                backgroundColor: colors.background.primary,
                borderRadius: 12,
                padding: spacing.lg,
                borderWidth: 2,
                borderColor: colors.primary[200],
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 100,
              }}
            >
              <PlusIcon color={colors.primary[500]} size={24} />
              <Text variant="body" color={colors.primary[600]} weight="semibold" style={{ marginTop: spacing.sm }}>
                Créer une nouvelle ferme
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default FarmListScreen;

