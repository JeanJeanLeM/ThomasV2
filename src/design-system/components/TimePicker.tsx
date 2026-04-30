import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal as RNModal, Pressable, ScrollView } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';

interface TimePickerProps {
  value: string; // Format: "HH:MM:SS"
  onChange: (time: string) => void;
  style?: any;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function TimePicker({ value, onChange, style }: TimePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempHour, setTempHour] = useState(parseInt(value.split(':')[0]) || 0);
  const [tempMinute, setTempMinute] = useState(parseInt(value.split(':')[1]) || 0);

  const formatDisplay = (time: string): string => {
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  };

  const handleOpen = () => {
    setTempHour(parseInt(value.split(':')[0]) || 0);
    const rawMin = parseInt(value.split(':')[1]) || 0;
    // Arrondi à la minute la plus proche disponible
    const nearest = MINUTES.reduce((prev, curr) =>
      Math.abs(curr - rawMin) < Math.abs(prev - rawMin) ? curr : prev
    );
    setTempMinute(nearest);
    setIsModalVisible(true);
  };

  const handleConfirm = () => {
    const formatted = `${tempHour.toString().padStart(2, '0')}:${tempMinute.toString().padStart(2, '0')}:00`;
    onChange(formatted);
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.timeDisplay, style]}
        onPress={handleOpen}
        activeOpacity={0.75}
      >
        <Text style={styles.timeText}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      <RNModal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Aperçu heure sélectionnée */}
            <View style={styles.previewRow}>
              <Text style={styles.previewHour}>
                {tempHour.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.previewSep}>:</Text>
              <Text style={styles.previewMinute}>
                {tempMinute.toString().padStart(2, '0')}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
              {/* ── Section Heures ── */}
              <Text style={styles.sectionLabel}>Heures</Text>
              <View style={styles.grid}>
                {HOURS.map((h) => {
                  const sel = h === tempHour;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setTempHour(h)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                        {h.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Section Minutes ── */}
              <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Minutes</Text>
              <View style={styles.grid}>
                {MINUTES.map((m) => {
                  const sel = m === tempMinute;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setTempMinute(m)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Boutons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                <Text style={styles.confirmBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </RNModal>
    </>
  );
}

const styles = StyleSheet.create({
  // Bouton d'affichage
  timeDisplay: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  timeText: {
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: 1.5,
  },

  // Overlay modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 340,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  // Aperçu heure
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  previewHour: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    minWidth: 56,
    textAlign: 'center',
  },
  previewSep: {
    fontSize: 32,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginHorizontal: 4,
    paddingBottom: 4,
  },
  previewMinute: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    minWidth: 56,
    textAlign: 'center',
  },

  scroll: {
    flexGrow: 0,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },

  // Grille de chips
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    width: '13%',
    aspectRatio: 1.2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  chipSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // Boutons Annuler / Confirmer
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  cancelBtnText: {
    color: colors.gray[700],
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.primary[600],
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
