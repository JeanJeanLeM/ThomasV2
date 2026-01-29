import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';
import { Modal } from './Modal';

interface TimePickerProps {
  value: string; // Format: "HH:MM:SS"
  onChange: (time: string) => void;
  style?: any;
}

export function TimePicker({ value, onChange, style }: TimePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempHour, setTempHour] = useState(parseInt(value.split(':')[0]));
  const [tempMinute, setTempMinute] = useState(parseInt(value.split(':')[1]));

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const handleConfirm = () => {
    const formattedTime = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}:00`;
    onChange(formattedTime);
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    // Reset to current value
    setTempHour(parseInt(value.split(':')[0]));
    setTempMinute(parseInt(value.split(':')[1]));
    setIsModalVisible(false);
  };

  const renderTimeSelector = () => (
    <View style={styles.timeSelectorContainer}>
      <Text variant="h4" style={styles.modalTitle}>
        Sélectionner l'heure
      </Text>
      
      <View style={styles.timePickerRow}>
        {/* Hours */}
        <View style={styles.timeColumn}>
          <Text variant="body2" weight="medium" style={styles.columnLabel}>
            Heures
          </Text>
          <View style={styles.scrollContainer}>
            {Array.from({ length: 24 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.timeOption,
                  tempHour === i && styles.timeOptionSelected
                ]}
                onPress={() => setTempHour(i)}
              >
                <Text variant="body1" style={[
                  styles.timeOptionText,
                  tempHour === i && styles.timeOptionTextSelected
                ]}>
                  {i.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Separator */}
        <View style={styles.separator}>
          <Text variant="h3" style={styles.separatorText}>:</Text>
        </View>

        {/* Minutes */}
        <View style={styles.timeColumn}>
          <Text variant="body2" weight="medium" style={styles.columnLabel}>
            Minutes
          </Text>
          <View style={styles.scrollContainer}>
            {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
              <TouchableOpacity
                key={minute}
                style={[
                  styles.timeOption,
                  tempMinute === minute && styles.timeOptionSelected
                ]}
                onPress={() => setTempMinute(minute)}
              >
                <Text variant="body1" style={[
                  styles.timeOptionText,
                  tempMinute === minute && styles.timeOptionTextSelected
                ]}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={handleCancel}
        >
          <Text variant="body1" style={styles.cancelButtonText}>
            Annuler
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmButton]}
          onPress={handleConfirm}
        >
          <Text variant="body1" style={styles.confirmButtonText}>
            Confirmer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.timeDisplay, style]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text variant="body1" style={styles.timeText}>
          {formatTime(value)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        onClose={handleCancel}
        title=""
      >
        {renderTimeSelector()}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  timeDisplay: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    minWidth: 100,
    alignItems: 'center',
  },
  timeText: {
    color: colors.neutral[900],
    fontWeight: '600',
    fontSize: 18,
  },
  timeSelectorContainer: {
    padding: spacing.lg,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.neutral[900],
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    marginBottom: spacing.sm,
    color: colors.neutral[700],
  },
  scrollContainer: {
    maxHeight: 200,
    width: '100%',
  },
  timeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  timeOptionSelected: {
    backgroundColor: colors.primary[600],
  },
  timeOptionText: {
    color: colors.neutral[700],
    fontSize: 16,
  },
  timeOptionTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  separator: {
    paddingHorizontal: spacing.md,
    paddingTop: 32, // Align with time options
  },
  separatorText: {
    color: colors.neutral[500],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  confirmButton: {
    backgroundColor: colors.primary[600],
  },
  cancelButtonText: {
    color: colors.neutral[700],
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});













