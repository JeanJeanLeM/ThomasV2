import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal as RNModal, Pressable } from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5; // Nombre d'items visibles dans la colonne
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  value: string; // Format: "HH:MM:SS"
  onChange: (time: string) => void;
  style?: any;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function PickerColumn({
  items,
  selected,
  onSelect,
  label,
  format,
}: {
  items: number[];
  selected: number;
  onSelect: (val: number) => void;
  label: string;
  format: (n: number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = items.indexOf(selected);

  // Auto-scroll to selected item when modal opens
  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, selectedIndex * ITEM_HEIGHT - ITEM_HEIGHT * 2),
          animated: false,
        });
      }, 50);
    }
  }, []);

  return (
    <View style={styles.column}>
      <Text style={styles.columnLabel}>{label}</Text>
      <View style={styles.columnContainer}>
        {/* Highlight de la ligne sélectionnée */}
        <View pointerEvents="none" style={styles.selectionHighlight} />
        <ScrollView
          ref={scrollRef}
          style={styles.columnScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={styles.columnContent}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
        >
          {/* Padding top pour centrer le premier item */}
          <View style={{ height: ITEM_HEIGHT * 2 }} />
          {items.map((item) => {
            const isSelected = item === selected;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.item, isSelected && styles.itemSelected]}
                onPress={() => {
                  onSelect(item);
                  // Scroll to center the selected item
                  const idx = items.indexOf(item);
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, idx * ITEM_HEIGHT - ITEM_HEIGHT * 2),
                    animated: true,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                  {format(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Padding bottom pour centrer le dernier item */}
          <View style={{ height: ITEM_HEIGHT * 2 }} />
        </ScrollView>
      </View>
    </View>
  );
}

export function TimePicker({ value, onChange, style }: TimePickerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempHour, setTempHour] = useState(parseInt(value.split(':')[0]) || 0);
  const [tempMinute, setTempMinute] = useState(parseInt(value.split(':')[1]) || 0);

  const formatDisplay = (time: string): string => {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const handleOpen = () => {
    // Sync temp values with current value when opening
    setTempHour(parseInt(value.split(':')[0]) || 0);
    setTempMinute(parseInt(value.split(':')[1]) || 0);
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

  // Nearest available minute (rounded to 5)
  const nearestMinute = MINUTES.includes(tempMinute)
    ? tempMinute
    : MINUTES.reduce((prev, curr) =>
        Math.abs(curr - tempMinute) < Math.abs(prev - tempMinute) ? curr : prev
      );

  return (
    <>
      {/* Bouton d'affichage de l'heure */}
      <TouchableOpacity
        style={[styles.timeDisplay, style]}
        onPress={handleOpen}
        activeOpacity={0.75}
      >
        <Text style={styles.timeText}>{formatDisplay(value)}</Text>
      </TouchableOpacity>

      {/* Modal natif React Native (pas le composant Modal custom) */}
      <RNModal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Titre */}
            <Text style={styles.title}>Sélectionner l'heure</Text>

            {/* Colonnes heures / minutes */}
            <View style={styles.pickerRow}>
              <PickerColumn
                items={HOURS}
                selected={tempHour}
                onSelect={setTempHour}
                label="Heures"
                format={(n) => n.toString().padStart(2, '0')}
              />

              <View style={styles.colonSeparator}>
                <Text style={styles.colonText}>:</Text>
              </View>

              <PickerColumn
                items={MINUTES}
                selected={nearestMinute}
                onSelect={setTempMinute}
                label="Minutes"
                format={(n) => n.toString().padStart(2, '0')}
              />
            </View>

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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary[300],
    minWidth: 110,
    alignItems: 'center',
  },
  timeText: {
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: 1,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },

  // Titre
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Colonnes
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  columnContainer: {
    height: PICKER_HEIGHT,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: colors.neutral[50],
    position: 'relative',
  },
  // Bande verte qui indique la ligne sélectionnée (au centre)
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primary[600],
    borderRadius: 8,
    zIndex: 0,
  },
  columnScroll: {
    flex: 1,
  },
  columnContent: {
    alignItems: 'center',
  },

  // Items
  item: {
    height: ITEM_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  itemSelected: {
    // Fond géré par selectionHighlight
  },
  itemText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  itemTextSelected: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 22,
  },

  // Séparateur ":"
  colonSeparator: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
    marginTop: 28, // Aligner avec le contenu (label + colonne)
  },
  colonText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[400],
  },

  // Boutons
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  cancelBtnText: {
    color: colors.neutral[700],
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
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
