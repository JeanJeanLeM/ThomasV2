import React, { useState, useEffect } from 'react';
import { View, Alert, Platform } from 'react-native';
import { Text, Button, DropdownSelector, PhotoPicker } from '../design-system/components';
import { FormScreen } from '../design-system/components/FormScreen';
import { FormSection, RowFields } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useFarm } from '../contexts/FarmContext';
import { FarmService } from '../services/FarmService';

const FARM_TYPES = [
  { id: 'maraichage', label: 'Maraîchage' },
  { id: 'arboriculture', label: 'Arboriculture' },
  { id: 'grandes_cultures', label: 'Grandes cultures' },
  { id: 'mixte', label: 'Mixte' },
  { id: 'autre', label: 'Autre' },
];

const REGIONS = [
  { id: 'auvergne-rhone-alpes', label: 'Auvergne-Rhône-Alpes' },
  { id: 'bourgogne-franche-comte', label: 'Bourgogne-Franche-Comté' },
  { id: 'bretagne', label: 'Bretagne' },
  { id: 'centre-val-de-loire', label: 'Centre-Val de Loire' },
  { id: 'corse', label: 'Corse' },
  { id: 'grand-est', label: 'Grand Est' },
  { id: 'hauts-de-france', label: 'Hauts-de-France' },
  { id: 'ile-de-france', label: 'Île-de-France' },
  { id: 'normandie', label: 'Normandie' },
  { id: 'nouvelle-aquitaine', label: 'Nouvelle-Aquitaine' },
  { id: 'occitanie', label: 'Occitanie' },
  { id: 'pays-de-la-loire', label: 'Pays de la Loire' },
  { id: 'provence-alpes-cote-azur', label: "Provence-Alpes-Côte d'Azur" },
];

interface FarmEditScreenProps {
  navigation?: {
    goBack?: () => void;
  };
  /** ID de la ferme à modifier. Si null ou undefined, mode création (nouvelle ferme) */
  farmId?: number | null;
}

export default function FarmEditScreen({ navigation, farmId }: FarmEditScreenProps) {
  const { activeFarm, updateFarm, deleteFarm, createFarm } = useFarm();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFarmData, setIsLoadingFarmData] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    postal_code: '',
    city: '',
    region: '',
    country: 'France',
    total_area: '',
    farm_type: '',
    photo_url: '',
  });

  // Déterminer le mode : modification si farmId est fourni, création sinon
  const isEditMode = farmId !== undefined && farmId !== null;
  const targetFarmId = isEditMode ? farmId : null;

  // Initialiser le formulaire avec les données de la ferme à modifier
  useEffect(() => {
    const loadFarmData = async () => {
      if (isEditMode && targetFarmId) {
        setIsLoadingFarmData(true);
        try {
          // Charger les données complètes de la ferme spécifiée
          const farmDetails = await FarmService.getFarmById(targetFarmId);
          if (farmDetails) {
            setFormData({
              name: farmDetails.name || '',
              description: farmDetails.description || '',
              address: farmDetails.address || '',
              postal_code: farmDetails.postal_code || '',
              city: farmDetails.city || '',
              region: farmDetails.region || '',
              country: farmDetails.country || 'France',
              total_area: farmDetails.total_area?.toString() || '',
              farm_type: farmDetails.farm_type || '',
              photo_url: farmDetails.photo_url || '',
            });
          }
        } catch (error) {
          console.error('Erreur chargement données ferme:', error);
          // Réinitialiser le formulaire en cas d'erreur
          setFormData({
            name: '',
            description: '',
            address: '',
            postal_code: '',
            city: '',
            region: '',
            country: 'France',
            total_area: '',
            farm_type: '',
            photo_url: '',
          });
        } finally {
          setIsLoadingFarmData(false);
        }
      } else {
        // Mode création - réinitialiser le formulaire
        setFormData({
          name: '',
          description: '',
          address: '',
          postal_code: '',
          city: '',
          region: '',
          country: 'France',
          total_area: '',
          farm_type: '',
          photo_url: '',
        });
      }
    };
    
    loadFarmData();
  }, [isEditMode, targetFarmId]);

  const handleSave = async () => {
    console.log('🚀 [DEBUG] handleSave - Début de la sauvegarde');
    console.log('🚀 [DEBUG] formData.name:', formData.name);
    console.log('🚀 [DEBUG] activeFarm:', activeFarm);
    
    if (!formData.name.trim()) {
      console.log('❌ [DEBUG] Nom de ferme vide');
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur: Le nom de la ferme est obligatoire');
      } else {
        Alert.alert('Erreur', 'Le nom de la ferme est obligatoire');
      }
      return;
    }

    if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      console.log('❌ [DEBUG] Nom de ferme invalide, longueur:', formData.name.trim().length);
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur: Le nom de la ferme doit contenir entre 2 et 100 caractères');
      } else {
        Alert.alert('Erreur', 'Le nom de la ferme doit contenir entre 2 et 100 caractères');
      }
      return;
    }

    console.log('🚀 [DEBUG] setIsLoading(true)');
    setIsLoading(true);
    
    try {
      const farmData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        postal_code: formData.postal_code?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        region: formData.region || undefined,
        country: formData.country || 'France',
        total_area: formData.total_area ? parseFloat(formData.total_area) : undefined,
        farm_type: formData.farm_type || undefined,
        photo_url: formData.photo_url?.trim() || undefined,
      };

      console.log('🚀 [DEBUG] farmData préparé:', farmData);
      console.log('🚀 [DEBUG] isEditMode:', isEditMode, 'targetFarmId:', targetFarmId);

      if (isEditMode && targetFarmId) {
        console.log('🚀 [DEBUG] Mode modification - appel updateFarm avec ID:', targetFarmId);
        await updateFarm(targetFarmId, farmData);
        console.log('✅ Ferme mise à jour avec succès:', farmData.name);
        
        // Sur web, utiliser une notification console et fermer automatiquement
        if (Platform.OS === 'web') {
          console.log('🎉 Les informations de la ferme ont été mises à jour');
          navigation?.goBack?.();
        } else {
          Alert.alert('Succès', 'Les informations de la ferme ont été mises à jour', [
            { text: 'OK', onPress: () => navigation?.goBack?.() }
          ]);
        }
      } else {
        console.log('🚀 [DEBUG] Mode création - appel createFarm');
        console.log('🚀 [DEBUG] Avant createFarm, farmData:', JSON.stringify(farmData, null, 2));
        
        const result = await createFarm(farmData);
        console.log('✅ [DEBUG] createFarm terminé, résultat:', result);
        console.log('✅ Ferme créée avec succès:', farmData.name);
        
        // Sur web, utiliser une notification console et fermer automatiquement
        if (Platform.OS === 'web') {
          console.log('🎉 La ferme a été créée avec succès');
          navigation?.goBack?.();
        } else {
          Alert.alert('Succès', 'La ferme a été créée avec succès', [
            { text: 'OK', onPress: () => navigation?.goBack?.() }
          ]);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      console.error('❌ [DEBUG] Erreur dans handleSave:', error);
      console.error('❌ [DEBUG] Error message:', errorMessage);
      console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('❌ [DEBUG] Error type:', typeof error);
      console.error('❌ [DEBUG] Error constructor:', error?.constructor?.name);
      
        // Sur web, utiliser console.error, sur mobile utiliser Alert
        if (Platform.OS === 'web') {
          console.error('🚨 Erreur lors de la sauvegarde:', errorMessage);
        } else {
          Alert.alert('Erreur', errorMessage);
        }
    } finally {
      console.log('🚀 [DEBUG] setIsLoading(false) - Fin de handleSave');
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !targetFarmId) return;

    // Sur web, utiliser confirm(), sur mobile utiliser Alert
    if (Platform.OS === 'web') {
      const confirmed = (global as any).confirm(
        'Êtes-vous sûr de vouloir supprimer cette ferme ? Cette action supprimera également toutes les données associées (parcelles, matériels, tâches). Cette action est irréversible.'
      );
      
      if (confirmed) {
        setIsLoading(true);
        try {
          await deleteFarm(targetFarmId);
          console.log('✅ Ferme supprimée avec succès');
          console.log('🎉 La ferme a été supprimée');
          navigation?.goBack?.();
        } catch (error) {
          console.error('❌ Erreur lors de la suppression:', error);
          console.error('🚨 Impossible de supprimer la ferme');
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      Alert.alert(
        'Supprimer la ferme',
        'Êtes-vous sûr de vouloir supprimer cette ferme ? Cette action supprimera également toutes les données associées (parcelles, matériels, tâches). Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);
              try {
                await deleteFarm(targetFarmId);
                Alert.alert('Succès', 'La ferme a été supprimée', [
                  { text: 'OK', onPress: () => navigation?.goBack?.() }
                ]);
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de supprimer la ferme');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getInfoBanner = () => {
    if (isEditMode) {
      return {
        text: `Modification de la ferme`,
        type: 'info' as const
      };
    }
    return {
      text: "Créez votre ferme pour commencer à utiliser Thomas",
      type: 'success' as const
    };
  };

  return (
    <FormScreen
      title={isEditMode ? 'Modifier la ferme' : 'Nouvelle ferme'}
      onBack={() => navigation?.goBack?.()}
      primaryAction={{
        title: isEditMode ? 'Sauvegarder' : 'Créer la ferme',
        onPress: handleSave,
        loading: isLoading || isLoadingFarmData,
        disabled: !formData.name?.trim() || isLoadingFarmData,
      }}
      secondaryAction={isEditMode ? {
        title: 'Supprimer',
        onPress: handleDelete,
      } : undefined}
      infoBanner={getInfoBanner()}
    >

      <FormSection 
        title="Informations générales"
        description="Détails de base de votre exploitation"
      >
        <EnhancedInput
          label="Nom de la ferme"
          placeholder="Ex: Ferme Bio des Collines"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          required
          hint="Entre 2 et 100 caractères"
        />

        <PhotoPicker
          label="Photo de la ferme"
          value={formData.photo_url}
          onImageSelected={(uri) => updateFormData('photo_url', uri)}
          placeholder="Ajouter une photo de votre ferme"
          hint="Choisissez une photo depuis votre galerie ou prenez-en une nouvelle"
        />

        <EnhancedInput
          label="Description"
          placeholder="Décrivez votre ferme, vos pratiques, vos spécialités..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={3}
        />

        <DropdownSelector
          label="Type d'exploitation"
          placeholder="Sélectionnez le type d'exploitation"
          items={FARM_TYPES}
          selectedItems={FARM_TYPES.filter(type => type.id === formData.farm_type)}
          onSelectionChange={(items) => updateFormData('farm_type', items[0]?.id || '')}
        />

        <EnhancedInput
          label="Superficie totale (hectares)"
          placeholder="Ex: 5.2"
          value={formData.total_area}
          onChangeText={(value) => updateFormData('total_area', value)}
          keyboardType="numeric"
          hint="Superficie en hectares (optionnel)"
        />
      </FormSection>

      <FormSection 
        title="Localisation"
        description="Adresse et situation géographique"
      >
        <EnhancedInput
          label="Adresse"
          placeholder="Ex: 123 Route des Vignes"
          value={formData.address}
          onChangeText={(value) => updateFormData('address', value)}
        />

        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Code postal"
              placeholder="Ex: 69420"
              value={formData.postal_code}
              onChangeText={(value) => updateFormData('postal_code', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2 }}>
            <EnhancedInput
              label="Ville"
              placeholder="Ex: Condrieu"
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
            />
          </View>
        </RowFields>

        <DropdownSelector
          label="Région"
          placeholder="Sélectionnez votre région"
          items={REGIONS}
          selectedItems={REGIONS.filter(region => region.id === formData.region)}
          onSelectionChange={(items) => updateFormData('region', items[0]?.id || '')}
        />

        <EnhancedInput
          label="Pays"
          placeholder="France"
          value={formData.country}
          onChangeText={(value) => updateFormData('country', value)}
        />
      </FormSection>
    </FormScreen>
  );
}
