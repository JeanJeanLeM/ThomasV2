import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  MapIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '../design-system/icons';
import { Text, Button, PlotCardStandard, Modal, Input } from '../design-system/components';
import { PlotFormModal } from '../design-system/components/modals/PlotFormModal';
import type { PlotData } from '../design-system/components/cards/PlotCardStandard';
import { PlotService } from '../services/plotService';
import { useFarm, useFarmPlots } from '../contexts/FarmContext';

const PLOT_TYPES: { value: PlotData['type']; label: string }[] = [
  { value: 'plein_champ', label: 'Plein champ' },
  { value: 'serre_plastique', label: 'Serre plastique' },
  { value: 'serre_verre', label: 'Serre verre' },
  { value: 'tunnel', label: 'Tunnel' },
  { value: 'hydroponique', label: 'Hydroponique' },
  { value: 'pepiniere', label: 'Pépinière' },
  { value: 'autre', label: 'Autre' },
];



interface PlotsSettingsScreenProps {
  onTitleChange?: (title: string | null) => void;
  onBack?: () => void;
}

export default function PlotsSettingsScreen({ onTitleChange, onBack }: PlotsSettingsScreenProps) {
  const { activeFarm, invalidateFarmData } = useFarm();
  const { plots, loading: loadingPlots } = useFarmPlots();
  
  // Farm selector hook

  const [editingPlot, setEditingPlot] = useState<PlotData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  // Filtres / recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  
  // Modal de confirmation pour soft delete
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    plot: PlotData | null;
    isActive: boolean;
  }>({
    visible: false,
    plot: null,
    isActive: false,
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!activeFarm) return;
    setRefreshing(true);
    try {
      await invalidateFarmData(['plots']);
    } finally {
      setRefreshing(false);
    }
  };

  // Au montage (ouverture du menu Parcelles), forcer le rechargement depuis la DB
  // pour afficher les parcelles créées via le chat ou ailleurs
  useEffect(() => {
    if (activeFarm) {
      invalidateFarmData(['plots']);
    }
  }, [activeFarm?.farm_id]);

  // Gérer le changement de titre pour cacher la navbar quand le formulaire est ouvert
  useEffect(() => {
    if (onTitleChange) {
      if (isFormVisible) {
        onTitleChange(editingPlot ? 'Modifier une parcelle' : 'Créer une parcelle');
      } else {
        onTitleChange(null);
      }
    }
  }, [isFormVisible, editingPlot, onTitleChange]);



  const handleAddPlot = () => {
    setEditingPlot(null);
    setIsCreating(true);
    setIsFormVisible(true);
  };

  const openEditPlot = (plot: PlotData) => {
    setIsCreating(false);
    setEditingPlot(plot);
    setIsFormVisible(true);
  };

  const handleEditPlot = (plot: PlotData) => {
    openEditPlot(plot);
  };

  const handlePlotFormClose = () => {
    setIsFormVisible(false);
    setEditingPlot(null);
    setIsCreating(false);
  };

  const handleCloseModal = handlePlotFormClose;

  const handlePlotFormSave = async (plotData: PlotData) => {
    if (!activeFarm) {
      Alert.alert('Erreur', 'Aucune ferme active sélectionnée');
      return;
    }

    try {
      if (isCreating) {
        await PlotService.createPlot(activeFarm.farm_id, plotData);
        Alert.alert('Succès', 'Parcelle créée avec succès');
      } else {
        await PlotService.updatePlot(plotData);
        Alert.alert('Succès', 'Parcelle modifiée avec succès');
      }
      
      // Recharger les données
      invalidateFarmData();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error; // Re-throw pour que PlotFormModal puisse gérer l'erreur
    }
  };

  const handleToggleActive = (plot: PlotData) => {
    const isActive = plot.is_active !== false;
    
    console.log('🔧 handleToggleActive called:', {
      plotId: plot.id,
      plotName: plot.name,
      currentIsActive: plot.is_active,
      calculatedIsActive: isActive,
    });

    if (Platform.OS === 'web') {
      // Modal personnalisé pour le web
      setConfirmModal({
        visible: true,
        plot,
        isActive,
      });
    } else {
      // Alert natif pour mobile
      Alert.alert(
        isActive ? 'Désactiver la parcelle' : 'Réactiver la parcelle',
        isActive
          ? 'Cette parcelle sera marquée comme inactive mais conservée dans votre historique.'
          : 'Cette parcelle sera de nouveau disponible comme active.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: isActive ? 'Désactiver' : 'Réactiver',
            style: 'destructive',
            onPress: () => confirmToggleActive(plot, isActive),
          },
        ]
      );
    }
  };

  const confirmToggleActive = async (plot: PlotData, isActive: boolean) => {
    console.log('✅ Soft delete confirmed, updating plot:', {
      plotId: plot.id,
      currentIsActive: plot.is_active,
      newIsActive: !isActive,
    });
    
    try {
      await PlotService.togglePlotStatus(plot.id);
      
      // Invalider le cache des parcelles pour mise à jour automatique
      await invalidateFarmData(['plots']);
      
      setConfirmModal({ visible: false, plot: null, isActive: false });
      
      console.log(`✅ [PlotsScreen] Parcelle ${isActive ? 'désactivée' : 'réactivée'}`);
    } catch (error) {
      console.error(`❌ [PlotsScreen] Erreur ${isActive ? 'désactivation' : 'réactivation'} parcelle:`, error);
      
      if (Platform.OS === 'web') {
        setConfirmModal({ visible: false, plot: null, isActive: false });
      }
      
      Alert.alert('Erreur', `Impossible de ${isActive ? 'désactiver' : 'réactiver'} la parcelle.`);
    }
  };

  const cancelToggleActive = () => {
    setConfirmModal({ visible: false, plot: null, isActive: false });
  };

  // Fonctions supprimées car on utilise maintenant is_active directement

  const totalPlots = plots.length;
  const activePlots = plots.filter((p) => p.is_active !== false).length;
  const inactivePlots = plots.filter((p) => p.is_active === false).length;
  


  // Filtrage des parcelles selon la recherche et les filtres
  const filteredPlots = plots.filter((plot) => {
    if (statusFilter === 'active' && plot.is_active === false) return false;
    if (statusFilter === 'inactive' && plot.is_active !== false) return false;

    if (typeFilter !== 'all' && plot.type !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        plot.name,
        plot.code,
        plot.customTypeLabel,
        plot.type,
        ...(plot.aliases || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    return true;
  });


  return (
    <>
      {!isFormVisible ? (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
            />
          }
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View>
                <Text variant="h2" style={styles.title}>
                  Gestion des parcelles
                </Text>
                <Text variant="body" style={styles.subtitle}>
                  {plots.length} parcelle{plots.length > 1 ? 's' : ''} configurée
                  {plots.length > 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.addButton, styles.reloadButton]}
                  onPress={handleRefresh}
                  disabled={refreshing}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={handleAddPlot}>
                  <PlusIcon color="white" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* En-tête statistiques */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MapIcon color={colors.semantic.info} size={22} style={{ marginRight: spacing.sm }} />
                <Text variant="h3" style={styles.summaryTitle}>
                  Aperçu de vos données
                </Text>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryNumber}>{totalPlots}</Text>
                  <Text style={styles.summaryLabel}>Parcelles</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryNumber}>{activePlots}</Text>
                  <Text style={styles.summaryLabel}>Actives</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryNumber}>{inactivePlots}</Text>
                  <Text style={styles.summaryLabel}>Inactives</Text>
                </View>
              </View>
            </View>

            {/* Barre de recherche séparée */}
            <View style={styles.searchContainer}>
              <Input
                label="Rechercher"
                placeholder="Rechercher une parcelle..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Section filtres séparée */}
            <View style={styles.filtersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {/* Filtre global "Toutes" seulement si les deux filtres sont sur "all" */}
                {typeFilter === 'all' && statusFilter === 'all' && (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: colors.gray[600],
                        borderColor: colors.gray[600],
                      },
                    ]}
                    onPress={() => {
                      // Déjà sélectionné, ne rien faire
                    }}
                  >
                    <Text
                      variant="caption"
                      weight="medium"
                      color={colors.text.inverse}
                    >
                      Toutes
                    </Text>
                    <View style={[styles.countBadge, styles.countBadgeSelected, { marginLeft: spacing.xs }]}>
                      <Text
                        variant="caption"
                        weight="bold"
                        color={colors.gray[600]}
                        style={{ fontSize: 10 }}
                      >
                        {plots.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Filtres par type (sans le "Toutes les parcelles") */}
                {Array.from(new Set(plots.map((p) => p.type))).map((t) => {
                  const typeInfo = PLOT_TYPES.find((pt) => pt.value === t);
                  const count = plots.filter((p) => p.type === t).length;
                  if (count === 0) return null;
                  
                  const isSelected = typeFilter === t;

                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.filterChip,
                        isSelected && {
                          backgroundColor: colors.semantic.success,
                          borderColor: colors.semantic.success,
                        },
                      ]}
                      onPress={() => {
                        setTypeFilter(t as any);
                        setStatusFilter('all'); // Reset le filtre de statut
                      }}
                    >
                      <Text
                        variant="caption"
                        weight="medium"
                        color={isSelected ? colors.text.inverse : colors.text.secondary}
                      >
                        {typeInfo?.label || t}
                      </Text>
                      {count > 0 && (
                        <View
                          style={[
                            styles.countBadge,
                            isSelected && styles.countBadgeSelected,
                            { marginLeft: spacing.xs },
                          ]}
                        >
                          <Text
                            variant="caption"
                            weight="bold"
                            color={isSelected ? colors.semantic.success : colors.text.inverse}
                            style={{ fontSize: 10 }}
                          >
                            {count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Séparateur visuel */}
                <View style={styles.filterSeparator} />

                {/* Filtres par statut (sans le "Toutes") */}
                {[
                  { value: 'active', label: 'Actives', color: colors.semantic.success },
                  { value: 'inactive', label: 'Inactives', color: colors.gray[500] },
                ].map((status) => {
                  const count = plots.filter((p) =>
                    status.value === 'active'
                      ? p.is_active !== false
                      : p.is_active === false,
                  ).length;
                  
                  if (count === 0) return null;
                  
                  const isSelected = statusFilter === status.value;

                  return (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.filterChip,
                        styles.statusChip,
                        isSelected && {
                          backgroundColor: status.color,
                          borderColor: status.color,
                        },
                      ]}
                      onPress={() => {
                        setStatusFilter(status.value as 'active' | 'inactive');
                        setTypeFilter('all'); // Reset le filtre de type
                      }}
                    >
                      <Text
                        variant="caption"
                        weight="medium"
                        color={isSelected ? colors.text.inverse : colors.text.secondary}
                      >
                        {status.label}
                      </Text>
                      {count > 0 && (
                        <View
                          style={[
                            styles.countBadge,
                            isSelected && styles.countBadgeSelected,
                            { marginLeft: spacing.xs },
                          ]}
                        >
                          <Text
                            variant="caption"
                            weight="bold"
                            color={isSelected ? status.color : colors.text.inverse}
                            style={{ fontSize: 10 }}
                          >
                            {count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {loadingPlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary[600]} />
                <Text variant="body" style={styles.loadingText}>
                  Chargement des parcelles...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.plotsList}>
                  {filteredPlots.map((plot) => (
                    <PlotCardStandard
                      key={plot.id}
                      plot={plot}
                      onPress={handleEditPlot}
                      onDelete={handleToggleActive}
                    />
                  ))}
                </View>

                {plots.length === 0 && (
              <View style={styles.emptyState}>
                <MapIcon color={colors.gray[400]} size={64} />
                <Text variant="h3" style={styles.emptyTitle}>
                  Aucune parcelle configurée
                </Text>
                <Text variant="body" style={styles.emptySubtitle}>
                  Ajoutez votre première parcelle pour commencer
                </Text>
                <Button
                  title="Ajouter une parcelle"
                  onPress={handleAddPlot}
                  style={styles.emptyButton}
                />
              </View>
            )}
              </>
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* Modal de formulaire pour créer/modifier une parcelle */}
      <PlotFormModal
        visible={isFormVisible}
        onClose={handlePlotFormClose}
        onSave={handlePlotFormSave}
        plot={editingPlot}
        isCreating={isCreating}
        activeFarm={activeFarm}
      />

      {/* Modal de confirmation pour soft delete */}
      <Modal
        visible={confirmModal.visible}
        onClose={cancelToggleActive}
        title={confirmModal.isActive ? 'Désactiver la parcelle' : 'Réactiver la parcelle'}
        size="sm"
        primaryAction={{
          title: confirmModal.isActive ? 'Désactiver' : 'Réactiver',
          onPress: () => confirmModal.plot && confirmToggleActive(confirmModal.plot, confirmModal.isActive),
        }}
        secondaryAction={{
          title: 'Annuler',
          onPress: cancelToggleActive,
        }}
      >
        <View style={{ padding: spacing.md }}>
          <Text variant="body" color={colors.text.secondary}>
            {confirmModal.isActive
              ? 'Cette parcelle sera marquée comme inactive mais conservée dans votre historique.'
              : 'Cette parcelle sera de nouveau disponible comme active.'}
          </Text>
          
          {confirmModal.plot && (
            <View style={styles.plotPreviewCard}>
              <Text variant="h4" color={colors.text.primary}>
                {confirmModal.plot.name}
              </Text>
              {confirmModal.plot.code && (
                <Text variant="body" color={colors.text.secondary}>
                  Code: {confirmModal.plot.code}
                </Text>
              )}
              <Text variant="caption" color={colors.text.secondary}>
                Type: {PLOT_TYPES.find(t => t.value === confirmModal.plot?.type)?.label || confirmModal.plot.type}
              </Text>
            </View>
          )}
        </View>
      </Modal>

    </>
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
  formScrollContent: {
    padding: spacing.lg,
    // Padding bas important pour que le contenu ne soit jamais caché
    // par la barre de boutons sticky (sécurité d'affichage).
    paddingBottom: 120,
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
  },
  summaryTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
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
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  filtersContainer: {
    marginBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reloadButton: {
    marginRight: spacing.sm,
  },
  plotsList: {
    // Removed gap property (not fully supported on React Native Web)
    // Cards have marginBottom instead
  },
  filterChipsContainer: {
    marginTop: spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
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
    marginRight: spacing.sm,
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
  statusChip: {
    backgroundColor: colors.gray[100],
  },
  filterSeparator: {
    width: 1,
    height: 24,
    backgroundColor: colors.gray[300],
    marginHorizontal: spacing.sm,
  },
  plotCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  plotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  plotInfo: {
    flex: 1,
  },
  plotName: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  plotArea: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  plotCrop: {
    color: colors.text.secondary,
  },
  plotActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  plotFooter: {
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  plotPreviewCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
