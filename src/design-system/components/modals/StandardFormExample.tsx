import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { StandardFormModal, FormSection, RowFields, FieldWrapper } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { DropdownSelector } from '../DropdownSelector';
import { FarmSelector } from '../FarmSelector';

/**
 * 🎯 EXEMPLE DE FORMULAIRE STANDARD
 * 
 * ✅ DÉMONTRE L'UTILISATION CORRECTE :
 * - StandardFormModal pour le layout fullscreen
 * - EnhancedInput pour les champs de saisie
 * - FormSection pour organiser les sections
 * - RowFields pour les champs côte à côte
 * - Background gris + champs blancs
 * 
 * 🚨 UTILISER CE MODÈLE pour tous les nouveaux formulaires
 */

export interface StandardFormExampleProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

const EXAMPLE_OPTIONS = [
  { id: 'option1', label: 'Option 1' },
  { id: 'option2', label: 'Option 2' },
  { id: 'option3', label: 'Option 3' },
];

export const StandardFormExample: React.FC<StandardFormExampleProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    postalCode: initialData?.postalCode || '',
    city: initialData?.city || '',
    selectedOption: initialData?.selectedOption || '',
    description: initialData?.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Nettoyer l'erreur si elle existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur de validation');
      } else {
        Alert.alert('Erreur', 'Veuillez corriger les erreurs');
      }
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      
      if (Platform.OS === 'web') {
        console.log('✅ Données sauvegardées avec succès');
      } else {
        Alert.alert('Succès', 'Données sauvegardées avec succès');
      }
      
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur lors de la sauvegarde:', message);
      } else {
        Alert.alert('Erreur', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title="Exemple de Formulaire Standard"
      primaryAction={{
        title: initialData ? 'Modifier' : 'Créer',
        onPress: handleSave,
        loading: isLoading,
        disabled: isLoading || !formData.name.trim() || !formData.email.trim(),
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={{
        text: initialData 
          ? `Modification : ${initialData.name || 'Élément'}`
          : 'Création d\'un nouvel élément avec le formulaire standard',
        type: initialData ? 'info' : 'success',
      }}
    >
      
      {/* Section Informations principales */}
      <FormSection 
        title="Informations principales"
        description="Renseignez les informations de base"
      >
        <EnhancedInput
          label="Nom"
          placeholder="Saisissez le nom"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          required
          error={errors.name}
          hint="Entre 2 et 100 caractères"
        />

        <EnhancedInput
          label="Email"
          placeholder="exemple@domaine.com"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          required
          error={errors.email}
        />

        <EnhancedInput
          label="Téléphone"
          placeholder="+33 6 12 34 56 78"
          value={formData.phone}
          onChangeText={(value) => updateFormData('phone', value)}
          keyboardType="phone-pad"
          hint="Optionnel"
        />

        <DropdownSelector
          label="Option"
          placeholder="Sélectionnez une option"
          items={EXAMPLE_OPTIONS}
          selectedItems={EXAMPLE_OPTIONS.filter(opt => opt.id === formData.selectedOption)}
          onSelectionChange={(items) => updateFormData('selectedOption', items[0]?.id || '')}
          hint="Choisissez parmi les options disponibles"
        />
      </FormSection>

      {/* Section Adresse avec champs en ligne */}
      <FormSection 
        title="Adresse"
        description="Informations de localisation"
      >
        <EnhancedInput
          label="Adresse"
          placeholder="123 Rue de la Paix"
          value={formData.address}
          onChangeText={(value) => updateFormData('address', value)}
        />

        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Code postal"
              placeholder="75001"
              value={formData.postalCode}
              onChangeText={(value) => updateFormData('postalCode', value)}
              keyboardType="numeric"
            />
          </FieldWrapper>
          
          <FieldWrapper flex={2}>
            <EnhancedInput
              label="Ville"
              placeholder="Paris"
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
            />
          </FieldWrapper>
        </RowFields>
      </FormSection>

      {/* Section Description */}
      <FormSection 
        title="Description"
        description="Informations complémentaires"
      >
        <EnhancedInput
          label="Description"
          placeholder="Décrivez en détail..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={4}
          hint="Description optionnelle (maximum 500 caractères)"
        />
      </FormSection>

      {/* Section avec FarmSelector pour démonstration */}
      <FormSection 
        title="Sélection de ferme"
        description="Exemple d'utilisation du FarmSelector"
      >
        <FarmSelector 
          onFarmListPress={() => {
            if (Platform.OS === 'web') {
              console.log('🏠 Ouverture de la liste des fermes');
            } else {
              Alert.alert('Info', 'Ouverture de la liste des fermes');
            }
          }}
        />
      </FormSection>
    </StandardFormModal>
  );
};











