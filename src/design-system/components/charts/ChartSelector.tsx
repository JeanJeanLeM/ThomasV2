import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';
import type { ChartType } from '../../../config/chartConfig';
import { CHART_CONFIG, getChartConfig } from '../../../config/chartConfig';

export interface ChartSelectorProps {
  selectedChart: ChartType;
  onChartChange: (chart: ChartType) => void;
  availableCharts?: ChartType[]; // Pour filtrer selon les données
  style?: any;
}

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  selectedChart,
  onChartChange,
  availableCharts,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const config = getChartConfig(selectedChart);
  const chartsToShow = availableCharts || (Object.keys(CHART_CONFIG) as ChartType[]);

  const handleSelectChart = (chartType: ChartType) => {
    onChartChange(chartType);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={config.icon as any}
          size={20}
          color={colors.primary[600]}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text variant="body" color={colors.text.primary} weight="medium">
            {config.title}
          </Text>
          <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
            {config.description}
          </Text>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text variant="h3" color={colors.text.primary}>
                Sélectionner un graphique
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close-outline"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {chartsToShow.map((chartType) => {
                const chartConfig = getChartConfig(chartType);
                const isSelected = chartType === selectedChart;

                return (
                  <TouchableOpacity
                    key={chartType}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected
                    ]}
                    onPress={() => handleSelectChart(chartType)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={chartConfig.icon as any}
                      size={20}
                      color={isSelected ? colors.primary[600] : colors.text.secondary}
                      style={styles.optionIcon}
                    />
                    <View style={styles.optionTextContainer}>
                      <Text
                        variant="body"
                        color={isSelected ? colors.primary[600] : colors.text.primary}
                        weight={isSelected ? 'medium' : 'regular'}
                      >
                        {chartConfig.title}
                      </Text>
                      <Text
                        variant="caption"
                        color={colors.text.secondary}
                        numberOfLines={2}
                      >
                        {chartConfig.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary[600]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  icon: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  optionSelected: {
    backgroundColor: colors.primary[50],
  },
  optionIcon: {
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
});
