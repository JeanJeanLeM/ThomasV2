import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TimeNavigator,
  FilterChips,
  ChartSelector,
  StatisticsChartWrapper,
  DropdownSelector,
  CultureDropdownSelector,
} from '@/design-system/components';
import InterfaceTourTarget from '@/components/interface-tour/InterfaceTourTarget';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { useFarm } from '@/contexts/FarmContext';
import { useAuth } from '@/contexts/AuthContext';
import { TaskService } from '@/services/TaskService';
import { StatisticsService } from '@/services/StatisticsService';
import { PlotService } from '@/services/plotService';
import type { TimeRange } from '@/design-system/components/TimeNavigator';
import type { StatisticsFilters, CultureDropdownItem } from '@/design-system/components/modals/StatisticsFilterModal';
import type { DropdownItem } from '@/design-system/components/DropdownSelector';
import type { PlotData } from '@/design-system/components/cards/PlotCardStandard';
import type { PieChartData } from '@/design-system/components/charts';
import type { BarChartData } from '@/design-system/components/charts';
import type { ChartType } from '@/config/chartConfig';
import {
  buildPlantNameSet,
  cultureDropdownItemMatchesPlants,
} from '@/utils/statisticsPeriodHints';

const StatisticsScreen: React.FC = () => {
  const { activeFarm, loading: farmLoading, error: farmError, needsSetup } = useFarm();
  const { user } = useAuth();

  // État pour la plage temporelle sélectionnée
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>(() => {
    // Initialiser avec la semaine actuelle (lundi à dimanche)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dimanche = 0, donc 6 jours en arrière

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToMonday);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate,
      endDate,
      unit: 'semaine',
    };
  });

  // États pour les filtres avancés
  const [activeFilters, setActiveFilters] = useState<StatisticsFilters>({});

  // États locaux pour les filtres (multi-sélection)
  const [selectedCultures, setSelectedCultures] = useState<CultureDropdownItem[]>(
    activeFilters.cultures || []
  );
  const [selectedPlots, setSelectedPlots] = useState<DropdownItem[]>(
    activeFilters.plots || []
  );

  // États des données
  const [plots, setPlots] = useState<PlotData[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [plotsError, setPlotsError] = useState<string>('');

  /** Tâches sur la période : parcelles et cultures citées (pré-filtre des dropdowns) */
  const [periodHints, setPeriodHints] = useState<{
    taskCount: number;
    plotIds: number[];
    plantNames: string[];
  } | null>(null);

  // Charger les parcelles au montage ou changement de ferme
  useEffect(() => {
    if (activeFarm?.farm_id) {
      loadPlots();
    }
  }, [activeFarm?.farm_id]);

  const periodPlotIdSet = useMemo(() => {
    if (!periodHints || periodHints.taskCount === 0 || periodHints.plotIds.length === 0) {
      return null;
    }
    return new Set(periodHints.plotIds);
  }, [periodHints]);

  const periodPlantSet = useMemo(() => {
    if (!periodHints || periodHints.taskCount === 0 || periodHints.plantNames.length === 0) {
      return null;
    }
    return buildPlantNameSet(periodHints.plantNames);
  }, [periodHints]);

  const referencedPlantNamesForDropdown = useMemo(() => {
    if (!periodHints || periodHints.taskCount === 0 || periodHints.plantNames.length === 0) {
      return undefined;
    }
    return periodHints.plantNames;
  }, [periodHints]);

  useEffect(() => {
    if (!activeFarm?.farm_id) {
      setPeriodHints(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const h = await TaskService.getPeriodReferenceHints({
          farmId: activeFarm.farm_id,
          startDate: currentTimeRange.startDate,
          endDate: currentTimeRange.endDate,
        });
        if (!cancelled) setPeriodHints(h);
      } catch (e) {
        console.error('[STATS-SCREEN] period hints', e);
        if (!cancelled) setPeriodHints(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeFarm?.farm_id,
    currentTimeRange.startDate.getTime(),
    currentTimeRange.endDate.getTime(),
  ]);

  // Retirer culture / parcelle plus citées sur la période (chips via activeFilters → sync selected*)
  useEffect(() => {
    if (!periodPlantSet) return;
    setActiveFilters((f) => {
      const cur = f.cultures || [];
      const next = cur.filter((c) => cultureDropdownItemMatchesPlants(c, periodPlantSet));
      if (next.length === cur.length) return f;
      const nf = { ...f };
      if (next.length > 0) nf.cultures = next;
      else delete nf.cultures;
      return nf;
    });
  }, [periodPlantSet]);

  useEffect(() => {
    if (!periodPlotIdSet) return;
    setActiveFilters((f) => {
      const cur = f.plots || [];
      const next = cur.filter((p) => periodPlotIdSet.has(Number(p.id)));
      if (next.length === cur.length) return f;
      const nf = { ...f };
      if (next.length > 0) nf.plots = next;
      else delete nf.plots;
      return nf;
    });
  }, [periodPlotIdSet]);

  // Synchroniser les états locaux avec activeFilters quand ils changent
  useEffect(() => {
    setSelectedCultures(activeFilters.cultures || []);
    setSelectedPlots(activeFilters.plots || []);
  }, [activeFilters]);

  const loadPlots = async () => {
    if (!activeFarm?.farm_id) return;

    try {
      setLoadingPlots(true);
      setPlotsError('');
      const plotsData = await PlotService.getPlotsByFarm(activeFarm.farm_id);
      setPlots(plotsData.filter(plot => plot.status === 'active'));
    } catch (err) {
      console.error('Erreur chargement parcelles:', err);
      setPlotsError('Impossible de charger les parcelles');
    } finally {
      setLoadingPlots(false);
    }
  };

  // Convertir les parcelles en items dropdown (restreint aux parcelles citées sur la période si possible)
  const plotDropdownItems = useMemo((): DropdownItem[] => {
    let list = plots;
    if (periodPlotIdSet && periodPlotIdSet.size > 0) {
      list = plots.filter((plot) => periodPlotIdSet.has(Number(plot.id)));
    }
    return list.map((plot) => ({
      id: String(plot.id),
      label: plot.name,
      description: plot.description || `${plot.type} - ${plot.area} ${plot.unit}`,
      type: plot.type,
      category: 'plot',
    }));
  }, [plots, periodPlotIdSet]);

  // Sélection culture : ajout immédiat aux filtres actifs (sans bouton +)
  const handleCultureChange = (culture: CultureDropdownItem | null) => {
    if (culture) {
      setActiveFilters((prev) => {
        const cur = prev.cultures || [];
        if (cur.some((c) => c.id === culture.id)) return prev;
        return { ...prev, cultures: [...cur, culture] };
      });
    }
  };

  // Sélection parcelle : ajout immédiat aux filtres actifs
  const handlePlotChange = (selectedItems: DropdownItem[]) => {
    const plot = selectedItems.length > 0 ? selectedItems[0] : null;
    if (plot) {
      setActiveFilters((prev) => {
        const cur = prev.plots || [];
        if (cur.some((p) => p.id === plot.id)) return prev;
        return { ...prev, plots: [...cur, plot] };
      });
    }
  };

  // Retirer une culture de la liste et mettre à jour immédiatement
  const handleRemoveCulture = (cultureId: string) => {
    const newCultures = selectedCultures.filter(c => c.id !== cultureId);
    setSelectedCultures(newCultures);
    
    // Mettre à jour immédiatement activeFilters
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (newCultures.length > 0) {
        newFilters.cultures = newCultures;
      } else {
        delete newFilters.cultures;
      }
      return newFilters;
    });
  };

  // Retirer une parcelle de la liste et mettre à jour immédiatement
  const handleRemovePlot = (plotId: string) => {
    const newPlots = selectedPlots.filter(p => p.id !== plotId);
    setSelectedPlots(newPlots);
    
    // Mettre à jour immédiatement activeFilters
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (newPlots.length > 0) {
        newFilters.plots = newPlots;
      } else {
        delete newFilters.plots;
      }
      return newFilters;
    });
  };


  // État pour le type de graphique sélectionné
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('workTimeByCategory');

  // États pour les données du graphique
  const [chartData, setChartData] = useState<PieChartData[] | BarChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // Gérer le changement de plage temporelle
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setCurrentTimeRange(newRange);
    console.log('📊 Nouvelle plage temporelle sélectionnée:', {
      unit: newRange.unit,
      startDate: newRange.startDate.toLocaleDateString('fr-FR'),
      endDate: newRange.endDate.toLocaleDateString('fr-FR'),
    });
  };

  // Gérer la sélection de dates personnalisées
  const handleCustomDateSelect = (startDate: Date, endDate: Date) => {
    console.log('📅 Dates personnalisées sélectionnées:', {
      startDate: startDate.toLocaleDateString('fr-FR'),
      endDate: endDate.toLocaleDateString('fr-FR'),
    });
  };


  // Gérer la suppression d'un filtre spécifique (avec support pour retrait individuel dans les arrays)
  const handleRemoveFilter = (filterType: keyof StatisticsFilters, itemId?: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'cultures' && itemId) {
        // Retirer une culture spécifique de l'array
        const newCultures = prev.cultures?.filter(c => c.id !== itemId) || [];
        if (newCultures.length > 0) {
          newFilters.cultures = newCultures;
        } else {
          delete newFilters.cultures;
        }
        // Synchroniser l'état local
        setSelectedCultures(newCultures);
      } else if (filterType === 'plots' && itemId) {
        // Retirer une parcelle spécifique de l'array
        const newPlots = prev.plots?.filter(p => p.id !== itemId) || [];
        if (newPlots.length > 0) {
          newFilters.plots = newPlots;
        } else {
          delete newFilters.plots;
        }
        // Synchroniser l'état local
        setSelectedPlots(newPlots);
      } else {
        // Retirer le filtre entier (pour les filtres non-array)
        delete newFilters[filterType];
        // Synchroniser les états locaux si nécessaire
        if (filterType === 'cultures') {
          setSelectedCultures([]);
        } else if (filterType === 'plots') {
          setSelectedPlots([]);
        }
      }
      
      return newFilters;
    });
    console.log('🗑️ Filtre supprimé:', filterType, itemId ? `(item: ${itemId})` : '');
  };

  // Gérer l'effacement de tous les filtres
  const handleClearAllFilters = () => {
    setActiveFilters({});
    setSelectedCultures([]);
    setSelectedPlots([]);
    console.log('🧹 Tous les filtres effacés');
  };

  // Gérer la réinitialisation de la plage temporelle vers la semaine actuelle
  const handleTimeRangeReset = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToMonday);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    setCurrentTimeRange({
      startDate,
      endDate,
      unit: 'semaine',
    });
    
    console.log('🔄 Plage temporelle réinitialisée vers la semaine actuelle');
  };

  // Fonction pour récupérer les données du graphique selon le type sélectionné
  const fetchChartData = async () => {
    if (!activeFarm?.farm_id) {
      console.log('ℹ️ [STATS-SCREEN] No active farm - skipping chart data fetch');
      return;
    }

    try {
      setChartLoading(true);
      setChartError(null);

      console.log('📊 [STATS-SCREEN] Fetching chart data for farm:', activeFarm.farm_id, 'chart type:', selectedChartType);

      // Préparer les filtres pour le service (conversion des arrays)
      // Extraire les IDs numériques depuis CultureDropdownItem (format: "culture-123" ou "variety-456")
      const extractCultureId = (cultureItem: { id: string; culture?: { id: number }; variety?: { id: number } }): number | null => {
        if (cultureItem.culture) {
          return cultureItem.culture.id;
        }
        if (cultureItem.variety) {
          return cultureItem.variety.id;
        }
        // Fallback: extraire depuis le format "culture-123" ou "variety-456"
        const match = cultureItem.id.match(/(?:culture|variety)-(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const taskFilters = {
        farmId: activeFarm.farm_id,
        startDate: currentTimeRange.startDate,
        endDate: currentTimeRange.endDate,
        plotIds: activeFilters.plots && activeFilters.plots.length > 0 
          ? activeFilters.plots.map(p => typeof p.id === 'number' ? p.id : parseInt(p.id, 10)).filter((id): id is number => !isNaN(id))
          : undefined,
        cultureIds: activeFilters.cultures && activeFilters.cultures.length > 0
          ? activeFilters.cultures.map(extractCultureId).filter((id): id is number => id !== null)
          : undefined,
      };

      let data: PieChartData[] | BarChartData[] = [];

      // Charger les données selon le type de graphique
      switch (selectedChartType) {
        case 'workTimeByCategory': {
          const statistics = await TaskService.getTaskStatistics(taskFilters);
          data = statistics.map(stat => ({
            name: getCategoryDisplayName(stat.category),
            value: Math.round(stat.totalDuration / 60 * 100) / 100,
            color: stat.color,
          }));
          break;
        }
        case 'workTimeByCulture': {
          data = await StatisticsService.getWorkTimeByCulture(taskFilters);
          break;
        }
        case 'workTimeByTask': {
          // Utiliser la première culture sélectionnée pour le filtre par tâche
          const cultureName = activeFilters.cultures && activeFilters.cultures.length > 0
            ? activeFilters.cultures[0].label
            : undefined;
          data = await StatisticsService.getWorkTimeByTask(taskFilters, cultureName);
          break;
        }
        case 'workTimeByPlot': {
          data = await StatisticsService.getWorkTimeByPlot(taskFilters);
          break;
        }
        case 'workTimeOverTimeByCulture': {
          // Determine groupBy from currentTimeRange
          let groupBy: 'day' | 'week' | 'month' = 'week';
          if (currentTimeRange.unit === 'jour') groupBy = 'day';
          else if (currentTimeRange.unit === 'mois' || currentTimeRange.unit === '3mois' || currentTimeRange.unit === '6mois') groupBy = 'month';
          
          data = await StatisticsService.getWorkTimeOverTimeByCulture(taskFilters, groupBy);
          break;
        }
        case 'harvestByCulture': {
          data = await StatisticsService.getHarvestByCulture(taskFilters);
          break;
        }
        default:
          console.warn('⚠️ [STATS-SCREEN] Unknown chart type:', selectedChartType);
          data = [];
      }

      setChartData(data);

      console.log('✅ [STATS-SCREEN] Chart data loaded:', {
        chartType: selectedChartType,
        dataPoints: data.length,
      });

    } catch (error) {
      console.error('❌ [STATS-SCREEN] Error fetching chart data:', error);
      setChartError('Erreur lors du chargement des statistiques');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  // Fonction utilitaire pour obtenir le nom d'affichage des catégories
  const getCategoryDisplayName = (category: string): string => {
    const names: Record<string, string> = {
      'production': 'Production',
      'marketing': 'Marketing',
      'administratif': 'Administratif',
      'general': 'Général',
    };
    return names[category] || category;
  };

  // Effet pour charger les données quand les filtres, la plage temporelle ou le type de graphique changent
  useEffect(() => {
    fetchChartData();
  }, [currentTimeRange, activeFilters, activeFarm?.farm_id, user?.id, selectedChartType]);


  // Gestion des états avant l'affichage principal
  if (farmLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="body" color={colors.text.secondary}>
            Chargement de votre ferme...
          </Text>
        </View>
      </View>
    );
  }

  if (farmError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Erreur
          </Text>
          <Text variant="body" color={colors.text.secondary} style={{ textAlign: 'center' }}>
            {farmError}
          </Text>
        </View>
      </View>
    );
  }

  if (needsSetup) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Bienvenue !
          </Text>
          <Text variant="body" color={colors.text.secondary} style={{ textAlign: 'center', marginBottom: spacing.lg }}>
            Vous devez d'abord créer une ferme pour voir vos statistiques.
          </Text>
          <Text variant="caption" color={colors.text.tertiary} style={{ textAlign: 'center' }}>
            Rendez-vous dans l'onglet Fermes pour commencer.
          </Text>
        </View>
      </View>
    );
  }

  if (!activeFarm) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Aucune ferme sélectionnée
          </Text>
          <Text variant="body" color={colors.text.secondary} style={{ textAlign: 'center' }}>
            Veuillez sélectionner une ferme pour voir les statistiques.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Navigateur temporel */}
        <TimeNavigator
          currentRange={currentTimeRange}
          onRangeChange={handleTimeRangeChange}
          onCustomDateSelect={handleCustomDateSelect}
          style={styles.timeNavigator}
        />

        {/* Graphique en premier */}
        <View style={styles.content}>
          <InterfaceTourTarget targetId="stats.chart.selector">
            <ChartSelector
              selectedChart={selectedChartType}
              onChartChange={setSelectedChartType}
              style={styles.chartSelector}
            />
          </InterfaceTourTarget>

          <StatisticsChartWrapper
            chartType={selectedChartType}
            data={chartData}
            filters={{
              farmId: activeFarm.farm_id,
              startDate: currentTimeRange.startDate,
              endDate: currentTimeRange.endDate,
              plotIds: activeFilters.plots && activeFilters.plots.length > 0 
                ? activeFilters.plots.map(p => typeof p.id === 'number' ? p.id : parseInt(p.id, 10)).filter((id): id is number => !isNaN(id))
                : undefined,
              cultureIds: activeFilters.cultures && activeFilters.cultures.length > 0
                ? activeFilters.cultures.map(c => {
                    if (c.culture) return c.culture.id;
                    if (c.variety) return c.variety.id;
                    const match = c.id.match(/(?:culture|variety)-(\d+)/);
                    return match ? parseInt(match[1], 10) : null;
                  }).filter((id): id is number => id !== null)
                : undefined,
            }}
            loading={chartLoading}
            error={chartError}
          />
        </View>

        {/* Filtres sous le graphique : chips puis culture / parcelle */}
        <FilterChips
          filters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
          timeRange={currentTimeRange}
          onTimeRangeReset={handleTimeRangeReset}
          style={styles.filterChipsBelowChart}
        />

        <View style={styles.filtersSection}>
          <View style={styles.filtersContent}>
              <View style={{ flexDirection: 'column', gap: 0, marginBottom: spacing.sm }}>
                <Text variant="label" style={{ marginBottom: spacing.xs }}>
                  Culture & Parcelle
                </Text>
                <InterfaceTourTarget targetId="stats.filter.culture">
                  <CultureDropdownSelector
                    placeholder="Sélectionner une culture"
                    selectedItem={null}
                    onSelectionChange={handleCultureChange}
                    farmId={activeFarm?.farm_id}
                    allowVarieties={false}
                    searchable={true}
                    useUserPreferences={true}
                    referencedPlantNames={referencedPlantNamesForDropdown}
                    clearFieldAfterSelect
                    style={{ marginBottom: spacing.xs }}
                  />
                </InterfaceTourTarget>
                <DropdownSelector
                  placeholder="Sélectionner une parcelle"
                  items={plotDropdownItems}
                  selectedItems={[]}
                  onSelectionChange={handlePlotChange}
                  multiSelect={false}
                  searchable={false}
                  filterable={false}
                  disabled={loadingPlots}
                  style={{ marginBottom: 0 }}
                />
              </View>

              {plotsError && (
                <View style={{
                  backgroundColor: colors.semantic.error + '10',
                  padding: spacing.md,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.semantic.error + '30',
                  marginTop: spacing.md,
                }}>
                  <Text variant="body" color={colors.semantic.error}>
                    {plotsError}
                  </Text>
                </View>
              )}
          </View>
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  timeNavigator: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chartSelector: {
    marginBottom: spacing.md,
  },
  filterChipsBelowChart: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  placeholder: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
  },
  placeholderText: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  placeholderList: {
    textAlign: 'left',
    lineHeight: 20,
  },
  filtersSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  filtersContent: {
    paddingTop: 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});

export default StatisticsScreen;
