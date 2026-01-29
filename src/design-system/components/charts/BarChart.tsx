import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Rect, Text as SvgText, Line } from 'react-native-svg';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

export interface BarChartData {
  label: string;           // Date ou période (axe X)
  stacks: {                // Données empilées
    name: string;          // Nom de la tâche/culture
    value: number;         // Durée en heures
    color: string;
  }[];
}

export interface BarChartProps {
  data: BarChartData[];
  title?: string;
  subtitle?: string;
  xAxisLabel?: string;     // "Temps"
  yAxisLabel?: string;     // "Durée de travail (h)"
  width?: number;
  height?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  subtitle,
  xAxisLabel = 'Temps',
  yAxisLabel = 'Durée (h)',
  width = screenWidth - spacing.lg * 2,
  height = 300,
  formatValue = (value) => `${value}h`,
  showLegend = true,
}) => {
  // Filter out data with zero values
  const filteredData = data.filter(item => 
    item.stacks && item.stacks.length > 0 && 
    item.stacks.some(stack => stack.value > 0)
  );

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

  // Chart dimensions
  const chartPadding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - chartPadding.left - chartPadding.right;
  const chartHeight = height - chartPadding.top - chartPadding.bottom - (title ? 60 : 0) - (subtitle ? 30 : 0);

  // Calculate max value for Y axis
  const maxValue = Math.max(
    ...filteredData.map(item => 
      item.stacks.reduce((sum, stack) => sum + stack.value, 0)
    )
  );
  const yAxisMax = Math.ceil(maxValue * 1.1); // Add 10% padding

  // Calculate bar width
  const barWidth = Math.max(20, (chartWidth / filteredData.length) * 0.6);
  const barSpacing = (chartWidth / filteredData.length) - barWidth;

  // Get all unique stack names for legend
  const allStackNames = new Set<string>();
  filteredData.forEach(item => {
    item.stacks.forEach(stack => {
      if (stack.value > 0) {
        allStackNames.add(stack.name);
      }
    });
  });

  // Y axis ticks
  const yAxisTicks = 5;
  const tickValues: number[] = [];
  for (let i = 0; i <= yAxisTicks; i++) {
    tickValues.push((yAxisMax / yAxisTicks) * i);
  }

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
        <Svg width={width} height={height - (title ? 60 : 0) - (subtitle ? 30 : 0)}>
          <G>
            {/* Y Axis */}
            <Line
              x1={chartPadding.left}
              y1={chartPadding.top}
              x2={chartPadding.left}
              y2={chartPadding.top + chartHeight}
              stroke={colors.border.primary}
              strokeWidth={2}
            />

            {/* Y Axis Label */}
            <SvgText
              x={10}
              y={chartPadding.top + chartHeight / 2}
              fontSize={12}
              fill={colors.text.secondary}
              transform={`rotate(-90 10 ${chartPadding.top + chartHeight / 2})`}
              textAnchor="middle"
            >
              {yAxisLabel}
            </SvgText>

            {/* Y Axis Ticks and Labels */}
            {tickValues.map((value, index) => {
              const y = chartPadding.top + chartHeight - (value / yAxisMax) * chartHeight;
              return (
                <G key={`y-tick-${index}`}>
                  <Line
                    x1={chartPadding.left - 5}
                    y1={y}
                    x2={chartPadding.left}
                    y2={y}
                    stroke={colors.border.primary}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={chartPadding.left - 10}
                    y={y + 4}
                    fontSize={10}
                    fill={colors.text.secondary}
                    textAnchor="end"
                  >
                    {formatValue(value)}
                  </SvgText>
                </G>
              );
            })}

            {/* X Axis */}
            <Line
              x1={chartPadding.left}
              y1={chartPadding.top + chartHeight}
              x2={chartPadding.left + chartWidth}
              y2={chartPadding.top + chartHeight}
              stroke={colors.border.primary}
              strokeWidth={2}
            />

            {/* X Axis Label */}
            <SvgText
              x={chartPadding.left + chartWidth / 2}
              y={height - 10}
              fontSize={12}
              fill={colors.text.secondary}
              textAnchor="middle"
            >
              {xAxisLabel}
            </SvgText>

            {/* Bars */}
            {filteredData.map((item, barIndex) => {
              const barX = chartPadding.left + (barIndex * (barWidth + barSpacing)) + (barSpacing / 2);
              let currentY = chartPadding.top + chartHeight;
              const totalValue = item.stacks.reduce((sum, stack) => sum + stack.value, 0);

              return (
                <G key={`bar-${barIndex}`}>
                  {item.stacks
                    .filter(stack => stack.value > 0)
                    .map((stack, stackIndex) => {
                      const stackHeight = (stack.value / yAxisMax) * chartHeight;
                      const rectY = currentY - stackHeight;
                      
                      const rect = (
                        <Rect
                          key={`stack-${stackIndex}`}
                          x={barX}
                          y={rectY}
                          width={barWidth}
                          height={stackHeight}
                          fill={stack.color}
                          stroke={colors.border.primary}
                          strokeWidth={0.5}
                        />
                      );

                      currentY = rectY;
                      return rect;
                    })}

                  {/* X Axis Labels */}
                  <SvgText
                    x={barX + barWidth / 2}
                    y={chartPadding.top + chartHeight + 25}
                    fontSize={10}
                    fill={colors.text.secondary}
                    textAnchor="middle"
                  >
                    {item.label.length > 12 ? item.label.substring(0, 12) + '...' : item.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Legend */}
        {showLegend && allStackNames.size > 0 && (
          <View style={styles.legendContainer}>
            {Array.from(allStackNames).map((stackName, index) => {
              // Find color for this stack name
              let stackColor = colors.gray[400];
              for (const item of filteredData) {
                const stack = item.stacks.find(s => s.name === stackName);
                if (stack) {
                  stackColor = stack.color;
                  break;
                }
              }

              return (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColorIndicator, { backgroundColor: stackColor }]} />
                  <Text variant="caption" color={colors.text.secondary} style={styles.legendLabel}>
                    {stackName}
                  </Text>
                </View>
              );
            })}
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
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  legendColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendLabel: {
    fontSize: 12,
  },
});
