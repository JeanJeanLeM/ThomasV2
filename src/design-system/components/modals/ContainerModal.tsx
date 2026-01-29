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
import { containerService } from '../../../services/ContainerService';
import type { Container, ContainerType, ContainerMaterial, CultureCategory } from '../../../types';

export interface ContainerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (container: Container) => void;
  container?: Container | null;
  farmId?: number;
  defaultCategory?: CultureCategory;
  title?: string;
}

export const ContainerModal: React.FC<ContainerModalProps> = ({
  visible,
  onClose,
  onSave,
  container,
  farmId,
  defaultCategory = 'recolte',
  title,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: defaultCategory,
    type: 'caisse' as ContainerType,
    description: '',
    typicalCapacityKg: '',
    typicalCapacityL: '',
    material: 'plastique' as ContainerMaterial,
    dimensionsCm: '',
    color: '#4ECDC4',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (container) {
      setFormData({
        name: container.name,
        category: container.category,
        type: container.type,
        description: container.description || '',
        typicalCapacityKg: container.typicalCapacityKg?.toString() || '',
        typicalCapacityL: container.typicalCapacityL?.toString() || '',
        material: container.material || 'plastique',
        dimensionsCm: container.dimensionsCm || '',
        color: container.color || '#4ECDC4',
      });
    } else {
      setFormData({
        name: '',
        category: defaultCategory,
        type: 'caisse',
        description: '',
        typicalCapacityKg: '',
        typicalCapacityL: '',
        material: 'plastique',
        dimensionsCm: '',
        color: '#4ECDC4',
      });
    }
    setErrors({});
  }, [container, visible, defaultCategory]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    const capacityKg = parseFloat(formData.typicalCapacityKg);
    if (formData.typicalCapacityKg && (isNaN(capacityKg) || capacityKg <= 0)) {
      newErrors.typicalCapacityKg = 'La capacité doit être un nombre positif';
    }

    const capacityL = parseFloat(formData.typicalCapacityL);
    if (formData.typicalCapacityL && (isNaN(capacityL) || capacityL <= 0)) {
      newErrors.typicalCapacityL = 'La capacité doit être un nombre positif';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      // Générer les slugs automatiquement
      const slugs = containerService.generateSlugs(
        formData.name, 
        formData.type, 
        formData.material
      );

      const containerData: Omit<Container, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        category: formData.category,
        type: formData.type,
        description: formData.description.trim() || undefined,
        typicalCapacityKg: formData.typicalCapacityKg ? parseFloat(formData.typicalCapacityKg) : undefined,
        typicalCapacityL: formData.typicalCapacityL ? parseFloat(formData.typicalCapacityL) : undefined,
        material: formData.material,
        dimensionsCm: formData.dimensionsCm.trim() || undefined,
        color: formData.color,
        slugs,
        isCustom: true,
        farmId: farmId,
      };

      const savedContainer = await containerService.createContainer(containerData);
      onSave(savedContainer);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le contenant');
    }
  };

  const containerTypes = containerService.getContainerTypes();
  const containerMaterials = containerService.getContainerMaterials();

  const predefinedColors = [
    '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#A29BFE', '#FD79A8'
  ];

  const categories = [
    { value: 'recolte', label: 'Récolte', color: colors.semantic.success },
    { value: 'intrant', label: 'Intrant', color: colors.semantic.warning },
  ];

  const getInfoBanner = () => {
    if (container) {
      return {
        text: `Modification du contenant : ${container.name}`,
        type: 'info' as const
      };
    }
    return undefined;
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={title || (container ? 'Modifier le contenant' : 'Ajouter un contenant')}
      primaryAction={{
        title: container ? "Modifier" : "Créer",
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
        description="Nom et catégorie du contenant"
      >
        <EnhancedInput
          label="Nom du contenant"
          placeholder="ex: Caisse plastique 20L, Sac jute 50kg..."
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
            Catégorie d'usage
          </Text>
          <View style={styles.categoryContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryChip,
                  formData.category === category.value && {
                    backgroundColor: category.color,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, category: category.value as CultureCategory }))}
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
            Type de contenant
          </Text>
          <View style={styles.typeContainer}>
            {containerTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  formData.type === type.value && {
                    backgroundColor: colors.primary[600],
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
              >
                <Text style={{ fontSize: 16, marginRight: spacing.xs }}>
                  {type.icon}
                </Text>
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
        </View>

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Matériau
          </Text>
          <View style={styles.materialContainer}>
            {containerMaterials.map((material) => (
              <TouchableOpacity
                key={material.value}
                style={[
                  styles.materialChip,
                  formData.material === material.value && {
                    backgroundColor: colors.gray[600],
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, material: material.value }))}
              >
                <Text
                  variant="caption"
                  color={
                    formData.material === material.value
                      ? colors.text.inverse
                      : colors.text.secondary
                  }
                  weight="medium"
                >
                  {material.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </FormSection>

      <FormSection 
        title="Caractéristiques techniques"
        description="Capacités et couleur d'identification"
      >
        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Poids (kg)"
              placeholder="Poids (kg)"
              value={formData.typicalCapacityKg}
              onChangeText={(text) => setFormData(prev => ({ ...prev, typicalCapacityKg: text }))}
              keyboardType="numeric"
              error={errors.typicalCapacityKg}
            />
          </View>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Volume (L)"
              placeholder="Volume (L)"
              value={formData.typicalCapacityL}
              onChangeText={(text) => setFormData(prev => ({ ...prev, typicalCapacityL: text }))}
              keyboardType="numeric"
              error={errors.typicalCapacityL}
            />
          </View>
        </RowFields>

        <EnhancedInput
          label="Dimensions (optionnel)"
          placeholder="ex: 60x40x20 cm ou Ø30x25 cm"
          value={formData.dimensionsCm}
          onChangeText={(text) => setFormData(prev => ({ ...prev, dimensionsCm: text }))}
        />

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
          placeholder="Description de ce contenant..."
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
              <Text style={{ fontSize: 20, marginRight: spacing.sm }}>
                {containerTypes.find(t => t.value === formData.type)?.icon || '📦'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="medium" color={colors.text.primary}>
                  {formData.name || 'Nom du contenant'}
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  {containerTypes.find(t => t.value === formData.type)?.label}
                  {formData.material && ` • ${containerMaterials.find(m => m.value === formData.material)?.label}`}
                </Text>
              </View>
              <View style={[styles.previewCategoryBadge, { 
                backgroundColor: formData.category === 'recolte' ? colors.semantic.success : colors.semantic.warning 
              }]}>
                <Text variant="caption" color={colors.text.inverse} weight="medium">
                  {formData.category === 'recolte' ? 'Récolte' : 'Intrant'}
                </Text>
              </View>
            </View>
            {(formData.typicalCapacityKg || formData.typicalCapacityL) && (
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
                {formData.typicalCapacityKg && (
                  <Text variant="caption" color={colors.primary[600]} weight="medium">
                    {formData.typicalCapacityKg}kg
                  </Text>
                )}
                {formData.typicalCapacityL && (
                  <Text variant="caption" color={colors.primary[600]} weight="medium">
                    {formData.typicalCapacityL}L
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </FormSection>
    </StandardFormModal>
  );
};

const styles = StyleSheet.create({
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  materialContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  materialChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  capacityRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  capacityInput: {
    flex: 1,
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
  },
  previewCategoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
});

