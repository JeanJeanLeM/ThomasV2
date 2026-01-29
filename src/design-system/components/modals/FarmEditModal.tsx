import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { StandardFormModal, FormSection, RowFields } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { Button } from '../Button';
import { Text } from '../Text';
import { DropdownSelector } from '../DropdownSelector';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface FarmData {
  id?: number;
  name: string;
  description?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  region?: string;
  country?: string;
  total_area?: number;
  farm_type?: string;
}

export interface FarmEditModalProps {
  visible: boolean;
  farm?: FarmData;
  onClose: () => void;
  onSave: (farm: FarmData) => void;
  onDelete?: (farmId: number) => void;
}

const FARM_TYPES = [
  { label: 'Maraîchage', value: 'maraichage' },
  { label: 'Arboriculture', value: 'arboriculture' },
  { label: 'Grandes cultures', value: 'grandes_cultures' },
  { label: 'Mixte', value: 'mixte' },
  { label: 'Autre', value: 'autre' },
];

const REGIONS = [
  { label: 'Auvergne-Rhône-Alpes', value: 'Auvergne-Rhône-Alpes' },
  { label: 'Bourgogne-Franche-Comté', value: 'Bourgogne-Franche-Comté' },
  { label: 'Bretagne', value: 'Bretagne' },
  { label: 'Centre-Val de Loire', value: 'Centre-Val de Loire' },
  { label: 'Corse', value: 'Corse' },
  { label: 'Grand Est', value: 'Grand Est' },
  { label: 'Hauts-de-France', value: 'Hauts-de-France' },
  { label: 'Île-de-France', value: 'Île-de-France' },
  { label: 'Normandie', value: 'Normandie' },
  { label: 'Nouvelle-Aquitaine', value: 'Nouvelle-Aquitaine' },
  { label: 'Occitanie', value: 'Occitanie' },
  { label: 'Pays de la Loire', value: 'Pays de la Loire' },
  { label: "Provence-Alpes-Côte d'Azur", value: "Provence-Alpes-Côte d'Azur" },
];

export const FarmEditModal: React.FC<FarmEditModalProps> = ({
  visible,
  farm,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<FarmData>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser le formulaire avec les données de la ferme
  useEffect(() => {
    if (farm) {
      setFormData({
        ...farm,
      });
    } else {
      // Nouvelle ferme
      setFormData({
        name: '',
        description: '',
        address: '',
        postal_code: '',
        city: '',
        region: '',
        country: 'France',
        total_area: undefined,
        farm_type: undefined,
      });
    }
  }, [farm]);

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      Alert.alert('Erreur', 'Le nom de la ferme est obligatoire');
      return;
    }

    if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      Alert.alert('Erreur', 'Le nom de la ferme doit contenir entre 2 et 100 caractères');
      return;
    }

    if (formData.total_area && formData.total_area <= 0) {
      Alert.alert('Erreur', 'La superficie doit être supérieure à 0');
      return;
    }

    setIsLoading(true);
    try {
      const farmToSave: FarmData = {
        id: farm?.id,
        name: formData.name!.trim(),
        description: formData.description?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        postal_code: formData.postal_code?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        region: formData.region || undefined,
        country: formData.country || 'France',
        total_area: formData.total_area || undefined,
        farm_type: formData.farm_type || undefined,
      };

      await onSave(farmToSave);
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la ferme');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!farm?.id) return;

    Alert.alert(
      'Supprimer la ferme',
      'Êtes-vous sûr de vouloir supprimer cette ferme ? Cette action supprimera également toutes les données associées (parcelles, matériels, tâches). Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete?.(farm.id!);
            onClose();
          },
        },
      ]
    );
  };

  const updateFormData = (field: keyof FarmData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getInfoBanner = () => {
    if (farm) {
      return {
        text: `Modification de la ferme : ${farm.name}`,
        type: 'info' as const
      };
    }
    return undefined;
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={farm ? 'Modifier les informations de la ferme' : 'Nouvelle ferme'}
      primaryAction={{
        title: 'Sauvegarder',
        onPress: handleSave,
        loading: isLoading,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={getInfoBanner()}
    >
      <FormSection 
        title="Informations générales"
        description="Détails de base de votre exploitation"
      >
        <EnhancedInput
          label="Nom de la ferme"
          placeholder="Ex: Ferme Bio des Collines, GAEC du Soleil..."
          value={formData.name || ''}
          onChangeText={(value) => updateFormData('name', value)}
          required
          hint="Entre 2 et 100 caractères"
        />

        <EnhancedInput
          label="Description"
          placeholder="Décrivez votre ferme, vos pratiques, vos spécialités..."
          value={formData.description || ''}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={3}
        />

        <DropdownSelector
          label="Type d'exploitation"
          placeholder="Sélectionnez le type d'exploitation"
          options={FARM_TYPES}
          value={formData.farm_type}
          onSelect={(value) => updateFormData('farm_type', value)}
        />

        <EnhancedInput
          label="Superficie totale (hectares)"
          placeholder="Ex: 5.2"
          value={formData.total_area?.toString() || ''}
          onChangeText={(value) => {
            const numValue = parseFloat(value);
            updateFormData('total_area', isNaN(numValue) ? undefined : numValue);
          }}
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
          value={formData.address || ''}
          onChangeText={(value) => updateFormData('address', value)}
        />

        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Code postal"
              placeholder="Ex: 69420"
              value={formData.postal_code || ''}
              onChangeText={(value) => updateFormData('postal_code', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 2 }}>
            <EnhancedInput
              label="Ville"
              placeholder="Ex: Condrieu"
              value={formData.city || ''}
              onChangeText={(value) => updateFormData('city', value)}
            />
          </View>
        </RowFields>

        <DropdownSelector
          label="Région"
          placeholder="Sélectionnez votre région"
          options={REGIONS}
          value={formData.region}
          onSelect={(value) => updateFormData('region', value)}
        />

        <EnhancedInput
          label="Pays"
          placeholder="France"
          value={formData.country || 'France'}
          onChangeText={(value) => updateFormData('country', value)}
        />

        {/* Bouton de suppression pour les fermes existantes */}
        {farm && onDelete && (
          <View style={{ 
            marginTop: spacing.lg, 
            paddingTop: spacing.lg, 
            borderTopWidth: 1, 
            borderTopColor: colors.border.primary 
          }}>
            <Button
              title="Supprimer cette ferme"
              variant="danger"
              onPress={handleDelete}
            />
          </View>
        )}
      </FormSection>
    </StandardFormModal>
  );
};




