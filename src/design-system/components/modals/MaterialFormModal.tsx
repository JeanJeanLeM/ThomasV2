import React, { useState, useEffect } from 'react';
import { View, Alert, Switch, Platform, StyleSheet } from 'react-native';
import { StandardFormModal, FormSection, RowFields, FieldWrapper } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { DropdownSelector } from '../DropdownSelector';
import { DatePicker } from '../DatePicker';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import type { MaterialData } from '../cards/MaterialCardStandard';
import type { DropdownItem } from '../DropdownSelector';

export type MaterialCategory =
  | 'tracteurs'
  | 'outils_tracteur'
  | 'outils_manuels'
  | 'materiel_marketing'
  | 'petit_equipement'
  | 'autre';

export interface MaterialFormValues {
  id: string | null;
  name: string;
  category: MaterialCategory;
  customCategory?: string;
  brand?: string;
  model?: string;
  cost?: string;
  purchaseDate?: Date;
  slugText: string;
}

const CATEGORY_OPTIONS: DropdownItem[] = [
  { id: 'tracteurs', label: 'Tracteurs', description: 'Tracteurs et enjambeurs' },
  { id: 'outils_tracteur', label: 'Outils de tracteur', description: 'Outils attelés' },
  { id: 'outils_manuels', label: 'Outils manuels', description: 'Outils à main' },
  { id: 'materiel_marketing', label: 'Outils de commercialisation', description: 'Bennes, caisses, etc.' },
  { id: 'petit_equipement', label: 'Petit équipement', description: 'Matériel léger' },
  { id: 'autre', label: 'Autre', description: 'Catégorie personnalisée' },
];

export interface MaterialFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (values: MaterialFormValues) => Promise<void>;
  initialValues?: MaterialData | null;
}

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  visible,
  onClose,
  onSave,
  initialValues,
}) => {
  const [formData, setFormData] = useState<MaterialFormValues>({
    id: initialValues?.id ?? null,
    name: initialValues?.name || '',
    category: (initialValues?.category as MaterialCategory) || 'tracteurs',
    customCategory: initialValues?.custom_category || '',
    brand: initialValues?.brand || '',
    model: initialValues?.model || '',
    cost: '',
    purchaseDate: undefined,
    slugText: (initialValues?.llm_keywords || []).join(', '),
  });

  const [selectedCategory, setSelectedCategory] = useState<DropdownItem[]>(
    initialValues?.category
      ? [CATEGORY_OPTIONS.find((opt) => opt.id === initialValues.category) || CATEGORY_OPTIONS[0]]
      : [CATEGORY_OPTIONS[0]]
  );

  const [useCustomCategory, setUseCustomCategory] = useState<boolean>(!!initialValues?.custom_category);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && initialValues) {
      setFormData({
        id: initialValues.id ?? null,
        name: initialValues.name || '',
        category: (initialValues.category as MaterialCategory) || 'tracteurs',
        customCategory: initialValues.custom_category || '',
        brand: initialValues.brand || '',
        model: initialValues.model || '',
        cost: '',
        purchaseDate: undefined,
        slugText: (initialValues.llm_keywords || []).join(', '),
      });
      setSelectedCategory(
        initialValues.category
          ? [CATEGORY_OPTIONS.find((opt) => opt.id === initialValues.category) || CATEGORY_OPTIONS[0]]
          : [CATEGORY_OPTIONS[0]]
      );
      setUseCustomCategory(!!initialValues.custom_category);
    } else if (visible && !initialValues) {
      setFormData({
        id: null,
        name: '',
        category: 'tracteurs',
        customCategory: '',
        brand: '',
        model: '',
        cost: '',
        purchaseDate: undefined,
        slugText: '',
      });
      setSelectedCategory([CATEGORY_OPTIONS[0]]);
      setUseCustomCategory(false);
    }
  }, [visible, initialValues]);

  const updateFormData = (field: keyof MaterialFormValues, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors['name'] = 'Le nom du matériel est obligatoire';
    if (useCustomCategory && !formData.customCategory?.trim()) newErrors['customCategory'] = 'Saisissez une catégorie personnalisée';
    if (!useCustomCategory && selectedCategory.length === 0) newErrors['category'] = 'Sélectionnez une catégorie';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Platform.OS === 'web' ? console.error('Erreur validation') : Alert.alert('Erreur', 'Veuillez corriger les erreurs');
      return;
    }
    setIsLoading(true);
    try {
      await onSave({
        ...formData,
        category: useCustomCategory ? 'autre' : (selectedCategory[0]?.id as MaterialCategory) || formData.category,
      });
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      Platform.OS === 'web' ? console.error(msg) : Alert.alert('Erreur', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  const isEditMode = !!initialValues;

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={isEditMode ? 'Modifier le matériel' : 'Ajouter un matériel'}
      primaryAction={{
        title: isEditMode ? 'Enregistrer' : 'Ajouter',
        onPress: handleSave,
        loading: isLoading,
        disabled: isLoading || !formData.name.trim(),
      }}
      secondaryAction={{ title: 'Annuler', onPress: onClose }}
      infoBanner={
        isEditMode
          ? { text: `Modification : ${initialValues?.name || 'Matériel'}`, type: 'info' }
          : { text: "Ajout d'un nouveau matériel à votre inventaire", type: 'success' }
      }
    >
      <FormSection title="Informations générales" description="Renseignez les informations de base du matériel">
        <EnhancedInput
          label="Nom du matériel"
          placeholder="ex: John Deere 6150R"
          value={formData.name}
          onChangeText={(v) => updateFormData('name', v)}
          required
          error={errors.name}
        />
        <View style={styles.categoryRow}>
          <Text variant="caption" style={styles.categoryLabel}>Catégorie personnalisée</Text>
          <Switch
            value={useCustomCategory}
            onValueChange={setUseCustomCategory}
            thumbColor={useCustomCategory ? colors.primary[600] : colors.gray[200]}
            trackColor={{ false: colors.gray[300], true: colors.primary[100] }}
          />
        </View>
        {!useCustomCategory ? (
          <DropdownSelector
            placeholder="Sélectionnez une catégorie"
            items={CATEGORY_OPTIONS}
            selectedItems={selectedCategory}
            onSelectionChange={(items) => {
              setSelectedCategory(items);
              if (items.length > 0) updateFormData('category', items[0].id as MaterialCategory);
            }}
          />
        ) : (
          <EnhancedInput
            label="Catégorie personnalisée"
            placeholder="ex: Tracteur maraîcher"
            value={formData.customCategory}
            onChangeText={(v) => updateFormData('customCategory', v)}
            required
            error={errors.customCategory}
          />
        )}
      </FormSection>
      <FormSection title="Détails techniques" description="Spécifications">
        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput label="Modèle" placeholder="ex: 6150R" value={formData.model} onChangeText={(v) => updateFormData('model', v)} />
          </FieldWrapper>
          <FieldWrapper flex={1}>
            <EnhancedInput label="Marque" placeholder="ex: John Deere" value={formData.brand} onChangeText={(v) => updateFormData('brand', v)} />
          </FieldWrapper>
        </RowFields>
      </FormSection>
      <FormSection title="Mots-clés pour l'IA" description="Aidez Thomas à reconnaître ce matériel">
        <EnhancedInput
          label="Mots-clés associés"
          placeholder="ex: tracteur, jd"
          value={formData.slugText}
          onChangeText={(v) => updateFormData('slugText', v)}
        />
      </FormSection>
    </StandardFormModal>
  );
};

const styles = StyleSheet.create({
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  categoryLabel: { color: colors.text.secondary },
});
