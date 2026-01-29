import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Screen, Text, Card, Button, FarmEditModal, EmptyState } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { PlusIcon, MapPinIcon, UsersIcon, EditIcon, BuildingOffice2Icon } from '../design-system/icons';
import { FarmService } from '../services/FarmService';
import type { FarmData } from '../design-system/components/modals/FarmEditModal';

export default function FarmsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const farms = [
    {
      id: 1,
      name: 'Ferme Bio des Collines',
      type: 'Maraîchage biologique',
      area: '5.2 ha',
      location: 'Condrieu, Rhône-Alpes',
      members: 2,
      role: 'Propriétaire'
    },
    {
      id: 2,
      name: 'GAEC du Soleil Levant',
      type: 'Exploitation mixte',
      area: '12.8 ha',
      location: 'Saint-Marcellin, Rhône-Alpes',
      members: 4,
      role: 'Propriétaire'
    },
    {
      id: 3,
      name: 'Les Jardins de Thomas',
      type: 'Permaculture',
      area: '2.1 ha',
      location: 'Valence, Rhône-Alpes',
      members: 1,
      role: 'Propriétaire'
    }
  ];

  const handleCreateFarm = () => {
    setSelectedFarm(undefined);
    setIsModalVisible(true);
  };

  const handleEditFarm = (farm: any) => {
    // Convertir les données de la ferme au format FarmData
    const farmData: FarmData = {
      id: farm.id,
      name: farm.name,
      description: farm.type, // Utiliser le type comme description temporaire
      address: undefined,
      postal_code: undefined,
      city: farm.location?.split(',')[0]?.trim(),
      region: farm.location?.split(',')[1]?.trim(),
      country: 'France',
      total_area: parseFloat(farm.area?.replace(' ha', '')) || undefined,
      farm_type: 'maraichage', // Type par défaut
    };
    setSelectedFarm(farmData);
    setIsModalVisible(true);
  };

  const handleSaveFarm = async (farmData: FarmData) => {
    setIsLoading(true);
    try {
      if (farmData.id) {
        // Mise à jour d'une ferme existante
        await FarmService.updateFarm(farmData.id, farmData);
        Alert.alert('Succès', 'Les informations de la ferme ont été mises à jour');
      } else {
        // Création d'une nouvelle ferme
        await FarmService.createFarm(farmData);
        Alert.alert('Succès', 'La ferme a été créée avec succès');
      }
      // TODO: Recharger la liste des fermes
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFarm = async (farmId: number) => {
    setIsLoading(true);
    try {
      await FarmService.deleteFarm(farmId);
      Alert.alert('Succès', 'La ferme a été supprimée');
      // TODO: Recharger la liste des fermes
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer la ferme');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen backgroundColor={colors.background.secondary}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec bouton d'ajout */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing.lg 
        }}>
          <Text variant="h2" color={colors.text.primary}>
            Mes Fermes
          </Text>
          
          <Button
            title="Nouvelle ferme"
            variant="primary"
            leftIcon={<PlusIcon color={colors.text.inverse} />}
            onPress={handleCreateFarm}
          />
        </View>

        {/* Liste des fermes */}
        {farms.map((farm) => (
          <Card 
            key={farm.id}
            variant="elevated" 
            style={{ marginBottom: spacing.md }}
          >
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: spacing.sm 
            }}>
              <TouchableOpacity 
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => {
                  // TODO: Navigation vers détails de la ferme
                  console.log('Voir détails ferme', farm.id);
                }}
              >
                <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
                  {farm.name}
                </Text>
                <Text variant="body" color={colors.gray[600]} style={{ marginBottom: spacing.xs }}>
                  {farm.type}
                </Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => handleEditFarm(farm)}
                  style={{
                    padding: spacing.xs,
                    borderRadius: 8,
                    backgroundColor: colors.gray[100],
                  }}
                >
                  <EditIcon color={colors.gray[600]} size={16} />
                </TouchableOpacity>
                
                <View style={{
                  backgroundColor: colors.primary[100],
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: 12,
                }}>
                  <Text variant="bodySmall" color={colors.primary[700]} weight="semibold">
                    {farm.role}
                  </Text>
                </View>
              </View>
            </View>

              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                marginBottom: spacing.xs 
              }}>
                <MapPinIcon color={colors.gray[500]} style={{ marginRight: spacing.xs }} />
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {farm.location} • {farm.area}
                </Text>
              </View>

              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center' 
              }}>
                <UsersIcon color={colors.gray[500]} style={{ marginRight: spacing.xs }} />
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {farm.members} membre{farm.members > 1 ? 's' : ''}
                </Text>
              </View>
            </Card>
        ))}

        {/* Message si pas de fermes */}
        {farms.length === 0 && (
          <EmptyState
            icon={<BuildingOffice2Icon size={48} color={colors.gray[400]} />}
            title="Aucune ferme"
            description="Créez votre première ferme pour commencer à utiliser Thomas V2"
            action={{
              label: 'Créer ma première ferme',
              onPress: handleCreateFarm,
              variant: 'primary'
            }}
            style={{ marginTop: spacing.xl }}
              />
        )}
      </ScrollView>

      {/* Modale d'édition/création de ferme */}
      <FarmEditModal
        visible={isModalVisible}
        farm={selectedFarm}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedFarm(undefined);
        }}
        onSave={handleSaveFarm}
        onDelete={handleDeleteFarm}
      />
    </Screen>
  );
}
