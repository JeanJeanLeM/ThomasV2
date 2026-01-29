import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Platform } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  ArrowsRightLeftIcon, 
  PlusIcon,
  SearchIcon,
  CalculatorIcon
} from '../design-system/icons';
import { 
  Text, 
  Button, 
  ConversionCardMinimal, 
  ConversionFilters,
  ConfirmationModal
} from '../design-system/components';
import { QuickConversionModal, type QuickConversionData } from '../design-system/components/modals/QuickConversionModal';
import { ConversionService, type UserConversion } from '../services/ConversionService';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import type { ConversionData } from '../design-system/components/cards/ConversionCardMinimal';

export default function ConversionsSettingsScreen() {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const [conversions, setConversions] = useState<ConversionData[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ConversionData['category'] | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [editingConversion, setEditingConversion] = useState<ConversionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // État pour la modal de confirmation (compatible web)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    conversion: ConversionData | null;
    isActive: boolean;
  }>({
    visible: false,
    conversion: null,
    isActive: false,
  });

  // Récupérer les IDs depuis les contextes
  const userId = user?.id;
  const farmId = activeFarm?.farm_id;

  // Charger les conversions depuis la base de données
  useEffect(() => {
    loadConversions();
  }, [farmId]);

  const loadConversions = async () => {
    if (!farmId) {
      console.log('⚠️ Farm ID manquant, skip du chargement des conversions');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Chargement des conversions...', { farmId });
      
      const userConversions = await ConversionService.getActiveConversions(farmId);
      
      // Convertir UserConversion vers ConversionData pour l'interface
      const convertedConversions: ConversionData[] = userConversions.map(conv => ({
        id: conv.id,
        name: `${conv.container_name} de ${conv.crop_name}`,
        category: categorizeConversion(conv.crop_name),
        fromUnit: conv.crop_name,
        toUnit: conv.conversion_unit,
        factor: conv.conversion_value,
        description: conv.description || '',
        isActive: conv.is_active,
        containerType: conv.container_type,
        whatType: undefined, // Pas stocké en DB pour l'instant, peut être déduit si nécessaire
      }));

      setConversions(convertedConversions);
      console.log(`✅ ${convertedConversions.length} conversions chargées`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des conversions:', error);
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur de chargement');
      } else {
        Alert.alert('Erreur', 'Impossible de charger les conversions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction utilitaire pour catégoriser une conversion
  const categorizeConversion = (cropName: string): ConversionData['category'] => {
    const inputMaterials = ['compost', 'terreau', 'engrais', 'fumier', 'paille'];
    const isInputMaterial = inputMaterials.some(material => 
      cropName.toLowerCase().includes(material)
    );
    return isInputMaterial ? 'intrant' : 'recolte';
  };

  const handleAddConversion = () => {
    setEditingConversion(null);
    setQuickModalVisible(true);
  };

  const handleEditConversion = (conversion: ConversionData) => {
    setEditingConversion(conversion);
    setQuickModalVisible(true);
  };


  const handleQuickSave = async (quickData: QuickConversionData) => {
    if (!userId || !farmId) {
      const message = 'Impossible de sauvegarder: utilisateur ou ferme non identifié';
      if (Platform.OS === 'web') {
        console.error('🚨', message);
      } else {
        Alert.alert('Erreur', message);
      }
      return;
    }

    try {
      if (editingConversion) {
        // Modification d'une conversion existante
        console.log('🔄 Modification de la conversion:', editingConversion.id);
        
        const success = await ConversionService.updateConversion(editingConversion.id, {
          container_name: quickData.containerName,
          crop_name: quickData.cropName,
          conversion_value: quickData.conversionValue,
          conversion_unit: quickData.conversionUnit,
          description: quickData.description,
        });

        if (success) {
          // Mettre à jour l'état local
          const updatedConversion: ConversionData = {
            ...editingConversion,
            name: `${quickData.containerName} de ${quickData.cropName}`,
            fromUnit: quickData.cropName,
            toUnit: quickData.conversionUnit,
            factor: quickData.conversionValue,
            description: quickData.description,
            category: categorizeConversion(quickData.cropName),
            whatType: quickData.whatType,
          };
          
          setConversions(prev => prev.map(conv => 
            conv.id === editingConversion.id ? updatedConversion : conv
          ));
          
          console.log('✅ Conversion modifiée avec succès');
        } else {
          throw new Error('Échec de la modification');
        }
      } else {
        // Création d'une nouvelle conversion
        console.log('➕ Création d\'une nouvelle conversion');
        
        const result = await ConversionService.createConversion(
          userId!,
          farmId!,
          quickData.containerName,
          quickData.cropName,
          quickData.conversionValue,
          quickData.conversionUnit,
          [], // aliases vides pour l'instant
          quickData.description
        );

        if (result.isDuplicate && result.existingId) {
          // Conversion déjà existante - proposer de modifier
          // Récupérer la conversion existante directement
          const existing = await ConversionService.findExistingConversion(
            farmId!,
            quickData.containerName,
            quickData.cropName
          );
          
          if (existing) {
            const message = `Une conversion "${quickData.containerName} de ${quickData.cropName}" existe déjà. Voulez-vous la modifier ?`;
            
            if (Platform.OS === 'web') {
              const shouldEdit = window.confirm(message);
              if (shouldEdit) {
                // Convertir en ConversionData et ouvrir en mode édition
                const existingConversionData: ConversionData = {
                  id: existing.id,
                  name: `${existing.container_name} de ${existing.crop_name}`,
                  category: categorizeConversion(existing.crop_name),
                  fromUnit: existing.crop_name,
                  toUnit: existing.conversion_unit,
                  factor: existing.conversion_value,
                  description: existing.description || '',
                  isActive: existing.is_active,
                  containerType: existing.container_type,
                  whatType: undefined,
                };
                
                // Recharger les conversions pour avoir la liste à jour
                await loadConversions();
                
                // Fermer la modal actuelle et rouvrir en mode édition
                setQuickModalVisible(false);
                setTimeout(() => {
                  setEditingConversion(existingConversionData);
                  setQuickModalVisible(true);
                }, 100);
                return; // Ne pas fermer la modal maintenant
              } else {
                // L'utilisateur a annulé, on ferme la modal
                setQuickModalVisible(false);
                setEditingConversion(null);
                return;
              }
            } else {
              Alert.alert(
                'Conversion existante',
                message,
                [
                  { 
                    text: 'Annuler', 
                    style: 'cancel',
                    onPress: () => {
                      setQuickModalVisible(false);
                      setEditingConversion(null);
                    }
                  },
                  {
                    text: 'Modifier',
                    onPress: async () => {
                      // Convertir en ConversionData et ouvrir en mode édition
                      const existingConversionData: ConversionData = {
                        id: existing.id,
                        name: `${existing.container_name} de ${existing.crop_name}`,
                        category: categorizeConversion(existing.crop_name),
                        fromUnit: existing.crop_name,
                        toUnit: existing.conversion_unit,
                        factor: existing.conversion_value,
                        description: existing.description || '',
                        isActive: existing.is_active,
                        containerType: existing.container_type,
                        whatType: undefined,
                      };
                      
                      // Recharger les conversions pour avoir la liste à jour
                      await loadConversions();
                      
                      // Fermer la modal actuelle et rouvrir en mode édition
                      setQuickModalVisible(false);
                      setTimeout(() => {
                        setEditingConversion(existingConversionData);
                        setQuickModalVisible(true);
                      }, 100);
                    }
                  }
                ]
              );
              return; // Ne pas fermer la modal maintenant
            }
          } else {
            throw new Error(`Une conversion "${quickData.containerName} de ${quickData.cropName}" existe déjà pour cette ferme.`);
          }
        } else if (result.id) {
          // Ajouter à l'état local
          const newConversion: ConversionData = {
            id: result.id,
            name: `${quickData.containerName} de ${quickData.cropName}`,
            category: categorizeConversion(quickData.cropName),
            fromUnit: quickData.cropName,
            toUnit: quickData.conversionUnit,
            factor: quickData.conversionValue,
            description: quickData.description,
            isActive: true,
            whatType: quickData.whatType,
          };
          
          setConversions(prev => [...prev, newConversion]);
          console.log('✅ Conversion créée avec succès:', result.id);
        } else {
          throw new Error('Échec de la création de la conversion');
        }
      }
      
      setQuickModalVisible(false);
      setEditingConversion(null);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur de sauvegarde:', message);
        // Afficher aussi une alerte sur web pour que l'utilisateur voie l'erreur
        window.alert(`Erreur: ${message}`);
      } else {
        Alert.alert('Erreur', message);
      }
    }
  };


  // ✅ COMPATIBLE WEB : Fonction de basculement avec détection de plateforme
  const handleToggleActive = (conversion: ConversionData) => {
    const isActive = conversion.isActive !== false;
    
    // ✅ CONFORME AU GUIDE : Logs pour le debugging
    console.log('🔧 handleToggleActive called:', {
      itemId: conversion.id,
      itemName: conversion.name,
      currentIsActive: conversion.isActive,
      calculatedIsActive: isActive,
    });

    if (Platform.OS === 'web') {
      // ✅ WEB : Modal personnalisé
      setConfirmModal({
        visible: true,
        conversion,
        isActive,
      });
    } else {
      // ✅ MOBILE : Alert natif
      Alert.alert(
        isActive ? 'Désactiver la conversion' : 'Réactiver la conversion',
        isActive
          ? 'Cette conversion sera marquée comme inactive mais conservée dans votre historique.'
          : 'Cette conversion sera de nouveau disponible comme active.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: isActive ? 'Désactiver' : 'Réactiver',
            style: 'destructive',
            onPress: () => confirmToggleActive(conversion, isActive),
          },
        ]
      );
    }
  };

  // ✅ CONFORME AU GUIDE : Fonction de confirmation séparée
  const confirmToggleActive = async (conversion: ConversionData, isActive: boolean) => {
    try {
      console.log('✅ Soft delete confirmed, updating conversion:', {
        itemId: conversion.id,
        newIsActive: !isActive,
      });
      
      // Sauvegarder en base de données
      const success = await ConversionService.updateConversion(conversion.id, {
        is_active: !isActive
      });

      if (success) {
        // Mettre à jour l'état local
        setConversions((prev) => {
          const updated = prev.map((conv) =>
            conv.id === conversion.id ? { ...conv, isActive: !isActive } : conv
          );
          console.log('📋 Conversions state updated:', updated.map(c => ({ 
            id: c.id, 
            name: c.name, 
            isActive: c.isActive 
          })));
          return updated;
        });

        console.log('✅ Statut de conversion mis à jour en base');
      } else {
        throw new Error('Échec de la mise à jour du statut');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
      
      if (Platform.OS === 'web') {
        console.error('🚨 Erreur de mise à jour:', message);
      } else {
        Alert.alert('Erreur', message);
      }
    } finally {
      // Fermer la modal si elle était ouverte
      setConfirmModal({ visible: false, conversion: null, isActive: false });
    }
  };

  // ✅ WEB : Fonction pour annuler la modal
  const cancelToggleActive = () => {
    setConfirmModal({ visible: false, conversion: null, isActive: false });
  };


  // Filtrage et recherche
  const filteredConversions = useMemo(() => {
    let filtered = conversions;

    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(conv => conv.category === selectedCategory);
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(conv => conv.isActive !== false);
      } else {
        filtered = filtered.filter(conv => conv.isActive === false);
      }
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(conv => 
        conv.name.toLowerCase().includes(query) ||
        conv.fromUnit.toLowerCase().includes(query) ||
        conv.toUnit.toLowerCase().includes(query) ||
        (conv.description && conv.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [conversions, selectedCategory, selectedStatus, searchQuery]);


  // ✅ CONFORME AU GUIDE : Statistiques basées sur les éléments actifs uniquement
  const totalActiveConversions = conversions.filter(c => c.isActive !== false).length;
  const activeRecolteConversions = conversions.filter(c => 
    c.category === 'recolte' && c.isActive !== false
  ).length;
  const activeIntrantConversions = conversions.filter(c => 
    c.category === 'intrant' && c.isActive !== false
  ).length;
  const activeCustomConversions = conversions.filter(c => 
    c.category === 'custom' && c.isActive !== false
  ).length;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text variant="h2" style={styles.title}>
                Tables de conversion
              </Text>
              <Text variant="body" style={styles.subtitle}>
                {conversions.length} règle{conversions.length > 1 ? 's' : ''} de conversion
              </Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddConversion}>
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <ArrowsRightLeftIcon color={colors.semantic.success} size={22} />
              <Text variant="h3" style={styles.summaryTitle}>
                Conversions Actives
              </Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{totalActiveConversions}</Text>
                <Text style={styles.summaryLabel}>Actifs</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{activeRecolteConversions}</Text>
                <Text style={styles.summaryLabel}>Récoltes</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{activeIntrantConversions}</Text>
                <Text style={styles.summaryLabel}>Intrants</Text>
              </View>
            </View>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <SearchIcon color={colors.gray[500]} size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher les conversions..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.gray[500]}
              />
            </View>
          </View>

          {/* Filtres */}
          <ConversionFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            conversions={conversions}
          />

          {/* Liste des conversions */}
          <View style={styles.conversionsSection}>
            {filteredConversions.length > 0 ? (
              <View style={styles.conversionsList}>
                {filteredConversions.map((conversion) => (
                  <ConversionCardMinimal
                    key={conversion.id}
                    conversion={conversion}
                    onEdit={handleEditConversion}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptySearchState}>
                <SearchIcon color={colors.gray[400]} size={48} />
                <Text variant="h3" style={styles.emptyTitle}>
                  Aucune conversion trouvée
                </Text>
                <Text variant="body" style={styles.emptySubtitle}>
                  {searchQuery ? 
                    `Aucun résultat pour "${searchQuery}"` :
                    'Aucune conversion dans cette catégorie'
                  }
                </Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <Text variant="body" style={{ color: colors.gray[600] }}>
                Chargement des conversions...
              </Text>
            </View>
          ) : conversions.length === 0 && (
            <View style={styles.emptyState}>
              <CalculatorIcon color={colors.gray[400]} size={64} />
              <Text variant="h3" style={styles.emptyTitle}>
                Aucune conversion configurée
              </Text>
              <Text variant="body" style={styles.emptySubtitle}>
                Ajoutez vos premières règles de conversion
              </Text>
              <Button 
                title="Ajouter une conversion"
                onPress={handleAddConversion}
                style={styles.emptyButton}
              />
            </View>
          )}
        </View>
      </ScrollView>


      {/* ✅ COMPATIBLE WEB : Modal de confirmation */}
      <ConfirmationModal
        visible={confirmModal.visible}
        onClose={cancelToggleActive}
        title={confirmModal.isActive ? 'Désactiver la conversion' : 'Réactiver la conversion'}
        message={
          confirmModal.isActive
            ? 'Cette conversion sera marquée comme inactive mais conservée dans votre historique.'
            : 'Cette conversion sera de nouveau disponible comme active.'
        }
        confirmText={confirmModal.isActive ? 'Désactiver' : 'Réactiver'}
        cancelText="Annuler"
        onConfirm={() => confirmModal.conversion && confirmToggleActive(confirmModal.conversion, confirmModal.isActive)}
        confirmVariant={confirmModal.isActive ? 'danger' : 'success'}
        icon={
          <View style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: confirmModal.isActive ? colors.semantic.error + '20' : colors.semantic.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 14 }}>
              {confirmModal.isActive ? '🗑️' : '✅'}
            </Text>
          </View>
        }
      />

      {/* Modal d'ajout/modification de conversion */}
      <QuickConversionModal
        visible={quickModalVisible}
        onClose={() => {
          setQuickModalVisible(false);
          setEditingConversion(null);
        }}
        onSave={handleQuickSave}
        farmId={1} // TODO: Récupérer l'ID de la ferme depuis le contexte
        title={editingConversion ? `Modifier : ${editingConversion.name}` : "Ajout rapide de conversion"}
        editingConversion={editingConversion}
      />
    </View>
  );
}

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
    marginBottom: spacing.xl,
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
    color: colors.semantic.success, // ✅ Vert au lieu de bleu
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
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
  },
  conversionsSection: {
    marginBottom: spacing.xl,
  },
  conversionsList: {
    gap: spacing.xs,
  },
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
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
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
