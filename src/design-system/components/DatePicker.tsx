import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Platform,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { CalendarIcon, ChevronDownIcon, XIcon } from '../icons';

export interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  style?: ViewStyle;
  error?: string;
  hint?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = "Sélectionner une date",
  required = false,
  disabled = false,
  minDate,
  maxDate,
  style,
  error,
  hint,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());

  // Synchroniser avec la valeur externe
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
    }
  }, [value]);

  // Formater la date pour l'affichage
  const formatDisplayDate = (date: Date | string): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Formater la date pour l'input HTML (web)
const formatDateForInput = (date: Date | string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parser une date depuis l'input HTML
  const parseDateFromInput = (dateString: string): Date => {
    const date = new Date(dateString + 'T12:00:00');
    return isNaN(date.getTime()) ? new Date() : date;
  };

  // Gérer la sélection de date
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onChange(date);
    setIsModalVisible(false);
  };

  // Gérer la sélection web directe
  const handleWebDateChange = (dateString: string) => {
    const date = parseDateFromInput(dateString);
    setSelectedDate(date);
    onChange(date);
  };

  // Styles
  const containerStyle: ViewStyle = {
    marginBottom: spacing.md,
    ...style,
  };

  const fieldStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: error ? colors.error[500] : colors.border.primary,
    borderRadius: 12,
    backgroundColor: disabled ? colors.gray[50] : colors.background.primary,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const labelStyle: TextStyle = {
    marginBottom: spacing.sm,
    color: colors.text.primary,
    fontWeight: '600',
  };

  const valueStyle: TextStyle = {
    flex: 1,
    color: value ? colors.text.primary : colors.text.secondary,
    fontSize: 16,
  };

  const errorStyle: TextStyle = {
    marginTop: spacing.xs,
    color: colors.error[500],
    fontSize: 14,
  };

  const hintStyle: TextStyle = {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    fontSize: 14,
  };

  // Composant de sélection mobile (modal avec boutons)
  const MobileDateSelector = () => {
    const [tempDate, setTempDate] = useState<Date>(selectedDate);

    const handleConfirm = () => {
      handleDateSelect(tempDate);
    };

    const handleCancel = () => {
      setTempDate(selectedDate);
      setIsModalVisible(false);
    };

    // Générer les options d'années (±10 ans)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
    
    // Générer les mois
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Générer les jours du mois sélectionné
    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const daysInMonth = getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth());
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const updateDate = (year?: number, month?: number, day?: number) => {
      const newDate = new Date(tempDate);
      if (year !== undefined) newDate.setFullYear(year);
      if (month !== undefined) newDate.setMonth(month);
      if (day !== undefined) newDate.setDate(day);
      
      // Vérifier les contraintes min/max
      if (minDate && newDate < minDate) return;
      if (maxDate && newDate > maxDate) return;
      
      setTempDate(newDate);
    };

    return (
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}>
          <View style={{
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xl,
            maxHeight: '80%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}>
              <Text variant="h3" color={colors.text.primary}>
                Sélectionner une date
              </Text>
              <TouchableOpacity onPress={handleCancel}>
                <XIcon size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Date actuelle sélectionnée */}
            <View style={{
              backgroundColor: colors.primary[50],
              padding: spacing.md,
              borderRadius: 12,
              marginBottom: spacing.lg,
              alignItems: 'center',
            }}>
              <Text variant="h4" color={colors.primary[700]}>
                {formatDisplayDate(tempDate)}
              </Text>
            </View>

            {/* Sélecteurs */}
            <View style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.xl,
            }}>
              {/* Jour */}
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ marginBottom: spacing.sm }}>Jour</Text>
                <View style={{
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                  borderRadius: 8,
                  maxHeight: 120,
                }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {days.map(day => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => updateDate(undefined, undefined, day)}
                        style={{
                          padding: spacing.sm,
                          backgroundColor: tempDate.getDate() === day ? colors.primary[100] : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        <Text 
                          variant="body"
                          color={tempDate.getDate() === day ? colors.primary[700] : colors.text.primary}
                          weight={tempDate.getDate() === day ? 'semibold' : 'normal'}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Mois */}
              <View style={{ flex: 2 }}>
                <Text variant="label" style={{ marginBottom: spacing.sm }}>Mois</Text>
                <View style={{
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                  borderRadius: 8,
                  maxHeight: 120,
                }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {months.map((month, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => updateDate(undefined, index)}
                        style={{
                          padding: spacing.sm,
                          backgroundColor: tempDate.getMonth() === index ? colors.primary[100] : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        <Text 
                          variant="body"
                          color={tempDate.getMonth() === index ? colors.primary[700] : colors.text.primary}
                          weight={tempDate.getMonth() === index ? 'semibold' : 'normal'}
                        >
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Année */}
              <View style={{ flex: 1 }}>
                <Text variant="label" style={{ marginBottom: spacing.sm }}>Année</Text>
                <View style={{
                  borderWidth: 1,
                  borderColor: colors.border.primary,
                  borderRadius: 8,
                  maxHeight: 120,
                }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {years.map(year => (
                      <TouchableOpacity
                        key={year}
                        onPress={() => updateDate(year)}
                        style={{
                          padding: spacing.sm,
                          backgroundColor: tempDate.getFullYear() === year ? colors.primary[100] : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        <Text 
                          variant="body"
                          color={tempDate.getFullYear() === year ? colors.primary[700] : colors.text.primary}
                          weight={tempDate.getFullYear() === year ? 'semibold' : 'normal'}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={{
              flexDirection: 'row',
              gap: spacing.md,
            }}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={handleCancel}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirmer"
                variant="primary"
                onPress={handleConfirm}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={containerStyle}>
      {/* Label */}
      {label && (
        <Text variant="label" style={labelStyle}>
          {label}
          {required && <Text style={{ color: colors.error[500] }}> *</Text>}
        </Text>
      )}

      {/* Champ de sélection */}
      {Platform.OS === 'web' ? (
        // Version web avec input HTML natif
        <View style={fieldStyle}>
          <input
            type="date"
            value={value ? formatDateForInput(value) : ''}
            onChange={(e) => handleWebDateChange(e.target.value)}
            disabled={disabled}
            min={minDate ? formatDateForInput(minDate) : undefined}
            max={maxDate ? formatDateForInput(maxDate) : undefined}
            style={{
              width: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 16,
              fontFamily: 'inherit',
              color: colors.text.primary,
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
          <CalendarIcon size={20} color={colors.text.secondary} />
        </View>
      ) : (
        // Version mobile avec modal
        <TouchableOpacity
          style={fieldStyle}
          onPress={() => !disabled && setIsModalVisible(true)}
          disabled={disabled}
        >
          <Text style={valueStyle}>
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <CalendarIcon size={20} color={colors.text.secondary} />
            <ChevronDownIcon size={16} color={colors.text.secondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Messages d'erreur et d'aide */}
      {error && (
        <Text style={errorStyle}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={hintStyle}>
          {hint}
        </Text>
      )}

      {/* Modal de sélection mobile */}
      {Platform.OS !== 'web' && <MobileDateSelector />}
    </View>
  );
};
