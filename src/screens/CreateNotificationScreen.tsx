import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  BellIcon, 
  ClockIcon,
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon
} from '../design-system/icons';
import { Text, Button, Card, TextInput, TimePicker } from '../design-system/components';
import { FormScreen } from '../design-system/components/FormScreen';
import { FormSection } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';
import { NotificationService, CreateNotificationData, UpdateNotificationData, NotificationWithLogs } from '../services/NotificationService';
import { useFarm } from '../contexts/FarmContext';

interface CreateNotificationScreenProps {
  onNavigate: (screen: 'Notifications') => void;
  editData?: {
    notification: NotificationWithLogs;
  };
}

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lundi', short: 'Lun' },
  { id: 2, name: 'Mardi', short: 'Mar' },
  { id: 3, name: 'Mercredi', short: 'Mer' },
  { id: 4, name: 'Jeudi', short: 'Jeu' },
  { id: 5, name: 'Vendredi', short: 'Ven' },
  { id: 6, name: 'Samedi', short: 'Sam' },
  { id: 0, name: 'Dimanche', short: 'Dim' },
];

const QUICK_PRESETS = [
  { name: 'Jours de semaine', days: [1, 2, 3, 4, 5] },
  { name: 'Week-end', days: [0, 6] },
  { name: 'Tous les jours', days: [0, 1, 2, 3, 4, 5, 6] },
];

export default function CreateNotificationScreen({ onNavigate, editData }: CreateNotificationScreenProps) {
  const { currentFarm } = useFarm();
  const isEditing = !!editData;
  
  const [formData, setFormData] = useState({
    title: editData?.notification.title || '',
    message: editData?.notification.message || '',
    reminder_time: editData?.notification.reminder_time || '18:00:00',
    selected_days: editData?.notification.selected_days || [1, 2, 3, 4, 5], // Default to weekdays
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Le titre doit contenir au moins 2 caractères';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Le titre ne peut pas dépasser 200 caractères';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Le message est obligatoire';
    } else if (formData.message.trim().length > 1000) {
      newErrors.message = 'Le message ne peut pas dépasser 1000 caractères';
    }

    if (formData.selected_days.length === 0) {
      newErrors.selected_days = 'Sélectionnez au moins un jour';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentFarm) return;

    try {
      setLoading(true);

      if (isEditing) {
        const updateData: UpdateNotificationData = {
          title: formData.title.trim(),
          message: formData.message.trim(),
          reminder_time: formData.reminder_time,
          selected_days: formData.selected_days,
        };
        
        await NotificationService.updateNotification(editData.notification.id, updateData);
        Alert.alert('Succès', 'Notification modifiée avec succès');
      } else {
        const createData: CreateNotificationData = {
          title: formData.title.trim(),
          message: formData.message.trim(),
          reminder_time: formData.reminder_time,
          selected_days: formData.selected_days,
          farm_id: currentFarm.id,
        };
        
        await NotificationService.createNotification(createData);
        Alert.alert('Succès', 'Notification créée avec succès');
      }

      onNavigate('Notifications');
    } catch (error) {
      console.error('Erreur sauvegarde notification:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_days: prev.selected_days.includes(dayId)
        ? prev.selected_days.filter(d => d !== dayId)
        : [...prev.selected_days, dayId].sort()
    }));
    
    // Clear error when user selects a day
    if (errors.selected_days) {
      setErrors(prev => ({ ...prev, selected_days: '' }));
    }
  };

  const handlePresetSelect = (preset: { name: string; days: number[] }) => {
    setFormData(prev => ({
      ...prev,
      selected_days: preset.days
    }));
    
    if (errors.selected_days) {
      setErrors(prev => ({ ...prev, selected_days: '' }));
    }
  };

  const handleTimeChange = (time: string) => {
    setFormData(prev => ({
      ...prev,
      reminder_time: time
    }));
  };

  const getInfoBanner = () => {
    if (isEditing) {
      return {
        text: `Modification de la notification : ${formData.title}`,
        type: 'info' as const
      };
    }
    return {
      text: "Créez des rappels personnalisés pour ne rien oublier dans votre exploitation",
      type: 'success' as const
    };
  };

  return (
    <FormScreen
      title={isEditing ? 'Modifier la notification' : 'Nouvelle notification'}
      onBack={() => onNavigate('Notifications')}
      primaryAction={{
        title: isEditing ? 'Sauvegarder' : 'Créer la notification',
        onPress: handleSubmit,
        loading: isLoading,
        disabled: !formData.title.trim() || !formData.message.trim() || formData.selected_days.length === 0,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: () => onNavigate('Notifications'),
      }}
      infoBanner={getInfoBanner()}
    >
      <FormSection 
        title="Informations de base"
        description="Titre et message de votre notification"
      >
        <EnhancedInput
          label="Titre de la notification"
          value={formData.title}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, title: text }));
            if (errors.title) {
              setErrors(prev => ({ ...prev, title: '' }));
            }
          }}
          placeholder="Ex: Rappel tâches quotidiennes"
          error={errors.title}
          maxLength={200}
          hint={`${formData.title.length}/200 caractères`}
          required
        />

        <EnhancedInput
          label="Message de la notification"
          value={formData.message}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, message: text }));
            if (errors.message) {
              setErrors(prev => ({ ...prev, message: '' }));
            }
          }}
          placeholder="Ex: N'oubliez pas d'ajouter vos tâches réalisées via le chat Thomas !"
          multiline
          numberOfLines={3}
          error={errors.message}
          maxLength={1000}
          hint={`${formData.message.length}/1000 caractères`}
          required
        />
      </FormSection>

      <FormSection 
        title="Planification"
        description="Heure et jours de rappel"
      >
        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Heure de rappel
          </Text>
          <View style={styles.timePickerContainer}>
            <ClockIcon color={colors.primary[600]} size={20} />
            <TimePicker
              value={formData.reminder_time}
              onChange={handleTimeChange}
              style={styles.timePicker}
            />
          </View>
        </View>

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Jours de rappel
          </Text>
          
          {/* Presets rapides */}
          <View style={styles.presetsContainer}>
            {QUICK_PRESETS.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.presetButton,
                  formData.selected_days.length === preset.days.length &&
                  preset.days.every(day => formData.selected_days.includes(day)) &&
                  styles.presetButtonActive
                ]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text variant="caption" style={[
                  styles.presetButtonText,
                  formData.selected_days.length === preset.days.length &&
                  preset.days.every(day => formData.selected_days.includes(day)) &&
                  styles.presetButtonTextActive
                ]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sélection individuelle des jours */}
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayButton,
                  formData.selected_days.includes(day.id) && styles.dayButtonActive
                ]}
                onPress={() => handleDayToggle(day.id)}
              >
                <Text variant="caption" style={[
                  styles.dayButtonText,
                  formData.selected_days.includes(day.id) && styles.dayButtonTextActive
                ]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {errors.selected_days && (
            <Text variant="caption" style={styles.errorText}>
              {errors.selected_days}
            </Text>
          )}
        </View>
      </FormSection>

      <FormSection 
        title="Aperçu"
        description="Prévisualisation de votre notification"
      >
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <BellIcon color={colors.primary[600]} size={16} />
            <Text variant="body2" weight="medium" style={styles.previewTitle}>
              {formData.title || 'Titre de la notification'}
            </Text>
          </View>
          <Text variant="caption" color="secondary" style={styles.previewMessage}>
            {formData.message || 'Message de la notification'}
          </Text>
          <View style={styles.previewDetails}>
            <Text variant="caption" color="secondary">
              🕐 {NotificationService.formatReminderTime(formData.reminder_time)} • 
              📅 {NotificationService.formatSelectedDays(formData.selected_days)}
            </Text>
          </View>
        </View>
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  timePicker: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  presetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  presetButtonActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  presetButtonText: {
    color: colors.neutral[600],
  },
  presetButtonTextActive: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  dayButtonText: {
    color: colors.neutral[600],
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: colors.white,
  },
  errorText: {
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },
  previewSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  previewCard: {
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewTitle: {
    marginLeft: spacing.xs,
    color: colors.neutral[900],
  },
  previewMessage: {
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  previewDetails: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});













