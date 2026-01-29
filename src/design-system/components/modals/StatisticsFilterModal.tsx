import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from '../Text';
import { Button } from '../Button';
import { DropdownSelector, DropdownItem } from '../DropdownSelector';
import { CultureDropdownSelector, CultureDropdownItem } from '../CultureDropdownSelector';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '../../../contexts/FarmContext';
import { PlotService } from '../../../services/plotService';
import type { PlotData } from '../cards/PlotCardStandard';

export interface StatisticsFilters {
  cultures?: CultureDropdownItem[];  // Array pour multi-sélection
  plots?: DropdownItem[];            // Array pour multi-sélection
  surfaceUnit?: DropdownItem;        // Reste single (dépend de parcelle)
  myDataOnly?: boolean; // true = mes données uniquement, false/undefined = toute la ferme
}

export interface StatisticsFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onFiltersApply: (filters: StatisticsFilters) => void;
  initialFilters?: StatisticsFilters;
  title?: string;
}

export const StatisticsFilterModal: React.FC<StatisticsFilterModalProps> = ({
  visible,
  onClose,
  onFiltersApply,
  initialFilters,
  title = "Filtres avancés",
}) => {
  const { activeFarm } = useFarm();
  
  // États des filtres (arrays pour multi-sélection)
  const [selectedCultures, setSelectedCultures] = useState<CultureDropdownItem[]>(
    initialFilters?.cultures || []
  );
  const [selectedPlots, setSelectedPlots] = useState<DropdownItem[]>(
    initialFilters?.plots || []
  );
  const [selectedSurfaceUnit, setSelectedSurfaceUnit] = useState<DropdownItem | null>(
    initialFilters?.surfaceUnit || null
  );
  const [myDataOnly, setMyDataOnly] = useState<boolean>(
    initialFilters?.myDataOnly || false
  );

  // États temporaires pour les sélections dans les dropdowns
  const [tempCultureSelection, setTempCultureSelection] = useState<CultureDropdownItem | null>(null);
  const [tempPlotSelection, setTempPlotSelection] = useState<DropdownItem | null>(null);

  // États des données
  const [plots, setPlots] = useState<PlotData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Charger les parcelles au montage ou changement de ferme
  useEffect(() => {
    if (visible && activeFarm?.farm_id) {
      loadPlots();
    }
  }, [visible, activeFarm?.farm_id]);

  // Réinitialiser les surface units quand les parcelles changent
  useEffect(() => {
    if (selectedPlots.length === 0) {
      setSelectedSurfaceUnit(null);
    }
  }, [selectedPlots]);

  const loadPlots = async () => {
    if (!activeFarm?.farm_id) return;

    try {
      setLoading(true);
      setError('');
      const plotsData = await PlotService.getPlotsByFarm(activeFarm.farm_id);
      setPlots(plotsData.filter(plot => plot.status === 'active')); // Seulement les parcelles actives
    } catch (err) {
      console.error('Erreur chargement parcelles:', err);
      setError('Impossible de charger les parcelles');
    } finally {
      setLoading(false);
    }
  };

  // Convertir les parcelles en items dropdown
  const plotDropdownItems = useMemo((): DropdownItem[] => {
    return plots.map(plot => ({
      id: plot.id,
      label: plot.name,
      description: plot.description || `${plot.type} - ${plot.area} ${plot.unit}`,
      type: plot.type,
      category: 'plot',
    }));
  }, [plots]);

  // Convertir les unités de surface en items dropdown (dépendant de la première parcelle sélectionnée)
  const surfaceUnitDropdownItems = useMemo((): DropdownItem[] => {
    if (selectedPlots.length === 0) return [];

    // Utiliser la première parcelle sélectionnée pour les unités de surface
    const firstPlot = selectedPlots[0];
    const selectedPlotData = plots.find(plot => plot.id === firstPlot.id);
    if (!selectedPlotData?.surfaceUnits) return [];

    return selectedPlotData.surfaceUnits.map(unit => ({
      id: unit.id,
      label: unit.name,
      description: unit.fullName,
      type: unit.type,
      category: 'surface_unit',
    }));
  }, [selectedPlots, plots]);

  // Gérer les changements de sélection temporaire (dropdown)
  const handleCultureChange = (culture: CultureDropdownItem | null) => {
    setTempCultureSelection(culture);
  };

  const handlePlotChange = (selectedItems: DropdownItem[]) => {
    const plot = selectedItems.length > 0 ? selectedItems[0] : null;
    setTempPlotSelection(plot);
  };

  const handleSurfaceUnitChange = (selectedItems: DropdownItem[]) => {
    const surfaceUnit = selectedItems.length > 0 ? selectedItems[0] : null;
    setSelectedSurfaceUnit(surfaceUnit);
  };

  // Ajouter une culture à la liste
  const handleAddCulture = () => {
    if (tempCultureSelection && !selectedCultures.find(c => c.id === tempCultureSelection.id)) {
      setSelectedCultures([...selectedCultures, tempCultureSelection]);
      setTempCultureSelection(null); // Réinitialiser le dropdown
    }
  };

  // Retirer une culture de la liste
  const handleRemoveCulture = (cultureId: string) => {
    setSelectedCultures(selectedCultures.filter(c => c.id !== cultureId));
  };

  // Ajouter une parcelle à la liste
  const handleAddPlot = () => {
    if (tempPlotSelection && !selectedPlots.find(p => p.id === tempPlotSelection.id)) {
      setSelectedPlots([...selectedPlots, tempPlotSelection]);
      setTempPlotSelection(null); // Réinitialiser le dropdown
      // Réinitialiser l'unité de surface si on ajoute une nouvelle parcelle
      if (selectedPlots.length === 0) {
        setSelectedSurfaceUnit(null);
      }
    }
  };

  // Retirer une parcelle de la liste
  const handleRemovePlot = (plotId: string) => {
    const newPlots = selectedPlots.filter(p => p.id !== plotId);
    setSelectedPlots(newPlots);
    // Réinitialiser l'unité de surface si plus de parcelles
    if (newPlots.length === 0) {
      setSelectedSurfaceUnit(null);
    }
  };

  // Appliquer les filtres
  const handleApply = () => {
    const filters: StatisticsFilters = {};
    
    if (selectedCultures.length > 0) {
      filters.cultures = selectedCultures;
    }
    if (selectedPlots.length > 0) {
      filters.plots = selectedPlots;
    }
    if (selectedSurfaceUnit) {
      filters.surfaceUnit = selectedSurfaceUnit;
    }
    if (myDataOnly) {
      filters.myDataOnly = myDataOnly;
    }

    onFiltersApply(filters);
    onClose();
  };

  // Réinitialiser les filtres
  const handleReset = () => {
    setSelectedCultures([]);
    setSelectedPlots([]);
    setSelectedSurfaceUnit(null);
    setMyDataOnly(false);
    setTempCultureSelection(null);
    setTempPlotSelection(null);
  };

  // Fermer et réinitialiser
  const handleClose = () => {
    // Restaurer les filtres initiaux si on annule
    setSelectedCultures(initialFilters?.cultures || []);
    setSelectedPlots(initialFilters?.plots || []);
    setSelectedSurfaceUnit(initialFilters?.surfaceUnit || null);
    setMyDataOnly(initialFilters?.myDataOnly || false);
    setTempCultureSelection(null);
    setTempPlotSelection(null);
    onClose();
  };

  // Compter les filtres actifs
  const activeFiltersCount = [
    ...(selectedCultures.length > 0 ? selectedCultures : []),
    ...(selectedPlots.length > 0 ? selectedPlots : []),
    selectedSurfaceUnit,
    myDataOnly,
  ].filter(Boolean).length;

  // Styles
  const modalStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  };

  const contentStyle: ViewStyle = {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  };

  const buttonContainerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={modalStyle}>
        <View style={contentStyle}>
          {/* Header */}
          <View style={headerStyle}>
            <View style={{ flex: 1 }}>
              <Text variant="h3" color={colors.text.primary}>
                {title}
              </Text>
              {activeFiltersCount > 0 && (
                <Text variant="caption" color={colors.text.secondary} style={{ marginTop: spacing.xs }}>
                  {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                padding: spacing.xs,
                borderRadius: 20,
                backgroundColor: colors.gray[100],
              }}
            >
              <Ionicons
                name="close-outline"
                size={20}
                color={colors.gray[600]}
              />
            </TouchableOpacity>
          </View>

          {/* Contenu scrollable */}
          <ScrollView 
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {/* Filtre données utilisateur */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" style={{ marginBottom: spacing.sm }}>
                Portée des données
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: myDataOnly ? colors.primary[50] : colors.gray[50],
                  borderWidth: 1,
                  borderColor: myDataOnly ? colors.primary[200] : colors.border.primary,
                  borderRadius: 8,
                  padding: spacing.md,
                }}
                onPress={() => setMyDataOnly(!myDataOnly)}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: myDataOnly ? colors.primary[600] : colors.gray[400],
                  backgroundColor: myDataOnly ? colors.primary[600] : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  {myDataOnly && (
                    <Ionicons
                      name="checkmark-outline"
                      size={12}
                      color={colors.text.inverse}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    variant="body"
                    color={myDataOnly ? colors.primary[700] : colors.text.primary}
                    weight={myDataOnly ? 'semibold' : 'normal'}
                  >
                    Voir mes données uniquement
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    style={{ marginTop: 2 }}
                  >
                    {myDataOnly 
                      ? 'Afficher seulement les données que j\'ai créées'
                      : 'Afficher toutes les données de la ferme'
                    }
                  </Text>
                </View>
                <Ionicons
                  name={myDataOnly ? 'person-outline' : 'people-outline'}
                  size={20}
                  color={myDataOnly ? colors.primary[600] : colors.gray[500]}
                />
              </TouchableOpacity>
            </View>

            {/* Sélecteur de culture avec multi-sélection */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" style={{ marginBottom: spacing.sm }}>
                Culture
              </Text>
              
              {/* Dropdown + Bouton Ajouter */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <CultureDropdownSelector
                    placeholder="Sélectionner une culture..."
                    selectedItem={tempCultureSelection}
                    onSelectionChange={handleCultureChange}
                    farmId={activeFarm?.farm_id}
                    allowVarieties={false}
                    searchable={true}
                    useUserPreferences={true}
                    hint="Filtrer par type de culture"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleAddCulture}
                  disabled={!tempCultureSelection || selectedCultures.some(c => c.id === tempCultureSelection.id)}
                  style={{
                    backgroundColor: tempCultureSelection && !selectedCultures.some(c => c.id === tempCultureSelection.id)
                      ? colors.primary[600]
                      : colors.gray[300],
                    borderRadius: 8,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: 60,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-outline"
                    size={24}
                    color={tempCultureSelection && !selectedCultures.some(c => c.id === tempCultureSelection.id)
                      ? colors.text.inverse
                      : colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>

              {/* Liste des cultures sélectionnées */}
              {selectedCultures.length > 0 && (
                <View style={{
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                }}>
                  {selectedCultures.map((culture) => (
                    <View
                      key={culture.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: colors.background.primary,
                        borderRadius: 6,
                        padding: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name="leaf-outline"
                          size={16}
                          color={colors.primary[600]}
                          style={{ marginRight: spacing.xs }}
                        />
                        <Text variant="body" color={colors.text.primary} numberOfLines={1}>
                          {culture.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveCulture(culture.id)}
                        style={{
                          padding: spacing.xs,
                          marginLeft: spacing.sm,
                        }}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={20}
                          color={colors.semantic.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Sélecteur de parcelle avec multi-sélection */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text variant="label" style={{ marginBottom: spacing.sm }}>
                Parcelle
              </Text>
              
              {/* Dropdown + Bouton Ajouter */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <DropdownSelector
                    placeholder="Sélectionner une parcelle..."
                    items={plotDropdownItems}
                    selectedItems={tempPlotSelection ? [tempPlotSelection] : []}
                    onSelectionChange={handlePlotChange}
                    multiSelect={false}
                    searchable={true}
                    filterable={false}
                    disabled={loading}
                    hint={loading ? "Chargement des parcelles..." : "Filtrer par parcelle spécifique"}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleAddPlot}
                  disabled={!tempPlotSelection || selectedPlots.some(p => p.id === tempPlotSelection.id) || loading}
                  style={{
                    backgroundColor: tempPlotSelection && !selectedPlots.some(p => p.id === tempPlotSelection.id) && !loading
                      ? colors.primary[600]
                      : colors.gray[300],
                    borderRadius: 8,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: 60,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-outline"
                    size={24}
                    color={tempPlotSelection && !selectedPlots.some(p => p.id === tempPlotSelection.id) && !loading
                      ? colors.text.inverse
                      : colors.gray[500]}
                  />
                </TouchableOpacity>
              </View>

              {/* Liste des parcelles sélectionnées */}
              {selectedPlots.length > 0 && (
                <View style={{
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                }}>
                  {selectedPlots.map((plot) => (
                    <View
                      key={plot.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: colors.background.primary,
                        borderRadius: 6,
                        padding: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name="grid-outline"
                          size={16}
                          color={colors.secondary.blue}
                          style={{ marginRight: spacing.xs }}
                        />
                        <Text variant="body" color={colors.text.primary} numberOfLines={1}>
                          {plot.label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemovePlot(plot.id)}
                        style={{
                          padding: spacing.xs,
                          marginLeft: spacing.sm,
                        }}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={20}
                          color={colors.semantic.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Sélecteur d'unité de surface */}
            <View style={{ marginBottom: spacing.lg }}>
              <DropdownSelector
                label="Unité de surface"
                placeholder={
                  selectedPlots.length === 0
                    ? "Sélectionnez d'abord une parcelle"
                    : surfaceUnitDropdownItems.length === 0
                    ? "Aucune unité disponible"
                    : "Sélectionner une unité..."
                }
                items={surfaceUnitDropdownItems}
                selectedItems={selectedSurfaceUnit ? [selectedSurfaceUnit] : []}
                onSelectionChange={handleSurfaceUnitChange}
                multiSelect={false}
                searchable={true}
                filterable={false}
                disabled={selectedPlots.length === 0 || surfaceUnitDropdownItems.length === 0}
                hint={
                  selectedPlots.length === 0
                    ? "Dépend de la parcelle sélectionnée"
                    : "Filtrer par unité de surface spécifique (planche, serre, etc.)"
                }
              />
            </View>

            {/* Message d'erreur */}
            {error && (
              <View style={{
                backgroundColor: colors.semantic.error + '10',
                padding: spacing.md,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.semantic.error + '30',
                marginBottom: spacing.lg,
              }}>
                <Text variant="body" color={colors.semantic.error}>
                  {error}
                </Text>
              </View>
            )}

            {/* Informations sur les filtres */}
            <View style={{
              backgroundColor: colors.gray[50],
              padding: spacing.md,
              borderRadius: 8,
              marginBottom: spacing.lg,
            }}>
              <Text variant="caption" color={colors.text.secondary}>
                💡 Les filtres permettent d'affiner les statistiques affichées. 
                Vous pouvez combiner plusieurs critères pour une analyse précise.
              </Text>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={buttonContainerStyle}>
            <Button
              title="Réinitialiser"
              onPress={handleReset}
              variant="secondary"
              style={{ flex: 1 }}
              disabled={activeFiltersCount === 0}
            />
            <Button
              title="Annuler"
              onPress={handleClose}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              title="Appliquer"
              onPress={handleApply}
              variant="primary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};


