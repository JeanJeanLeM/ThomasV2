import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Ionicons } from '@expo/vector-icons';
import type { StatisticsFilters } from './modals/StatisticsFilterModal';

export interface FilterChipsProps {
  filters: StatisticsFilters;
  onRemoveFilter: (filterType: keyof StatisticsFilters, itemId?: string) => void;
  onClearAll: () => void;
  timeRange?: {
    startDate: Date;
    endDate: Date;
    unit: string;
  };
  onTimeRangeReset?: () => void;
  style?: ViewStyle;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  timeRange,
  onTimeRangeReset,
  style,
}) => {
  // Formater la plage de dates pour affichage
  const formatTimeRangeForChip = () => {
    if (!timeRange) return null;
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      });
    };

    // Si c'est la semaine actuelle, ne pas afficher de chip
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const isCurrentWeek = timeRange.unit === 'semaine' && 
      timeRange.startDate.getTime() === currentWeekStart.getTime();
    
    if (isCurrentWeek) return null;

    return `${formatDate(timeRange.startDate)} - ${formatDate(timeRange.endDate)}`;
  };

  const timeRangeLabel = formatTimeRangeForChip();

  // Créer les chips à partir des filtres actifs
  const activeFilters = [
    // Chip pour la plage temporelle (si différente de la semaine actuelle)
    timeRangeLabel && {
      type: 'timeRange' as const,
      label: timeRangeLabel,
      color: colors.secondary.purple,
      backgroundColor: colors.secondary.purple + '20',
      borderColor: colors.secondary.purple + '40',
      icon: 'calendar-outline' as const,
      itemId: undefined,
    },
    // Chip pour le filtre "mes données uniquement"
    filters.myDataOnly && {
      type: 'myDataOnly' as const,
      label: 'Mes données uniquement',
      color: colors.semantic.info,
      backgroundColor: colors.semantic.info + '20',
      borderColor: colors.semantic.info + '40',
      icon: 'person-outline' as const,
      itemId: undefined,
    },
    // Chips pour chaque culture (multi-sélection)
    ...(filters.cultures?.map(culture => ({
      type: 'cultures' as const,
      label: culture.label,
      color: colors.primary[600],
      backgroundColor: colors.primary[100],
      borderColor: colors.primary[200],
      icon: 'leaf-outline' as const,
      itemId: culture.id,
    })) || []),
    // Chips pour chaque parcelle (multi-sélection)
    ...(filters.plots?.map(plot => ({
      type: 'plots' as const,
      label: plot.label,
      color: colors.secondary.blue,
      backgroundColor: colors.secondary.blue + '20',
      borderColor: colors.secondary.blue + '40',
      icon: 'grid-outline' as const,
      itemId: plot.id,
    })) || []),
    // Chip pour l'unité de surface
    filters.surfaceUnit && {
      type: 'surfaceUnit' as const,
      label: filters.surfaceUnit.label,
      color: colors.secondary.orange,
      backgroundColor: colors.secondary.orange + '20',
      borderColor: colors.secondary.orange + '40',
      icon: 'apps-outline' as const,
      itemId: undefined,
    },
  ].filter(filter => filter && (filter.label || filter.type === 'myDataOnly')); // Garder les filtres avec label ou myDataOnly

  // Si aucun filtre actif, ne rien afficher
  if (activeFilters.length === 0) {
    return null;
  }

  const containerStyle: ViewStyle = {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...style,
  };

  const chipStyle = (filter: typeof activeFilters[0]): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: filter.backgroundColor,
    borderWidth: 1,
    borderColor: filter.borderColor,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
    maxWidth: 200, // Limiter la largeur pour éviter les débordements
  });

  const clearAllButtonStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
  };

  return (
    <View style={containerStyle}>
      {/* Header avec compteur */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
      }}>
        <Text variant="caption" color={colors.text.secondary} weight="medium">
          Filtres actifs ({activeFilters.length})
        </Text>
        
        {/* Bouton tout effacer */}
        <TouchableOpacity
          style={clearAllButtonStyle}
          onPress={onClearAll}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle-outline"
            size={14}
            color={colors.gray[600]}
            style={{ marginRight: spacing.xs }}
          />
          <Text variant="caption" color={colors.gray[700]} weight="medium">
            Tout effacer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chips des filtres */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {activeFilters.map((filter, index) => (
          <TouchableOpacity
            key={`${filter.type}-${filter.itemId || index}`}
            style={chipStyle(filter)}
            onPress={() => {
              if (filter.type === 'timeRange' && onTimeRangeReset) {
                onTimeRangeReset();
              } else if (filter.type === 'myDataOnly') {
                onRemoveFilter('myDataOnly');
              } else if (filter.type === 'cultures' && filter.itemId) {
                onRemoveFilter('cultures', filter.itemId);
              } else if (filter.type === 'plots' && filter.itemId) {
                onRemoveFilter('plots', filter.itemId);
              } else {
                onRemoveFilter(filter.type as keyof StatisticsFilters);
              }
            }}
            activeOpacity={0.7}
          >
            {/* Icône du type de filtre */}
            <Ionicons
              name={filter.icon}
              size={14}
              color={filter.color}
              style={{ marginRight: spacing.xs }}
            />
            
            {/* Label du filtre */}
            <Text
              variant="caption"
              color={filter.color}
              weight="medium"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {filter.label}
            </Text>
            
            {/* Bouton de suppression */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (filter.type === 'timeRange' && onTimeRangeReset) {
                  onTimeRangeReset();
                } else if (filter.type === 'myDataOnly') {
                  onRemoveFilter('myDataOnly');
                } else if (filter.type === 'cultures' && filter.itemId) {
                  onRemoveFilter('cultures', filter.itemId);
                } else if (filter.type === 'plots' && filter.itemId) {
                  onRemoveFilter('plots', filter.itemId);
                } else {
                  onRemoveFilter(filter.type as keyof StatisticsFilters);
                }
              }}
              style={{
                marginLeft: spacing.xs,
                padding: 2,
              }}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Ionicons
                name="close-outline"
                size={12}
                color={filter.color}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ligne de séparation subtile */}
      <View style={{
        height: 1,
        backgroundColor: colors.border.primary,
        marginTop: spacing.sm,
        opacity: 0.5,
      }} />
    </View>
  );
};
