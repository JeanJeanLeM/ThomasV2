import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { PieChart, type PieChartData } from './PieChart';
import { BarChart, type BarChartData } from './BarChart';
import type { ChartType } from '../../../config/chartConfig';
import { getChartConfig } from '../../../config/chartConfig';
import type { TaskStatisticsFilters } from '../../../services/TaskService';

export interface StatisticsChartWrapperProps {
  chartType: ChartType;
  data: PieChartData[] | BarChartData[];
  filters: TaskStatisticsFilters;
  loading?: boolean;
  error?: string | null;
  onChartTypeChange?: (type: ChartType) => void;
}

export const StatisticsChartWrapper: React.FC<StatisticsChartWrapperProps> = ({
  chartType,
  data,
  filters,
  loading = false,
  error = null,
  onChartTypeChange,
}) => {
  const config = getChartConfig(chartType);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text variant="body" color={colors.text.secondary} style={styles.loadingText}>
          Chargement des données...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text variant="body" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  // Empty data state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <View style={styles.container}>
        <Text variant="h4" color={colors.text.primary} style={styles.title}>
          {config.title}
        </Text>
        <View style={styles.emptyContainer}>
          <Text variant="body" color={colors.text.tertiary} style={styles.emptyText}>
            Aucune donnée disponible pour cette période
          </Text>
          <Text variant="caption" color={colors.text.tertiary} style={styles.emptyHint}>
            • Ajoutez des tâches avec une durée{'\n'}
            • Vérifiez les filtres appliqués{'\n'}
            • Changez la période sélectionnée
          </Text>
        </View>
      </View>
    );
  }

  // Render the appropriate chart
  if (config.chartType === 'pie') {
    const pieData = data as PieChartData[];
    return (
      <PieChart
        data={pieData}
        title={config.title}
        subtitle={`${pieData.length} ${pieData.length === 1 ? 'élément' : 'éléments'}`}
        formatValue={(value) => {
          if (chartType === 'harvestByCulture') {
            // For harvest, show quantity with unit
            return `${value}`;
          }
          return `${value}h`;
        }}
        showValues={true}
      />
    );
  } else {
    const barData = data as BarChartData[];
    return (
      <BarChart
        data={barData}
        title={config.title}
        subtitle={`${barData.length} ${barData.length === 1 ? 'période' : 'périodes'}`}
        xAxisLabel="Temps"
        yAxisLabel="Durée de travail (h)"
        formatValue={(value) => `${value}h`}
        showLegend={true}
      />
    );
  }
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    marginTop: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  emptyHint: {
    textAlign: 'left',
    lineHeight: 20,
  },
});
