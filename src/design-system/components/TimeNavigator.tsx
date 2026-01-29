import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { DateRangePicker } from './DateRangePicker';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Ionicons } from '@expo/vector-icons';

export type TimeUnit = 'jour' | 'semaine' | 'mois' | '3mois' | '6mois' | '1an' | 'libre';

export interface TimeRange {
  startDate: Date;
  endDate: Date;
  unit: TimeUnit;
}

export interface TimeNavigatorProps {
  currentRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onCustomDateSelect?: (startDate: Date, endDate: Date) => void;
  style?: ViewStyle;
}

export const TimeNavigator: React.FC<TimeNavigatorProps> = ({
  currentRange,
  onRangeChange,
  onCustomDateSelect,
  style,
}) => {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Options de durée disponibles (format court)
  const durationOptions = [
    { id: 'jour', label: '1j', fullLabel: '1 jour' },
    { id: 'semaine', label: '1s', fullLabel: '1 semaine' },
    { id: 'mois', label: '1m', fullLabel: '1 mois' },
    { id: '3mois', label: '3m', fullLabel: '3 mois' },
    { id: '6mois', label: '6m', fullLabel: '6 mois' },
    { id: '1an', label: '1a', fullLabel: '1 an' },
    { id: 'libre', label: 'Libre', fullLabel: 'Période libre' },
  ];

  // Calculer la plage de dates basée sur l'unité et la date actuelle
  const calculateDateRange = (unit: TimeUnit, referenceDate: Date = new Date()): TimeRange => {
    const startDate = new Date(referenceDate);
    const endDate = new Date(referenceDate);

    switch (unit) {
      case 'jour':
        // Même jour
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'semaine':
        // Semaine courante (lundi à dimanche)
        const dayOfWeek = startDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dimanche = 0, donc 6 jours en arrière
        startDate.setDate(startDate.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'mois':
        // Mois courant
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0); // Dernier jour du mois
        endDate.setHours(23, 59, 59, 999);
        break;
      case '3mois':
        // 3 derniers mois
        startDate.setMonth(startDate.getMonth() - 2);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '6mois':
        // 6 derniers mois
        startDate.setMonth(startDate.getMonth() - 5);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '1an':
        // 12 derniers mois
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'libre':
        // Garder les dates actuelles pour le mode libre
        return { startDate: currentRange.startDate, endDate: currentRange.endDate, unit };
    }

    return { startDate, endDate, unit };
  };

  // Navigation vers la période précédente
  const navigatePrevious = () => {
    if (currentRange.unit === 'libre') return;

    const referenceDate = new Date(currentRange.startDate);
    
    switch (currentRange.unit) {
      case 'jour':
        referenceDate.setDate(referenceDate.getDate() - 1);
        break;
      case 'semaine':
        referenceDate.setDate(referenceDate.getDate() - 7);
        break;
      case 'mois':
        referenceDate.setMonth(referenceDate.getMonth() - 1);
        break;
      case '3mois':
        referenceDate.setMonth(referenceDate.getMonth() - 3);
        break;
      case '6mois':
        referenceDate.setMonth(referenceDate.getMonth() - 6);
        break;
      case '1an':
        referenceDate.setFullYear(referenceDate.getFullYear() - 1);
        break;
    }

    const newRange = calculateDateRange(currentRange.unit, referenceDate);
    onRangeChange(newRange);
  };

  // Navigation vers la période suivante
  const navigateNext = () => {
    if (currentRange.unit === 'libre') return;

    const referenceDate = new Date(currentRange.startDate);
    
    switch (currentRange.unit) {
      case 'jour':
        referenceDate.setDate(referenceDate.getDate() + 1);
        break;
      case 'semaine':
        referenceDate.setDate(referenceDate.getDate() + 7);
        break;
      case 'mois':
        referenceDate.setMonth(referenceDate.getMonth() + 1);
        break;
      case '3mois':
        referenceDate.setMonth(referenceDate.getMonth() + 3);
        break;
      case '6mois':
        referenceDate.setMonth(referenceDate.getMonth() + 6);
        break;
      case '1an':
        referenceDate.setFullYear(referenceDate.getFullYear() + 1);
        break;
    }

    const newRange = calculateDateRange(currentRange.unit, referenceDate);
    onRangeChange(newRange);
  };

  // Gérer le changement d'unité de temps
  const handleUnitChange = (newUnit: TimeUnit) => {
    if (newUnit === 'libre') {
      setShowCustomDatePicker(true);
      return;
    }

    const newRange = calculateDateRange(newUnit);
    onRangeChange(newRange);
  };

  // Gérer la sélection de dates personnalisées
  const handleCustomDateSelect = (startDate: Date, endDate: Date) => {
    const customRange: TimeRange = {
      startDate,
      endDate,
      unit: 'libre',
    };
    onRangeChange(customRange);
    setShowCustomDatePicker(false);
    
    // Callback optionnel pour informer le parent
    if (onCustomDateSelect) {
      onCustomDateSelect(startDate, endDate);
    }
  };

  // Formater la plage de dates pour l'affichage
  const formatDateRange = useMemo(() => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const formatMonth = (date: Date) => {
      return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
    };

    const formatWeek = (startDate: Date, endDate: Date) => {
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      const month = startDate.toLocaleDateString('fr-FR', { month: 'long' });
      const year = startDate.getFullYear();
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDay}-${endDay} ${month} ${year}`;
      } else {
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      }
    };

    switch (currentRange.unit) {
      case 'jour':
        return formatDate(currentRange.startDate);
      case 'semaine':
        return formatWeek(currentRange.startDate, currentRange.endDate);
      case 'mois':
        return formatMonth(currentRange.startDate);
      case '3mois':
      case '6mois':
      case '1an':
      case 'libre':
        return `${formatDate(currentRange.startDate)} - ${formatDate(currentRange.endDate)}`;
      default:
        return '';
    }
  }, [currentRange]);

  // Styles
  const containerStyle: ViewStyle = {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  };

  const durationSelectorStyle: ViewStyle = {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  };

  const durationButtonStyle = (isSelected: boolean): ViewStyle => ({
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginHorizontal: spacing.xs,
    backgroundColor: isSelected ? colors.primary[600] : colors.gray[100],
    borderWidth: 1,
    borderColor: isSelected ? colors.primary[600] : colors.gray[300],
    minWidth: 50,
    alignItems: 'center',
  });

  const dateNavigationStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  };

  const navigationButtonStyle: ViewStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  };

  const disabledButtonStyle: ViewStyle = {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
  };

  const dateDisplayStyle: ViewStyle = {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  };

  const isNavigationDisabled = currentRange.unit === 'libre';

  return (
    <View style={[containerStyle, style]}>
      {/* Sélecteur de durée scrollable en haut */}
      <View style={durationSelectorStyle}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.sm,
          }}
        >
          {durationOptions.map((option) => {
            const isSelected = currentRange.unit === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={durationButtonStyle(isSelected)}
                onPress={() => handleUnitChange(option.id as TimeUnit)}
                activeOpacity={0.7}
              >
                <Text
                  variant="body"
                  color={isSelected ? colors.text.inverse : colors.text.primary}
                  weight={isSelected ? 'semibold' : 'medium'}
                  style={{ fontSize: 14 }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Navigation de dates en bas */}
      <View style={dateNavigationStyle}>
        {/* Flèche gauche */}
        <TouchableOpacity
          style={[
            navigationButtonStyle,
            isNavigationDisabled && disabledButtonStyle,
          ]}
          onPress={navigatePrevious}
          disabled={isNavigationDisabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back-outline"
            size={20}
            color={isNavigationDisabled ? colors.gray[400] : colors.gray[700]}
          />
        </TouchableOpacity>

        {/* Affichage de la plage de dates (cliquable) */}
        <TouchableOpacity
          style={dateDisplayStyle}
          onPress={() => setShowCustomDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text
            variant="h4"
            color={colors.text.primary}
            align="center"
            weight="semibold"
            style={{ fontSize: 16 }}
          >
            {formatDateRange}
          </Text>
          <Text
            variant="caption"
            color={colors.text.tertiary}
            align="center"
            style={{ marginTop: 2 }}
          >
            Toucher pour personnaliser
          </Text>
        </TouchableOpacity>

        {/* Flèche droite */}
        <TouchableOpacity
          style={[
            navigationButtonStyle,
            isNavigationDisabled && disabledButtonStyle,
          ]}
          onPress={navigateNext}
          disabled={isNavigationDisabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-forward-outline"
            size={20}
            color={isNavigationDisabled ? colors.gray[400] : colors.gray[700]}
          />
        </TouchableOpacity>
      </View>

      {/* DatePicker modal pour l'option "Libre" */}
      <DateRangePicker
        visible={showCustomDatePicker}
        onClose={() => setShowCustomDatePicker(false)}
        onDateRangeSelect={handleCustomDateSelect}
        initialStartDate={currentRange.unit === 'libre' ? currentRange.startDate : undefined}
        initialEndDate={currentRange.unit === 'libre' ? currentRange.endDate : undefined}
        title="Sélectionner une période"
      />
    </View>
  );
};
