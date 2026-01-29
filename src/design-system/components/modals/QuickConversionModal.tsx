import React, { useState, useEffect } from 'react';
import { View, Alert, Platform } from 'react-native';
import { StandardFormModal, FormSection, RowFields, FieldWrapper } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { DropdownSelector } from '../DropdownSelector';
import { UnifiedWhatSelector, type UnifiedWhatItem } from '../UnifiedWhatSelector';
import { Text } from '../Text';
import { Button } from '../Button';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface QuickConversionData {
  containerName: string;
  containerType?: string;
  cropName: string;
  whatType?: 'culture' | 'phytosanitary' | 'material' | 'custom';
  conversionValue: number;
  conversionUnit: string;
  description?: string;
}

export interface QuickConversionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (conversion: QuickConversionData) => Promise<void>;
  searchTerm?: string; // Terme recherché qui a déclenché l'ouverture
  farmId?: number;
  title?: string;
  editingConversion?: any; // Conversion existante à modifier
}

const COMMON_UNITS = [
  { id: 'kg', label: 'kg' },
  { id: 'g', label: 'g' },
  { id: 'litre', label: 'litre' },
  { id: 'L', label: 'L' },
  { id: 'unité', label: 'unité' },
  { id: 'pièce', label: 'pièce' },
  { id: 'botte', label: 'botte' },
];

const CONTAINER_SUGGESTIONS = {
  'caisse': { defaultValue: 10, preferredUnit: 'kg' },
  'caisses': { defaultValue: 10, preferredUnit: 'kg' },
  'panier': { defaultValue: 3, preferredUnit: 'kg' },
  'paniers': { defaultValue: 3, preferredUnit: 'kg' },
  'bac': { defaultValue: 15, preferredUnit: 'kg' },
  'bacs': { defaultValue: 15, preferredUnit: 'kg' },
  'brouette': { defaultValue: 50, preferredUnit: 'kg' },
  'brouettes': { defaultValue: 50, preferredUnit: 'kg' },
  'sac': { defaultValue: 25, preferredUnit: 'kg' },
  'sacs': { defaultValue: 25, preferredUnit: 'kg' },
};

// Matières non-agricoles pour les conversions
const MATERIAL_ITEMS = [
  { id: 'compost', label: 'Compost', type: 'material', category: 'matiere_organique' },
  { id: 'terreau', label: 'Terreau', type: 'material', category: 'substrat' },
  { id: 'engrais', label: 'Engrais', type: 'material', category: 'intrant' },
  { id: 'fumier', label: 'Fumier', type: 'material', category: 'matiere_organique' },
  { id: 'paille', label: 'Paille', type: 'material', category: 'matiere_organique' },
  { id: 'copeaux', label: 'Copeaux de bois', type: 'material', category: 'substrat' },
];

const CROP_SUGGESTIONS = {
  'tomates': 'Légumes fruits',
  'tomate': 'Légumes fruits', 
  'courgettes': 'Légumes fruits',
  'courgette': 'Légumes fruits',
  'radis': 'Légumes racines',
  'carottes': 'Légumes racines',
  'carotte': 'Légumes racines',
  'salade': 'Légumes feuilles',
  'salades': 'Légumes feuilles',
  'épinards': 'Légumes feuilles',
  'épinard': 'Légumes feuilles',
  'basilic': 'Aromates',
  'persil': 'Aromates',
  'compost': 'Matière organique',
  'terreau': 'Substrat',
  'engrais': 'Intrant',
  'fumier': 'Matière organique',
};

/**
 * Modal simplifiée pour créer rapidement une conversion
 * Optimisée pour l'ajout rapide depuis le dropdown
 */
export const QuickConversionModal: React.FC<QuickConversionModalProps> = ({
  visible,
  onClose,
  onSave,
  searchTerm,
  farmId,
  title,
  editingConversion,
}) => {
  const [formData, setFormData] = useState({
    containerName: '',
    cropName: '',
    whatType: undefined as 'culture' | 'phytosanitary' | 'material' | 'custom' | undefined,
    conversionValue: '',
    conversionUnit: 'kg',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWhat, setSelectedWhat] = useState<UnifiedWhatItem | null>(null);

  // Pré-remplissage intelligent basé sur le terme recherché OU la conversion existante
  useEffect(() => {
    if (editingConversion && visible) {
      // Mode édition : pré-remplir avec les données existantes
      const containerName = extractContainerFromName(editingConversion.name) || '';
      const cropName = editingConversion.fromUnit || '';
      
      setFormData({
        containerName,
        cropName,
        whatType: editingConversion.whatType || 'culture',
        conversionValue: editingConversion.factor?.toString() || '',
        conversionUnit: editingConversion.toUnit || 'kg',
        description: editingConversion.description || '',
      });

      // Créer un item pour le dropdown
      setSelectedWhat({
        id: `editing-${editingConversion.id}`,
        label: cropName,
        type: editingConversion.whatType || 'culture',
      });
    } else if (searchTerm && visible) {
      const term = searchTerm.toLowerCase().trim();
      
      // Essayer de détecter contenant + culture/matière dans le terme
      // Ex: "caisse de tomates", "brouette de compost"
      const match = term.match(/^(.+?)\s+de\s+(.+)$/);
      
      if (match) {
        const [, container, what] = match;
        const suggestion = CONTAINER_SUGGESTIONS[container as keyof typeof CONTAINER_SUGGESTIONS];
        
        setFormData({
          containerName: container,
          cropName: what,
          whatType: undefined, // Sera déterminé par UnifiedWhatSelector
          conversionValue: suggestion?.defaultValue.toString() || '1',
          conversionUnit: suggestion?.preferredUnit || 'kg',
          description: `Conversion pour ${container} de ${what}`,
        });

        // Créer un item temporaire pour le dropdown
        setSelectedWhat({
          id: `temp-${Date.now()}`,
          label: what,
          type: 'custom', // Sera mis à jour quand l'utilisateur sélectionne
        });
      } else {
        // Terme simple - essayer de deviner s'il s'agit d'un contenant
        const suggestion = CONTAINER_SUGGESTIONS[term as keyof typeof CONTAINER_SUGGESTIONS];
        
        if (suggestion) {
          setFormData({
            containerName: term,
            cropName: '',
            whatType: undefined,
            conversionValue: suggestion.defaultValue.toString(),
            conversionUnit: suggestion.preferredUnit,
            description: `Conversion pour ${term}`,
          });
          setSelectedWhat(null);
        } else {
          // Peut-être une culture ou matière
          setFormData({
            containerName: '',
            cropName: term,
            whatType: undefined,
            conversionValue: '1',
            conversionUnit: 'kg',
            description: `Conversion pour ${term}`,
          });
          setSelectedWhat({
            id: `temp-${Date.now()}`,
            label: term,
            type: 'custom',
          });
        }
      }
    } else {
      // Reset du formulaire
      setFormData({
        containerName: '',
        cropName: '',
        whatType: undefined,
        conversionValue: '',
        conversionUnit: 'kg',
        description: '',
      });
      setSelectedWhat(null);
    }
    setErrors({});
  }, [searchTerm, visible, editingConversion]);

  // Fonction utilitaire pour extraire le nom du contenant depuis le nom de la conversion
  const extractContainerFromName = (name: string): string => {
    // Essayer de détecter le pattern "Contenant de Culture"
    const match = name.match(/^(.+?)\s+de\s+.+$/);
    if (match) {
      return match[1];
    }
    
    // Essayer de détecter des patterns courants
    const patterns = [
      /^(caisse|caisses)\s/i,
      /^(panier|paniers)\s/i,
      /^(bac|bacs)\s/i,
      /^(brouette|brouettes)\s/i,
      /^(sac|sacs)\s/i,
    ];
    
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }
    
    return '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.containerName.trim()) {
      newErrors.containerName = 'Le nom du contenant est requis';
    }

    if (!formData.cropName.trim()) {
      newErrors.cropName = 'Le nom de la culture/matière est requis';
    }

    const value = parseFloat(formData.conversionValue);
    if (!formData.conversionValue.trim() || isNaN(value) || value <= 0) {
      newErrors.conversionValue = 'La valeur doit être un nombre positif';
    }

    if (!formData.conversionUnit.trim()) {
      newErrors.conversionUnit = 'L\'unité est requise';
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
      const conversionData: QuickConversionData = {
        containerName: formData.containerName.trim(),
        cropName: formData.cropName.trim(),
        whatType: formData.whatType,
        conversionValue: parseFloat(formData.conversionValue),
        conversionUnit: formData.conversionUnit.trim(),
        description: formData.description.trim() || undefined,
      };

      await onSave(conversionData);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur:', message);
      } else {
        Alert.alert('Erreur', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Nettoyer l'erreur si elle existe
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  // Suggestions intelligentes basées sur contenant + culture
  const getConversionSuggestion = (container: string, crop: string): { value: number; unit: string } | null => {
    const containerLower = container.toLowerCase();
    const cropLower = crop.toLowerCase();
    
    // Base de données des conversions typiques
    const conversionDatabase: Record<string, Record<string, { value: number; unit: string }>> = {
      'caisse': {
        'tomates': { value: 10, unit: 'kg' },
        'tomate': { value: 10, unit: 'kg' },
        'courgettes': { value: 8, unit: 'kg' },
        'courgette': { value: 8, unit: 'kg' },
        'radis': { value: 6, unit: 'kg' },
        'carottes': { value: 7, unit: 'kg' },
        'carotte': { value: 7, unit: 'kg' },
        'salade': { value: 3, unit: 'kg' },
        'salades': { value: 3, unit: 'kg' },
      },
      'panier': {
        'tomates': { value: 3, unit: 'kg' },
        'tomate': { value: 3, unit: 'kg' },
        'salade': { value: 1.5, unit: 'kg' },
        'salades': { value: 1.5, unit: 'kg' },
        'radis': { value: 2, unit: 'kg' },
        'aromates': { value: 0.5, unit: 'kg' },
      },
      'brouette': {
        'compost': { value: 50, unit: 'kg' },
        'fumier': { value: 45, unit: 'kg' },
        'terreau': { value: 40, unit: 'kg' },
        'paille': { value: 20, unit: 'kg' },
      },
      'sac': {
        'terreau': { value: 25, unit: 'kg' },
        'engrais': { value: 25, unit: 'kg' },
        'compost': { value: 20, unit: 'kg' },
        'fumier': { value: 30, unit: 'kg' },
      },
      'bac': {
        'compost': { value: 15, unit: 'kg' },
        'terreau': { value: 12, unit: 'kg' },
        'fumier': { value: 18, unit: 'kg' },
      }
    };

    const containerData = conversionDatabase[containerLower];
    if (containerData && containerData[cropLower]) {
      return containerData[cropLower];
    }

    // Suggestions par défaut basées sur le type de contenant
    const defaultSuggestions = CONTAINER_SUGGESTIONS[containerLower as keyof typeof CONTAINER_SUGGESTIONS];
    if (defaultSuggestions) {
      return {
        value: defaultSuggestions.defaultValue,
        unit: defaultSuggestions.preferredUnit
      };
    }

    return null;
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={title || 'Ajouter une conversion'}
      primaryAction={{
        title: editingConversion ? 'Modifier' : 'Créer',
        onPress: handleSave,
        loading: isLoading,
        disabled: isLoading || !formData.containerName.trim() || !formData.cropName.trim() || !formData.conversionValue.trim(),
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={editingConversion ? {
        text: `Modification de la conversion : ${editingConversion.name}`,
        type: 'info',
      } : searchTerm ? {
        text: `Création rapide pour "${searchTerm}"`,
        type: 'info',
      } : undefined}
    >
      {/* Section principale */}
      <FormSection 
        title="Conversion"
        description="Définissez la conversion entre votre contenant et l'unité universelle"
      >
        <EnhancedInput
          label="Nom du contenant"
          placeholder="ex: caisse, panier, brouette"
          value={formData.containerName}
          onChangeText={(value) => updateFormData('containerName', value)}
          required
          error={errors.containerName}
          hint="Le nom du contenant que vous utilisez"
        />

        <UnifiedWhatSelector
          label="Culture, produit ou matière"
          placeholder="Sélectionner une culture, produit phytosanitaire ou matière..."
          selectedItem={selectedWhat}
          onSelectionChange={(item) => {
            setSelectedWhat(item);
            if (item) {
              updateFormData('cropName', item.label);
              updateFormData('whatType', item.type);
              
              // Auto-suggestion de valeur basée sur la combinaison contenant + what
              if (formData.containerName) {
                const suggestion = getConversionSuggestion(formData.containerName, item.label);
                if (suggestion) {
                  updateFormData('conversionValue', suggestion.value.toString());
                  updateFormData('conversionUnit', suggestion.unit);
                }
              }
            } else {
              updateFormData('cropName', '');
              updateFormData('whatType', undefined);
            }
          }}
          farmId={farmId}
          searchable={true}
          onAddNew={(label) => {
            if (label?.trim()) {
              const newItem: UnifiedWhatItem = {
                id: `custom-${Date.now()}`,
                label: label.trim(),
                type: 'custom',
                category: 'Personnalisé',
              };
              setSelectedWhat(newItem);
              updateFormData('cropName', label.trim());
              updateFormData('whatType', 'custom');
            }
          }}
          required
          error={errors.cropName}
          hint={selectedWhat ? `Type: ${selectedWhat.type === 'culture' ? 'Culture' : selectedWhat.type === 'phytosanitary' ? 'Produit phytosanitaire' : selectedWhat.type === 'material' ? 'Matière' : 'Personnalisé'}` : "Choisissez ce que contient le contenant"}
        />

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'flex-start', // Aligner les labels en haut
          gap: spacing.md 
        }}>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Valeur"
              placeholder="ex: 10, 5, 25"
              value={formData.conversionValue}
              onChangeText={(value) => updateFormData('conversionValue', value)}
              keyboardType="numeric"
              required
              error={errors.conversionValue}
              style={{ marginBottom: 0 }}
            />
          </View>
          
          <View style={{ flex: 1 }}>
            <DropdownSelector
              label="Unité"
              placeholder="Sélectionner"
              items={COMMON_UNITS}
              selectedItems={formData.conversionUnit ? [{ id: formData.conversionUnit, label: formData.conversionUnit }] : []}
              onSelectionChange={(items) => updateFormData('conversionUnit', items[0]?.label || '')}
              inlineSearch={true}
              onAddNew={(label) => {
                if (label?.trim()) {
                  updateFormData('conversionUnit', label.trim());
                }
              }}
              required
              error={errors.conversionUnit}
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>
        
        {/* Aperçu de la conversion */}
        {formData.containerName && formData.cropName && formData.conversionValue && formData.conversionUnit && (
          <View style={{
            backgroundColor: colors.primary[50],
            padding: spacing.md,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.primary[200],
            marginTop: spacing.md,
          }}>
            <Text variant="body" style={{ 
              color: colors.text.primary,
              fontWeight: '600',
              marginBottom: spacing.xs,
            }}>
              1 {formData.containerName} de {formData.cropName} = {formData.conversionValue} {formData.conversionUnit}
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Cette conversion sera utilisée pour tous les messages mentionnant "{formData.containerName} de {formData.cropName}"
            </Text>
          </View>
        )}
      </FormSection>

      {/* Section description (optionnelle) */}
      <FormSection 
        title="Description (optionnel)"
        description="Ajoutez des détails si nécessaire"
      >
        <EnhancedInput
          label="Description"
          placeholder="ex: Caisse plastique standard, poids variable selon maturité..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={2}
        />
      </FormSection>
    </StandardFormModal>
  );
};