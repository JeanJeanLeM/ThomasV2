import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import type { ConversionData } from '../cards/ConversionCardMinimal';

export interface ConversionFiltersProps {
  selectedCategory: ConversionData['category'] | 'all';
  onCategoryChange: (category: ConversionData['category'] | 'all') => void;
  selectedStatus: 'all' | 'active' | 'inactive';
  onStatusChange: (status: 'all' | 'active' | 'inactive') => void;
  conversions: ConversionData[];
}

// Combinaison des filtres en une seule ligne
const ALL_FILTERS = [
  // Filtres de statut en premier
  { type: 'status', value: 'all', label: 'Tous', color: colors.gray[600] },
  { type: 'status', value: 'active', label: 'Actifs', color: colors.semantic.success },
  { type: 'status', value: 'inactive', label: 'Inactifs', color: colors.gray[500] },
  // Séparateur visuel
  { type: 'separator', value: 'separator', label: '|', color: colors.gray[300] },
  // Filtres de catégorie
  { type: 'category', value: 'recolte', label: 'Récolte', color: colors.semantic.success },
  { type: 'category', value: 'intrant', label: 'Intrant', color: colors.semantic.warning },
  { type: 'category', value: 'custom', label: 'Personnalisé', color: colors.gray[600] },
] as const;

export const ConversionFilters: React.FC<ConversionFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  conversions,
}) => {
  const getCountForCategory = (category: ConversionData['category'] | 'all') => {
    if (category === 'all') return conversions.length;
    return conversions.filter(conv => conv.category === category).length;
  };

  const getCountForStatus = (status: 'all' | 'active' | 'inactive') => {
    if (status === 'all') return conversions.length;
    if (status === 'active') return conversions.filter(conv => conv.isActive !== false).length;
    return conversions.filter(conv => conv.isActive === false).length;
  };

  return (
    <View style={styles.container}>
      {/* Une seule ligne de filtres combinés */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ALL_FILTERS.map((filter) => {
          // Séparateur visuel
          if (filter.type === 'separator') {
            return (
              <View key={filter.value} style={styles.separator}>
                <Text variant="caption" color={colors.gray[400]}>
                  {filter.label}
                </Text>
              </View>
            );
          }

          // Calculer le count selon le type de filtre
          let count = 0;
          let isSelected = false;

          if (filter.type === 'status') {
            count = getCountForStatus(filter.value as 'all' | 'active' | 'inactive');
            isSelected = selectedStatus === filter.value;
          } else if (filter.type === 'category') {
            count = getCountForCategory(filter.value as ConversionData['category']);
            isSelected = selectedCategory === filter.value;
          }

          // Ne pas afficher les catégories sans éléments
          if (filter.type === 'category' && count === 0) return null;
          
          return (
            <TouchableOpacity
              key={`${filter.type}-${filter.value}`}
              style={[
                styles.filterChip,
                filter.type === 'status' && styles.statusChip,
                isSelected && {
                  backgroundColor: filter.color,
                  borderColor: filter.color,
                },
              ]}
              onPress={() => {
                if (filter.type === 'status') {
                  onStatusChange(filter.value as 'all' | 'active' | 'inactive');
                } else if (filter.type === 'category') {
                  onCategoryChange(filter.value as ConversionData['category']);
                }
              }}
            >
              <Text
                variant="caption"
                weight="medium"
                color={isSelected ? colors.text.inverse : colors.text.secondary}
              >
                {filter.label}
              </Text>
              
              {count > 0 && (
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
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
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
  statusChip: {
    backgroundColor: colors.gray[100],
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
