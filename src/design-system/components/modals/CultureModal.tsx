import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Text } from '../Text';
import { Button } from '../Button';
import { StandardFormModal, FormSection, RowFields } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { cultureService } from '../../../services/CultureService';
import type { Culture, CultureVariety, CultureType, CultureCategory } from '../../../types';

export interface CultureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (culture: Culture) => void;
  culture?: Culture | null;
  farmId?: number;
  title?: string;
}

export interface VarietyModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (variety: CultureVariety) => void;
  culture: Culture;
  variety?: CultureVariety | null;
  farmId?: number;
  title?: string;
}

export const CultureModal: React.FC<CultureModalProps> = ({
  visible,
  onClose,
  onSave,
  culture,
  farmId,
  title,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'legume_fruit' as CultureType,
    category: 'recolte' as CultureCategory,
    description: '',
    color: '#4ECDC4',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (culture) {
      setFormData({
        name: culture.name,
        type: culture.type,
        category: culture.category,
        description: culture.description || '',
        color: culture.color || '#4ECDC4',
      });
    } else {
      setFormData({
        name: '',
        type: 'legume_fruit',
        category: 'recolte',
        description: '',
        color: '#4ECDC4',
      });
    }
    setErrors({});
  }, [culture, visible]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.type) {
      newErrors.type = 'Le type est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const cultureData: Omit<Culture, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category,
        description: formData.description.trim() || undefined,
        color: formData.color,
        isCustom: true,
        farmId: farmId,
      };

      const savedCulture = await cultureService.createCulture(cultureData);
      onSave(savedCulture);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la culture');
    }
  };

  const cultureTypes = cultureService.getCultureTypes();
  const cultureCategories = cultureService.getCultureCategories();

  const predefinedColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#A29BFE', '#FD79A8'
  ];

  const getInfoBanner = () => {
    if (culture) {
      return {
        text: `Modification de la culture : ${culture.name}`,
        type: 'info' as const
      };
    }
    return undefined;
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={title || (culture ? 'Modifier la culture' : 'Ajouter une culture')}
      primaryAction={{
        title: culture ? "Modifier" : "Créer",
        onPress: handleSave,
      }}
      secondaryAction={{
        title: "Annuler",
        onPress: onClose,
      }}
      infoBanner={getInfoBanner()}
    >
      <FormSection 
        title="Informations de base"
        description="Nom et caractéristiques de la culture"
      >
        <EnhancedInput
          label="Nom de la culture"
          placeholder="ex: Tomate, Carotte, Basilic..."
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          error={errors.name}
          required
        />

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Type de culture
          </Text>
          <View style={styles.typeContainer}>
            {cultureTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  formData.type === type.value && {
                    backgroundColor: type.color,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
              >
                <Text
                  variant="caption"
                  color={
                    formData.type === type.value
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                  weight="medium"
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.type && (
            <Text variant="caption" color={colors.semantic.error}>
              {errors.type}
            </Text>
          )}
        </View>

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Catégorie
          </Text>
          <View style={styles.categoryContainer}>
            {cultureCategories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryChip,
                  formData.category === category.value && {
                    backgroundColor: colors.primary[600],
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, category: category.value }))}
              >
                <Text
                  variant="caption"
                  color={
                    formData.category === category.value
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                  weight="medium"
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Couleur d'affichage
          </Text>
          <View style={styles.colorContainer}>
            {predefinedColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorChip,
                  { backgroundColor: color },
                  formData.color === color && styles.colorChipSelected,
                ]}
                onPress={() => setFormData(prev => ({ ...prev, color }))}
              />
            ))}
          </View>
        </View>
      </FormSection>

      <FormSection 
        title="Description et aperçu"
        description="Informations complémentaires et prévisualisation"
      >
        <EnhancedInput
          label="Description (optionnel)"
          placeholder="Description de cette culture..."
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
        />

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Aperçu
          </Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.previewColorDot,
                  { backgroundColor: formData.color }
                ]}
              />
              <Text variant="body" weight="medium" color={colors.text.primary}>
                {formData.name || 'Nom de la culture'}
              </Text>
              <View style={[styles.previewTypeBadge, { backgroundColor: formData.color + '20' }]}>
                <Text variant="caption" color={formData.color} weight="medium">
                  {cultureTypes.find(t => t.value === formData.type)?.label}
                </Text>
              </View>
            </View>
            {formData.description && (
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
                {formData.description}
              </Text>
            )}
          </View>
        </View>
      </FormSection>
    </StandardFormModal>
  );
};

export const VarietyModal: React.FC<VarietyModalProps> = ({
  visible,
  onClose,
  onSave,
  culture,
  variety,
  farmId,
  title,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    typicalWeightKg: '',
    typicalVolumeL: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (variety) {
      setFormData({
        name: variety.name,
        description: variety.description || '',
        typicalWeightKg: variety.typicalWeightKg?.toString() || '',
        typicalVolumeL: variety.typicalVolumeL?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        typicalWeightKg: '',
        typicalVolumeL: '',
      });
    }
    setErrors({});
  }, [variety, visible]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la variété est requis';
    }

    const weight = parseFloat(formData.typicalWeightKg);
    if (formData.typicalWeightKg && (isNaN(weight) || weight <= 0)) {
      newErrors.typicalWeightKg = 'Le poids doit être un nombre positif';
    }

    const volume = parseFloat(formData.typicalVolumeL);
    if (formData.typicalVolumeL && (isNaN(volume) || volume <= 0)) {
      newErrors.typicalVolumeL = 'Le volume doit être un nombre positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const varietyData: Omit<CultureVariety, 'id' | 'createdAt' | 'updatedAt' | 'culture'> = {
        cultureId: culture.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        typicalWeightKg: formData.typicalWeightKg ? parseFloat(formData.typicalWeightKg) : undefined,
        typicalVolumeL: formData.typicalVolumeL ? parseFloat(formData.typicalVolumeL) : undefined,
        farmId: farmId,
      };

      const savedVariety = await cultureService.createVariety(varietyData);
      onSave(savedVariety);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la variété');
    }
  };

  const getVarietyInfoBanner = () => {
    if (variety) {
      return {
        text: `Modification de la variété : ${variety.name}`,
        type: 'info' as const
      };
    }
    return {
      text: `Nouvelle variété pour : ${culture.name}`,
      type: 'success' as const
    };
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={title || (variety ? 'Modifier la variété' : `Ajouter une variété de ${culture.name}`)}
      primaryAction={{
        title: variety ? "Modifier" : "Créer",
        onPress: handleSave,
      }}
      secondaryAction={{
        title: "Annuler",
        onPress: onClose,
      }}
      infoBanner={getVarietyInfoBanner()}
    >
      <FormSection 
        title="Informations de base"
        description="Détails de la variété"
      >
        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Culture parente
          </Text>
          <View style={styles.cultureInfo}>
            <View
              style={[
                styles.previewColorDot,
                { backgroundColor: culture.color || colors.primary[600] }
              ]}
            />
            <Text variant="body" color={colors.text.primary}>
              {culture.name}
            </Text>
          </View>
        </View>

        <EnhancedInput
          label="Nom de la variété"
          placeholder="ex: Tomate cerise, Carotte Nantaise..."
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          error={errors.name}
          required
        />
      </FormSection>

      <FormSection 
        title="Caractéristiques physiques"
        description="Poids et volume typiques (optionnel)"
      >
        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Poids typique (kg)"
              placeholder="ex: 0.080 pour 80g"
              value={formData.typicalWeightKg}
              onChangeText={(text) => setFormData(prev => ({ ...prev, typicalWeightKg: text }))}
              keyboardType="numeric"
              error={errors.typicalWeightKg}
            />
          </View>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Volume typique (L)"
              placeholder="ex: 0.070 pour 70mL"
              value={formData.typicalVolumeL}
              onChangeText={(text) => setFormData(prev => ({ ...prev, typicalVolumeL: text }))}
              keyboardType="numeric"
              error={errors.typicalVolumeL}
            />
          </View>
        </RowFields>
      </FormSection>

      <FormSection 
        title="Description"
        description="Informations complémentaires"
      >
        <EnhancedInput
          label="Description (optionnel)"
          placeholder="Caractéristiques de cette variété..."
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
        />
      </FormSection>
    </StandardFormModal>
  );
};

const styles = StyleSheet.create({
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipSelected: {
    borderColor: colors.gray[800],
  },
  previewSection: {
    marginTop: spacing.lg,
  },
  previewCard: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  cultureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
});

