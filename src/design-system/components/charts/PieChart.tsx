import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartData[];
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

const { width: screenWidth } = Dimensions.get('window');

// Helper function to create pie slice paths
const createPieSlice = (centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) => {
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  const x1 = centerX + radius * Math.cos(startAngleRad);
  const y1 = centerY + radius * Math.sin(startAngleRad);
  const x2 = centerX + radius * Math.cos(endAngleRad);
  const y2 = centerY + radius * Math.sin(endAngleRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  subtitle,
  width = screenWidth - spacing.lg * 2,
  height = 280,
  showValues = true,
  formatValue = (value) => `${value}h`
}) => {

  // Filter out data with zero values
  const filteredData = data.filter(item => item.value > 0);

  if (filteredData.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        {title && (
          <Text variant="h4" color={colors.text.primary} style={styles.title}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text variant="body" color={colors.text.secondary} style={styles.subtitle}>
            {subtitle}
          </Text>
        )}
        <View style={styles.emptyContainer}>
          <Text variant="body" color={colors.text.tertiary}>
            Aucune donnée disponible pour cette période
          </Text>
        </View>
      </View>
    );
  }

  // Calculate total for percentages
  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  // Calculate pie slices with responsive radius
  const centerX = width / 2;
  const centerY = (height - 60) / 2;
  // Utiliser 85% de l'espace disponible au lieu de 20px de marge fixe
  // Cela rend le rayon plus grand et plus responsive
  const availableRadius = Math.min(centerX, centerY);
  const radius = availableRadius * 0.85;

  let currentAngle = -90; // Start from top

  const pieSlices = filteredData.map((item) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const path = createPieSlice(centerX, centerY, radius, startAngle, endAngle);

    currentAngle = endAngle;

    return {
      ...item,
      path,
    };
  });

  return (
    <View style={styles.container}>
      {title && (
        <Text variant="h4" color={colors.text.primary} style={styles.title}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text variant="body" color={colors.text.secondary} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}

      <View style={styles.chartContainer}>
        <Svg width={width} height={height - 60}>
          <G>
            {pieSlices.map((slice, index) => (
              <Path
                key={index}
                d={slice.path}
                fill={slice.color}
                stroke={colors.border.primary}
                strokeWidth={1}
              />
            ))}
          </G>
        </Svg>

        {showValues && (
          <View style={styles.valuesContainer}>
            {filteredData.map((item, index) => (
              <View key={index} style={styles.valueItem}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text variant="caption" color={colors.text.secondary} style={styles.valueLabel}>
                  {item.name}:
                </Text>
                <Text variant="caption" color={colors.text.primary} weight="semibold">
                  {formatValue(item.value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
  },
  valuesContainer: {
    marginTop: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  valueLabel: {
    flex: 1,
    marginRight: spacing.sm,
  },
});