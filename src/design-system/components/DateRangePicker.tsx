import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Input } from './Input';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Ionicons } from '@expo/vector-icons';

export interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onDateRangeSelect: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  title?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  visible,
  onClose,
  onDateRangeSelect,
  initialStartDate,
  initialEndDate,
  title = "Sélectionner une période",
}) => {
  const [startDate, setStartDate] = useState<string>(
    initialStartDate ? formatDateForInput(initialStartDate) : ''
  );
  const [endDate, setEndDate] = useState<string>(
    initialEndDate ? formatDateForInput(initialEndDate) : ''
  );
  const [error, setError] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'start' | 'end' | null>(null);

  // Formater une date pour l'input HTML date (YYYY-MM-DD)
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parser une date depuis l'input HTML date
  function parseDateFromInput(dateString: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  // Valider et appliquer la sélection
  const handleApply = () => {
    setError('');

    const parsedStartDate = parseDateFromInput(startDate);
    const parsedEndDate = parseDateFromInput(endDate);

    if (!parsedStartDate) {
      setError('Veuillez sélectionner une date de début valide');
      return;
    }

    if (!parsedEndDate) {
      setError('Veuillez sélectionner une date de fin valide');
      return;
    }

    if (parsedStartDate > parsedEndDate) {
      setError('La date de début doit être antérieure à la date de fin');
      return;
    }

    // Définir les heures pour couvrir toute la journée
    parsedStartDate.setHours(0, 0, 0, 0);
    parsedEndDate.setHours(23, 59, 59, 999);

    onDateRangeSelect(parsedStartDate, parsedEndDate);
    onClose();
  };

  // Réinitialiser les valeurs à la fermeture
  const handleClose = () => {
    setError('');
    onClose();
  };

  // Styles
  const modalStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  };

  const contentStyle: ViewStyle = {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  };

  // Supprimer dateInputStyle car on n'en a plus besoin

  const buttonContainerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={modalStyle}>
        <View style={contentStyle}>
          {/* Header */}
          <View style={headerStyle}>
            <Text variant="h3" color={colors.text.primary}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                padding: spacing.xs,
                borderRadius: 20,
                backgroundColor: colors.gray[100],
              }}
            >
              <Ionicons
                name="close-outline"
                size={20}
                color={colors.gray[600]}
              />
            </TouchableOpacity>
          </View>

          {/* Sélecteurs de dates style réservation */}
          <View style={{
            flexDirection: 'row',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}>
            {/* Date de début */}
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ marginBottom: spacing.sm, color: colors.text.secondary }}>
                📅 Date de début
              </Text>
              {Platform.OS === 'web' ? (
                <View style={{
                  borderWidth: 2,
                  borderColor: focusedField === 'start' ? colors.primary[500] : colors.border.primary,
                  borderRadius: 12,
                  backgroundColor: colors.background.secondary,
                  overflow: 'hidden',
                }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onFocus={() => setFocusedField('start')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: spacing.lg,
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      color: colors.text.primary,
                      outline: 'none',
                    }}
                  />
                </View>
              ) : (
                <Input
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  containerStyle={{ marginBottom: 0 }}
                />
              )}
            </View>

            {/* Séparateur avec icône */}
            <View style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: spacing.lg,
            }}>
              <View style={{
                backgroundColor: colors.primary[100],
                borderRadius: 20,
                padding: spacing.sm,
              }}>
                <Ionicons
                  name="arrow-forward-outline"
                  size={20}
                  color={colors.primary[600]}
                />
              </View>
            </View>

            {/* Date de fin */}
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ marginBottom: spacing.sm, color: colors.text.secondary }}>
                📅 Date de fin
              </Text>
              {Platform.OS === 'web' ? (
                <View style={{
                  borderWidth: 2,
                  borderColor: focusedField === 'end' ? colors.primary[500] : colors.border.primary,
                  borderRadius: 12,
                  backgroundColor: colors.background.secondary,
                  overflow: 'hidden',
                }}>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onFocus={() => setFocusedField('end')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: spacing.lg,
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      color: colors.text.primary,
                      outline: 'none',
                    }}
                  />
                </View>
              ) : (
                <Input
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  containerStyle={{ marginBottom: 0 }}
                />
              )}
            </View>
          </View>

          {/* Raccourcis de dates populaires */}
          <View style={{
            backgroundColor: colors.gray[50],
            borderRadius: 8,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}>
            <Text variant="caption" color={colors.text.secondary} weight="medium" style={{ marginBottom: spacing.sm }}>
              Raccourcis populaires
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
            }}>
              {[
                { label: 'Aujourd\'hui', days: 0 },
                { label: '7 derniers jours', days: 7 },
                { label: '30 derniers jours', days: 30 },
                { label: '90 derniers jours', days: 90 },
              ].map((shortcut) => (
                <TouchableOpacity
                  key={shortcut.label}
                  onPress={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - shortcut.days);
                    setStartDate(formatDateForInput(start));
                    setEndDate(formatDateForInput(end));
                  }}
                  style={{
                    backgroundColor: colors.primary[100],
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.primary[200],
                  }}
                >
                  <Text variant="caption" color={colors.primary[700]} weight="medium">
                    {shortcut.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message d'erreur */}
          {error && (
            <Text variant="error" style={{ marginBottom: spacing.md }}>
              {error}
            </Text>
          )}

          {/* Boutons d'action style réservation */}
          <View style={buttonContainerStyle}>
            <Button
              title="Annuler"
              onPress={handleClose}
              variant="secondary"
              style={{ 
                flex: 1,
                borderRadius: 8,
              }}
            />
            <Button
              title="Confirmer la période"
              onPress={handleApply}
              variant="primary"
              style={{ 
                flex: 2,
                borderRadius: 8,
                backgroundColor: colors.primary[600],
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
