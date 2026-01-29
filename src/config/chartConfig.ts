/**
 * Configuration centralisée pour tous les types de graphiques statistiques
 */

export type ChartType = 
  | 'workTimeByCategory'      // Temps par catégorie (existant)
  | 'workTimeByCulture'       // Temps par culture
  | 'workTimeByTask'          // Temps par tâche (pour une culture)
  | 'workTimeByPlot'          // Temps par parcelle
  | 'workTimeOverTimeByCulture' // Temps dans le temps par culture (bar chart)
  | 'harvestByCulture';        // Récolte par culture

export interface ChartConfig {
  title: string;
  description: string;
  icon: string;
  requiresCulture?: boolean;
  requiresPlot?: boolean;
  chartType: 'pie' | 'bar';
}

export const CHART_CONFIG: Record<ChartType, ChartConfig> = {
  workTimeByCategory: {
    title: 'Temps par catégorie',
    description: 'Répartition du temps de travail par catégorie de tâche',
    icon: 'pie-chart-outline',
    chartType: 'pie',
  },
  workTimeByCulture: {
    title: 'Temps par culture',
    description: 'Répartition du temps de travail par culture',
    icon: 'leaf-outline',
    chartType: 'pie',
  },
  workTimeByTask: {
    title: 'Temps par tâche',
    description: 'Répartition du temps de travail par tâche (pour une culture)',
    icon: 'list-outline',
    chartType: 'pie',
    requiresCulture: true,
  },
  workTimeByPlot: {
    title: 'Temps par parcelle',
    description: 'Répartition du temps de travail par parcelle',
    icon: 'map-outline',
    chartType: 'pie',
  },
  workTimeOverTimeByCulture: {
    title: 'Évolution temporelle',
    description: 'Temps de travail dans le temps par culture (graphique empilé)',
    icon: 'bar-chart-outline',
    chartType: 'bar',
  },
  harvestByCulture: {
    title: 'Récolte par culture',
    description: 'Quantités récoltées par culture',
    icon: 'basket-outline',
    chartType: 'pie',
  },
};

/**
 * Obtenir la configuration d'un graphique
 */
export function getChartConfig(chartType: ChartType): ChartConfig {
  return CHART_CONFIG[chartType];
}

/**
 * Obtenir tous les types de graphiques disponibles
 */
export function getAllChartTypes(): ChartType[] {
  return Object.keys(CHART_CONFIG) as ChartType[];
}
