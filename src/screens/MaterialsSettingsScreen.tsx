import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, Platform } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useFarm } from '../contexts/FarmContext';
import { 
  WrenchScrewdriverIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  CogIcon,
  SearchIcon
} from '../design-system/icons';
import { ActivityIndicator } from 'react-native';
import { Text, Button, MaterialCardStandard, Input, Modal, DropdownSelector, StandardFormModal, FormSection, RowFields, FieldWrapper, EnhancedInput, DatePicker } from '../design-system/components';
import type { MaterialData } from '../design-system/components/cards/MaterialCardStandard';
import type { DropdownItem } from '../design-system/components/DropdownSelector';
import { MaterialService, type MaterialFromDB } from '../services/MaterialService';

interface MaterialsSettingsScreenProps {
  onTitleChange?: (title: string | null) => void;
  onBack?: () => void;
}

type MaterialCategory =
  | 'tracteurs'
  | 'outils_tracteur'
  | 'outils_manuels'
  | 'materiel_marketing'
  | 'petit_equipement'
  | 'autre';

interface MaterialFormValues {
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

export default function MaterialsSettingsScreen({ onTitleChange, onBack }: MaterialsSettingsScreenProps) {
  // Contexte ferme
  const { activeFarm } = useFarm();
  const [materials, setMaterials] = useState<MaterialData[]>([]);
  
  // Farm selector hook

  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialData | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    material: MaterialData | null;
    isActive: boolean;
  }>({ visible: false, material: null, isActive: false });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Charger les matériels depuis la base de données
  const loadMaterials = async () => {
    console.log('📥 Loading materials from database...');
    setIsLoading(true);
    
    try {
      if (!activeFarm) {
        console.log('⚠️ No active farm, skipping materials load');
        return;
      }

        const dbMaterials = await MaterialService.getMaterialsByFarm(activeFarm.farm_id);
      console.log('📦 Materials loaded from DB:', dbMaterials.length, 'items');
      
      // Convertir le format DB vers le format UI
      const uiMaterials: MaterialData[] = dbMaterials.map((dbMaterial) => {
        const mapCategoryToType = (category: string): MaterialData['type'] => {
          switch (category) {
            case 'tracteurs':
              return 'tractor';
            case 'outils_tracteur':
            case 'outils_manuels':
            case 'petit_equipement':
              return 'implement';
            case 'materiel_marketing':
              return 'tool';
            case 'autre':
            default:
              return 'vehicle';
          }
        };

        return {
          id: dbMaterial.id.toString(),
          name: dbMaterial.name,
          brand: dbMaterial.brand || '',
          model: dbMaterial.model || '',
          type: mapCategoryToType(dbMaterial.category),
          category: dbMaterial.category as any,
          custom_category: dbMaterial.custom_category,
          llm_keywords: dbMaterial.llm_keywords || [],
          is_active: dbMaterial.is_active,
        };
      });
      
      console.log('🔄 Converted to UI format:', uiMaterials.length, 'items');
      setMaterials(uiMaterials);
      
    } catch (error) {
      console.error('💥 Failed to load materials:', error);
      // En cas d'erreur, laisser la liste vide
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les matériels au montage du composant et quand la ferme active change
  useEffect(() => {
    if (activeFarm) {
      loadMaterials();
    }
  }, [activeFarm?.farm_id]);

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setShowForm(true);
  };

  const handleEditMaterial = (material: MaterialData) => {
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleToggleActiveMaterial = (material: MaterialData) => {
    const isActive = material.is_active !== false;
    console.log('🔧 handleToggleActiveMaterial called:', {
      materialId: material.id,
      materialName: material.name,
      currentIsActive: material.is_active,
      calculatedIsActive: isActive,
    });

    if (Platform.OS === 'web') {
      // Utiliser notre modal personnalisé pour le web
      setConfirmModal({
        visible: true,
        material,
        isActive,
      });
    } else {
      // Utiliser Alert natif pour mobile
      Alert.alert(
        isActive ? 'Désactiver le matériel' : 'Réactiver le matériel',
        isActive
          ? 'Ce matériel sera marqué comme inactif mais conservé dans votre historique.'
          : 'Ce matériel sera de nouveau disponible comme actif.',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => console.log('❌ Soft delete cancelled') },
          {
            text: isActive ? 'Désactiver' : 'Réactiver',
            style: 'destructive',
            onPress: () => confirmToggleActive(material, isActive),
          },
        ]
      );
    }
  };

  const confirmToggleActive = async (material: MaterialData, isActive: boolean) => {
    console.log('✅ Soft delete confirmed, updating material:', {
      materialId: material.id,
      newIsActive: !isActive,
    });
    
    try {
      // Appel Supabase pour mettre à jour le statut en base
      const dbMaterial = await MaterialService.toggleMaterialActive(
        parseInt(material.id), 
        !isActive
      );
      
      console.log('💾 Material status updated in database:', dbMaterial);
      
      setMaterials((prev) => {
        const updated = prev.map((m) =>
          m.id === material.id ? { ...m, is_active: !isActive } : m
        );
        console.log('📋 Materials state updated:', updated.map(m => ({ id: m.id, name: m.name, is_active: m.is_active })));
        return updated;
      });
      
    } catch (error) {
      console.error('💥 Failed to update material status in database:', error);
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du statut. Vérifiez votre connexion.');
    }
    
    setConfirmModal({ visible: false, material: null, isActive: false });
  };

  const cancelToggleActive = () => {
    console.log('❌ Soft delete cancelled');
    setConfirmModal({ visible: false, material: null, isActive: false });
  };

  const getTypeIcon = (type: MaterialData['type']) => {
    switch (type) {
      case 'tractor':
        return <TruckIcon color={colors.primary[600]} size={24} />;
      case 'implement':
        return <CogIcon color={colors.semantic.warning} size={24} />;
      case 'tool':
        return <WrenchScrewdriverIcon color={colors.semantic.success} size={24} />;
      case 'vehicle':
        return <TruckIcon color={colors.gray[600]} size={24} />;
      default:
        return <WrenchScrewdriverIcon color={colors.gray[600]} size={24} />;
    }
  };

  const getTypeLabel = (type: MaterialData['type']) => {
    switch (type) {
      case 'tractor':
        return 'Tracteur';
      case 'implement':
        return 'Outil';
      case 'tool':
        return 'Outillage';
      case 'vehicle':
        return 'Véhicule';
      default:
        return 'Autre';
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const isActive = material.is_active !== false;

    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'inactive' && isActive) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const haystack = [
      material.name,
      material.brand,
      material.model,
      material.custom_category || '',
      material.category || '',
      ...(material.llm_keywords || []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });

  const materialsByType = filteredMaterials.reduce((acc, material) => {
    if (!acc[material.type]) {
      acc[material.type] = [];
    }
    acc[material.type].push(material);
    return acc;
  }, {} as Record<MaterialData['type'], MaterialData[]>);

  // Statistiques basées sur les données (remplaçables facilement par les valeurs réelles de la DB)
  const totalMaterials = materials.filter((m) => m.is_active !== false).length;
  const tractorCount = materials.filter(
    (m) => m.type === 'tractor' && m.is_active !== false
  ).length;
  const implementCount = materials.filter(
    (m) => m.type === 'implement' && m.is_active !== false
  ).length;

  const handleFormSubmit = async (values: MaterialFormValues) => {
    console.log('🚀 handleFormSubmit called with values:', values);
    
    const parsedSlugs = values.slugText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log('📝 Parsed slugs:', parsedSlugs);

    const mapCategoryToType = (category: MaterialCategory): MaterialData['type'] => {
      switch (category) {
        case 'tracteurs':
          return 'tractor';
        case 'outils_tracteur':
        case 'outils_manuels':
        case 'petit_equipement':
          return 'implement';
        case 'materiel_marketing':
          return 'tool';
        case 'autre':
        default:
          return 'vehicle';
      }
    };

    // Données pour la base de données (sans les champs UI-only)
    const dbMaterialData = {
      name: values.name,
      brand: values.brand || '',
      model: values.model || '',
      category: values.category,
      custom_category: values.customCategory ?? null,
      llm_keywords: parsedSlugs,
      is_active: true,
    };

    // Données pour l'UI (incluant type calculé)
    const uiType = mapCategoryToType(values.category);

    console.log('📦 Material data prepared (DB):', dbMaterialData);
    console.log('📦 UI type:', uiType);

    if (values.id) {
      // Edition
      console.log('✏️ Editing existing material:', values.id);
      
      try {
        // Appel Supabase pour mettre à jour en base
        const dbMaterial = await MaterialService.updateMaterial({
          id: parseInt(values.id),
          ...dbMaterialData,
        });
        
        console.log('💾 Material updated in database:', dbMaterial);
        
        // Convertir le format DB vers le format UI
        const uiMaterial: Partial<MaterialData> = {
          name: dbMaterial.name,
          brand: dbMaterial.brand || '',
          model: dbMaterial.model || '',
          type: uiType,
          category: dbMaterial.category as any,
          custom_category: dbMaterial.custom_category,
          llm_keywords: dbMaterial.llm_keywords || [],
          is_active: dbMaterial.is_active,
        };
        
        setMaterials((prev) => {
          const updated = prev.map((material) =>
            material.id === values.id
              ? { ...material, ...uiMaterial }
              : material
          );
          console.log('📋 Local state updated (edit):', updated.find(m => m.id === values.id));
          return updated;
        });
        
      } catch (error) {
        console.error('💥 Failed to update material in database:', error);
        Alert.alert('Erreur', 'Erreur lors de la mise à jour du matériel. Vérifiez votre connexion.');
        return; // Ne pas fermer le formulaire en cas d'erreur
      }
    } else {
      // Création
      console.log('➕ Creating new material');
      
      try {
        // Test de connexion d'abord
        console.log('🔗 Testing connection before creating material...');
        const isConnected = await MaterialService.testConnection();
        console.log('🔗 Connection status:', isConnected);
        
        if (!isConnected) {
          throw new Error('Connexion à la base de données impossible');
        }

        // Appel Supabase pour créer en base
        console.log('🚀 Connection OK, creating material...');
        if (!activeFarm) {
          throw new Error('Aucune ferme active sélectionnée');
        }

        const dbMaterial = await MaterialService.createMaterial({
          ...dbMaterialData,
          farm_id: activeFarm.farm_id,
        });
        
        console.log('💾 Material saved to database:', dbMaterial);
        
        // Convertir le format DB vers le format UI
        const uiMaterial: MaterialData = {
          id: dbMaterial.id.toString(),
          name: dbMaterial.name,
          brand: dbMaterial.brand || '',
          model: dbMaterial.model || '',
          type: uiType,
          category: dbMaterial.category as any,
          custom_category: dbMaterial.custom_category,
          llm_keywords: dbMaterial.llm_keywords || [],
          is_active: dbMaterial.is_active,
        };
        
        console.log('🔄 Converted to UI format:', uiMaterial);
        
        setMaterials((prev) => {
          const updated = [...prev, uiMaterial];
          console.log('📋 Local state updated (create). Total materials:', updated.length);
          return updated;
        });
        
      } catch (error) {
        console.error('💥 Failed to save material to database:', error);
        Alert.alert('Erreur', 'Erreur lors de la sauvegarde du matériel. Vérifiez votre connexion.');
        return; // Ne pas fermer le formulaire en cas d'erreur
      }
    }

    console.log('✅ Form submission completed, closing form');
    setShowForm(false);
    setEditingMaterial(null);
  };

  useEffect(() => {
    if (onTitleChange) {
      if (showForm) {
        onTitleChange(editingMaterial ? 'Modifier un matériel' : 'Ajouter un matériel');
      } else {
        onTitleChange(null);
      }
    }
  }, [showForm, editingMaterial, onTitleChange]);

  // Le formulaire est maintenant une modal, pas un écran de remplacement

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text variant="h2" style={styles.title}>
                Gestion du matériel
              </Text>
              <Text variant="body" style={styles.subtitle}>
                {materials.length} équipement{materials.length > 1 ? 's' : ''} configuré{materials.length > 1 ? 's' : ''}
              </Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddMaterial}>
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <WrenchScrewdriverIcon color={colors.semantic.success} size={22} />
              <Text variant="h3" style={styles.summaryTitle}>
                Aperçu de vos données
              </Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{totalMaterials}</Text>
                <Text style={styles.summaryLabel}>Matériels</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{tractorCount}</Text>
                <Text style={styles.summaryLabel}>Tracteurs</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{implementCount}</Text>
                <Text style={styles.summaryLabel}>Outils attelés</Text>
              </View>
            </View>
          </View>

          {/* Recherche et filtre actif/inactif */}
          <View style={{ marginBottom: spacing.lg }}>
            <Input
              placeholder="Rechercher un matériel (nom, marque, modèle...)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<SearchIcon color={colors.gray[400]} size={20} />}
              style={{ marginBottom: spacing.md }}
            />
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {[
                { key: 'all', label: 'Tous', count: materials.length, color: colors.gray[600] },
                { key: 'active', label: 'Actifs', count: materials.filter(m => m.is_active !== false).length, color: colors.semantic.success },
                { key: 'inactive', label: 'Inactifs', count: materials.filter(m => m.is_active === false).length, color: colors.gray[500] },
              ].map((filter) => {
                const isSelected = statusFilter === filter.key;
                
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      isSelected && {
                        backgroundColor: filter.color,
                        borderColor: filter.color,
                      },
                    ]}
                    onPress={() => setStatusFilter(filter.key as any)}
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
                        style={[
                          styles.countBadge,
                          isSelected && styles.countBadgeSelected,
                        ]}
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

          {/* Section des matériels avec loading */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
              <Text variant="body" style={styles.loadingText}>
                Chargement des matériels...
              </Text>
            </View>
          ) : (
            <>
              {Object.entries(materialsByType).map(([type, typeMaterials]) => (
                <View key={type} style={styles.typeSection}>
                  <Text variant="h3" style={styles.typeTitle}>
                    {getTypeLabel(type as MaterialData['type'])} ({typeMaterials.length})
                  </Text>
                  
                  <View style={styles.materialsList}>
                    {typeMaterials.map((material) => (
                      <MaterialCardStandard
                        key={material.id}
                        material={material}
                        onPress={handleEditMaterial}
                        onDelete={(material) => {
                          console.log('🗑️ Delete button pressed on card:', material.name);
                          handleToggleActiveMaterial(material);
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {materials.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <WrenchScrewdriverIcon color={colors.gray[400]} size={64} />
                  <Text variant="h3" style={styles.emptyTitle}>
                    Aucun matériel configuré
                  </Text>
                  <Text variant="body" style={styles.emptySubtitle}>
                    Ajoutez votre premier équipement pour commencer
                  </Text>
                  <Button 
                    title="Ajouter du matériel"
                    onPress={handleAddMaterial}
                    style={styles.emptyButton}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal de confirmation pour le web */}
      <Modal
        visible={confirmModal.visible}
        onClose={cancelToggleActive}
        title={confirmModal.isActive ? 'Désactiver le matériel' : 'Réactiver le matériel'}
        size="sm"
        primaryAction={{
          title: confirmModal.isActive ? 'Désactiver' : 'Réactiver',
          onPress: () => confirmModal.material && confirmToggleActive(confirmModal.material, confirmModal.isActive),
          variant: confirmModal.isActive ? 'danger' : 'primary',
        }}
        secondaryAction={{
          title: 'Annuler',
          onPress: cancelToggleActive,
        }}
      >
        <View style={{ padding: spacing.md }}>
          <Text variant="body" color={colors.text.secondary}>
            {confirmModal.isActive
              ? 'Ce matériel sera marqué comme inactif mais conservé dans votre historique.'
              : 'Ce matériel sera de nouveau disponible comme actif.'}
          </Text>
          
          {confirmModal.material && (
            <View style={{
              backgroundColor: colors.gray[50],
              padding: spacing.md,
              borderRadius: 8,
              marginTop: spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: confirmModal.isActive ? colors.semantic.error : colors.semantic.success,
            }}>
              <Text variant="h4" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
                {confirmModal.material.name}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {confirmModal.material.brand} {confirmModal.material.model}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal de formulaire de matériel */}
      {showForm && (
        <MaterialFormScreen
          initialValues={editingMaterial}
          onCancel={() => {
            setShowForm(false);
            setEditingMaterial(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

    </>
  );
}

interface MaterialFormScreenProps {
  initialValues: MaterialData | null;
  onCancel: () => void;
  onSubmit: (values: MaterialFormValues) => void;
}

const CATEGORY_OPTIONS: DropdownItem[] = [
  { id: 'tracteurs', label: 'Tracteurs', description: 'Tracteurs et enjambeurs' },
  { id: 'outils_tracteur', label: 'Outils de tracteur', description: 'Outils attelés' },
  { id: 'outils_manuels', label: 'Outils manuels', description: 'Outils à main' },
  { id: 'materiel_marketing', label: 'Outils de commercialisation', description: 'Bennes, caisses, etc.' },
  { id: 'petit_equipement', label: 'Petit équipement', description: 'Matériel léger' },
  { id: 'autre', label: 'Autre', description: 'Catégorie personnalisée' },
];

const MaterialFormScreen: React.FC<MaterialFormScreenProps> = ({
  initialValues,
  onCancel,
  onSubmit,
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
      ? [CATEGORY_OPTIONS.find(opt => opt.id === initialValues.category) || CATEGORY_OPTIONS[0]]
      : [CATEGORY_OPTIONS[0]]
  );

  const [useCustomCategory, setUseCustomCategory] = useState<boolean>(
    !!initialValues?.custom_category
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = (field: keyof MaterialFormValues, value: any) => {
    // Optimisation : ne mettre à jour que si la valeur change réellement
    setFormData((prev) => {
      if (prev[field] === value) return prev;
      return { ...prev, [field]: value };
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors['name'] = 'Le nom du matériel est obligatoire';
    }

    if (useCustomCategory && !formData.customCategory?.trim()) {
      newErrors['customCategory'] = 'Saisissez une catégorie personnalisée';
    }

    if (!useCustomCategory && selectedCategory.length === 0) {
      newErrors['category'] = 'Sélectionnez une catégorie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur de validation');
      } else {
        Alert.alert('Erreur', 'Veuillez corriger les erreurs');
      }
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        category: useCustomCategory ? 'autre' : (selectedCategory[0]?.id as MaterialCategory || formData.category),
      });
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

  const isEditMode = !!initialValues;

  return (
    <StandardFormModal
      visible={true}
      onClose={onCancel}
      title={isEditMode ? 'Modifier le matériel' : 'Ajouter un matériel'}
      primaryAction={{
        title: isEditMode ? 'Enregistrer' : 'Ajouter',
        onPress: handleSave,
        loading: isLoading,
        disabled: isLoading || !formData.name.trim(),
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onCancel,
      }}
      infoBanner={isEditMode ? {
        text: `Modification : ${initialValues?.name || 'Matériel'}`,
        type: 'info',
      } : {
        text: 'Ajout d\'un nouveau matériel à votre inventaire',
        type: 'success',
      }}
    >
      
      {/* Section Informations générales */}
      <FormSection 
        title="Informations générales"
        description="Renseignez les informations de base du matériel"
      >
        <EnhancedInput
          label="Nom du matériel"
          placeholder="ex: John Deere 6150R"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          required
          error={errors.name}
          hint="Nom descriptif et reconnaissable"
        />

        <View>
          <View style={styles.categoryHeader}>
            <Text variant="body" style={styles.categoryLabel}>
              Catégorie
              <Text variant="body" style={{ color: colors.semantic.error }}>
                {' '}*
              </Text>
            </Text>
            <View style={styles.categoryToggle}>
              <Text
                variant="caption"
                style={{ color: colors.text.secondary, marginRight: spacing.xs }}
              >
                Catégorie personnalisée
              </Text>
              <Switch
                value={useCustomCategory}
                onValueChange={setUseCustomCategory}
                thumbColor={useCustomCategory ? colors.primary[600] : colors.gray[200]}
                trackColor={{ false: colors.gray[300], true: colors.primary[100] }}
              />
            </View>
          </View>

          {!useCustomCategory ? (
            <DropdownSelector
              placeholder="Sélectionnez une catégorie"
              items={CATEGORY_OPTIONS}
              selectedItems={selectedCategory}
              onSelectionChange={(items) => {
                setSelectedCategory(items);
                if (items.length > 0) {
                  updateFormData('category', items[0].id as MaterialCategory);
                }
              }}
              inlineSearch={true}
              searchable={true}
              onAddNew={(label) => {
                if (label) {
                  const newCategory: DropdownItem = {
                    id: 'autre',
                    label: 'Autre',
                    description: 'Catégorie personnalisée'
                  };
                  setSelectedCategory([newCategory]);
                  updateFormData('category', 'autre');
                  updateFormData('customCategory', label);
                  setUseCustomCategory(true);
                }
              }}
              addNewLabel="Créer une catégorie personnalisée"
              error={errors.category}
              hint="Choisissez le type de matériel approprié"
            />
          ) : (
            <EnhancedInput
              label="Catégorie personnalisée"
              placeholder="ex: Tracteur maraîcher léger"
              value={formData.customCategory}
              onChangeText={(value) => updateFormData('customCategory', value)}
              required
              error={errors.customCategory}
              hint="Décrivez le type de matériel spécifique"
            />
          )}
        </View>
      </FormSection>

      {/* Section Détails techniques */}
      <FormSection 
        title="Détails techniques"
        description="Spécifications et informations techniques"
      >
        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Modèle"
              placeholder="ex: 6150R, XY 12 14"
              value={formData.model}
              onChangeText={(value) => updateFormData('model', value)}
              hint="Référence du modèle"
            />
          </FieldWrapper>
          
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Marque"
              placeholder="ex: John Deere"
              value={formData.brand}
              onChangeText={(value) => updateFormData('brand', value)}
              hint="Fabricant du matériel"
            />
          </FieldWrapper>
        </RowFields>

        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Coût (€)"
              placeholder="ex: 75000"
              value={formData.cost}
              onChangeText={(value) => updateFormData('cost', value)}
              keyboardType="numeric"
              hint="Prix d'achat"
            />
          </FieldWrapper>
          
          <FieldWrapper flex={1}>
            <DatePicker
              label="Date d'achat"
              value={formData.purchaseDate}
              onChange={(date) => updateFormData('purchaseDate', date)}
              placeholder="Sélectionner une date"
              hint="Date d'acquisition"
            />
          </FieldWrapper>
        </RowFields>
      </FormSection>

      {/* Section Mots-clés IA */}
      <FormSection 
        title="Mots-clés pour l'IA"
        description="Aidez Thomas à reconnaître ce matériel"
      >
        <EnhancedInput
          label="Mots-clés associés"
          placeholder="ex: tracteur rouge, gros tracteur, tracteur à outils"
          value={formData.slugText}
          onChangeText={(value) => updateFormData('slugText', value)}
          multiline
          numberOfLines={3}
          hint="Séparez les synonymes par des virgules. Ces mots-clés aideront l'IA à faire le lien avec ce matériel."
        />
      </FormSection>
    </StandardFormModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.secondary,
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.text.primary,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.semantic.success,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSection: {
    marginBottom: spacing.xl,
  },
  typeTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  materialsList: {
    gap: spacing.md,
  },
  materialCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  materialBrand: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  materialYear: {
    color: colors.text.secondary,
  },
  materialActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyTitle: {
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
  // Styles pour le formulaire (maintenant géré par StandardFormModal)
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    color: colors.text.secondary,
  },
  categoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Styles sticky supprimés - gérés par StandardFormModal
  // Styles pour les filtres (inspirés de ConversionFilters)
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.xs,
  },
  countBadge: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeSelected: {
    backgroundColor: colors.background.secondary,
  },
  // Styles pour le loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
