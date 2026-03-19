import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  SearchIcon,
} from '../design-system/icons';
import {
  Text,
  Button,
  Input,
  Modal,
  RecurringTaskCardStandard,
  StandardFormModal,
  FormSection,
  RowFields,
  FieldWrapper,
  EnhancedInput,
  DropdownSelector,
} from '../design-system/components';
import type { DropdownItem } from '../design-system/components/DropdownSelector';
import type { RecurringTaskTemplate, RecurringTaskCategory, RecurringTaskFrequencyType } from '../types';
import type { PlotData } from '../design-system/components/cards/PlotCardStandard';
import {
  RecurringTaskService,
  formatRecurrence,
  type RecurringTaskCreateData,
  type RecurringTaskUpdateData,
} from '../services/RecurringTaskService';
import { ensureTasksForHorizon } from '../services/RecurringTaskGenerationService';

interface RecurringTasksSettingsScreenProps {
  onTitleChange?: (title: string | null) => void;
  onBack?: () => void;
}

const CATEGORY_OPTIONS: DropdownItem[] = [
  { id: 'production', label: 'Production' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'administratif', label: 'Administratif' },
  { id: 'general', label: 'Général' },
];

const DAY_OPTIONS: DropdownItem[] = [
  { id: '0', label: 'Dimanche' },
  { id: '1', label: 'Lundi' },
  { id: '2', label: 'Mardi' },
  { id: '3', label: 'Mercredi' },
  { id: '4', label: 'Jeudi' },
  { id: '5', label: 'Vendredi' },
  { id: '6', label: 'Samedi' },
];

const FREQUENCY_OPTIONS: DropdownItem[] = [
  { id: 'weekly', label: 'Chaque semaine' },
  { id: 'biweekly', label: 'Une semaine sur deux' },
  { id: 'monthly', label: 'Une fois par mois' },
];

const MONTH_OPTIONS: DropdownItem[] = [
  { id: '1', label: 'Janvier' }, { id: '2', label: 'Février' }, { id: '3', label: 'Mars' },
  { id: '4', label: 'Avril' }, { id: '5', label: 'Mai' }, { id: '6', label: 'Juin' },
  { id: '7', label: 'Juillet' }, { id: '8', label: 'Août' }, { id: '9', label: 'Septembre' },
  { id: '10', label: 'Octobre' }, { id: '11', label: 'Novembre' }, { id: '12', label: 'Décembre' },
];

export default function RecurringTasksSettingsScreen({ onTitleChange, onBack }: RecurringTasksSettingsScreenProps) {
  const { user } = useAuth();
  const { activeFarm, farmData, refreshFarmDataSilently } = useFarm();
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(35);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTaskTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'permanent' | 'seasonal'>('all');
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    template: RecurringTaskTemplate | null;
    isActive: boolean;
  }>({ visible: false, template: null, isActive: false });

  const loadData = async () => {
    if (!activeFarm?.farm_id) return;
    setIsLoading(true);
    try {
      await refreshFarmDataSilently(['plots']);
      const [list, hours] = await Promise.all([
        RecurringTaskService.getByFarm(activeFarm.farm_id),
        user?.id ? RecurringTaskService.getWeeklyWorkHours(user.id) : Promise.resolve(35),
      ]);
      setTemplates(list);
      setWeeklyWorkHours(hours);
      if (user?.id) {
        ensureTasksForHorizon(activeFarm.farm_id, user.id, 6).catch((e) =>
          console.warn('RecurringTasksSettings: ensureTasksForHorizon', e)
        );
      }
    } catch (e) {
      console.error('RecurringTasks load error:', e);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFarm?.farm_id, user?.id]);

  useEffect(() => {
    if (onTitleChange) {
      onTitleChange(showForm ? (editingTemplate ? 'Modifier la tâche récurrente' : 'Nouvelle tâche récurrente') : null);
    }
  }, [showForm, editingTemplate, onTitleChange]);

  const stats = useMemo(
    () => RecurringTaskService.calculateWeeklyStats(templates, weeklyWorkHours),
    [templates, weeklyWorkHours]
  );

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const isActive = t.is_active !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
      const isPermanent = t.is_permanent;
      if (typeFilter === 'permanent' && !isPermanent) return false;
      if (typeFilter === 'seasonal' && isPermanent) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [t.name, t.action ?? '', t.notes ?? ''].join(' ').toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [templates, statusFilter, typeFilter, searchQuery]);

  const handleAdd = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (template: RecurringTaskTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleToggleActive = (template: RecurringTaskTemplate) => {
    const isActive = template.is_active !== false;
    if (Platform.OS === 'web') {
      setConfirmModal({ visible: true, template, isActive });
    } else {
      Alert.alert(
        isActive ? 'Désactiver la tâche' : 'Réactiver la tâche',
        isActive ? 'La tâche sera marquée comme inactive.' : 'La tâche sera de nouveau active.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: isActive ? 'Désactiver' : 'Réactiver', onPress: () => confirmToggleActive(template, isActive) },
        ]
      );
    }
  };

  const confirmToggleActive = async (template: RecurringTaskTemplate, isActive: boolean) => {
    try {
      await RecurringTaskService.toggleActive(template.id, !isActive);
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_active: !isActive } : t))
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de modifier le statut.');
    }
    setConfirmModal({ visible: false, template: null, isActive: false });
  };

  const handleFormSubmit = async (data: RecurringTaskCreateData | RecurringTaskUpdateData) => {
    if (!activeFarm?.farm_id || !user?.id) {
      Alert.alert('Erreur', 'Ferme ou utilisateur non disponible.');
      return;
    }
    try {
      if (editingTemplate) {
        const updated = await RecurringTaskService.update(data as RecurringTaskUpdateData);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await RecurringTaskService.create({
          ...(data as RecurringTaskCreateData),
          farm_id: activeFarm.farm_id,
          user_id: user.id,
        });
        setTemplates((prev) => [...prev, created]);
      }
      setShowForm(false);
      setEditingTemplate(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement.');
    }
  };

  const activeCount = templates.filter((t) => t.is_active !== false).length;
  const inactiveCount = templates.filter((t) => t.is_active === false).length;
  const permanentCount = templates.filter((t) => t.is_permanent).length;
  const seasonalCount = templates.filter((t) => !t.is_permanent).length;

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text variant="h2" style={styles.title}>
                Tâches récurrentes
              </Text>
              <Text variant="body" style={styles.subtitle}>
                {templates.length} tâche{templates.length !== 1 ? 's' : ''} configurée{templates.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <ClipboardDocumentListIcon color={colors.secondary.purple} size={22} />
              <Text variant="h3" style={styles.summaryTitle}>
                Aperçu
              </Text>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{stats.count}</Text>
                <Text style={styles.summaryLabel}>Tâches</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>
                  {stats.totalMinutesPerWeek < 60
                    ? `${stats.totalMinutesPerWeek} min`
                    : `${Math.floor(stats.totalMinutesPerWeek / 60)}h${stats.totalMinutesPerWeek % 60 ? ` ${stats.totalMinutesPerWeek % 60}min` : ''}`}
                </Text>
                <Text style={styles.summaryLabel}>/ semaine</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{stats.coveragePercent} %</Text>
                <Text style={styles.summaryLabel}>Couverture</Text>
              </View>
            </View>
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <Input
              placeholder="Rechercher (nom, action...)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<SearchIcon color={colors.gray[400]} size={20} />}
              style={{ marginBottom: spacing.md }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {[
                { key: 'all', label: 'Tous', count: templates.length },
                { key: 'active', label: 'Actives', count: activeCount },
                { key: 'inactive', label: 'Inactives', count: inactiveCount },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f.key as typeof statusFilter)}
                >
                  <Text
                    variant="caption"
                    weight="medium"
                    style={{ color: statusFilter === f.key ? '#fff' : colors.text.secondary }}
                  >
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              ))}
              {[
                { key: 'all', label: 'Toutes' },
                { key: 'permanent', label: 'Permanentes', count: permanentCount },
                { key: 'seasonal', label: 'Saisonnières', count: seasonalCount },
              ].map((f) => (
                <TouchableOpacity
                  key={'type-' + f.key}
                  style={[styles.filterChip, typeFilter === f.key && styles.filterChipActive]}
                  onPress={() => setTypeFilter(f.key as typeof typeFilter)}
                >
                  <Text
                    variant="caption"
                    weight="medium"
                    style={{ color: typeFilter === f.key ? '#fff' : colors.text.secondary }}
                  >
                    {f.label}
                    {'count' in f && f.count !== undefined ? ` (${f.count})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
              <Text variant="body" style={styles.loadingText}>
                Chargement...
              </Text>
            </View>
          ) : (
            <>
              {filteredTemplates.map((t) => (
                <RecurringTaskCardStandard
                  key={t.id}
                  template={t}
                  onEdit={handleEdit}
                  onToggleActive={handleToggleActive}
                  showActions
                />
              ))}
              {filteredTemplates.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <ClipboardDocumentListIcon color={colors.gray[400]} size={64} />
                  <Text variant="h3" style={styles.emptyTitle}>
                    Aucune tâche récurrente
                  </Text>
                  <Text variant="body" style={styles.emptySubtitle}>
                    Créez une tâche qui se répète (ex. tous les samedis de novembre à février).
                  </Text>
                  <Button title="Créer une tâche récurrente" onPress={handleAdd} style={styles.emptyButton} />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal({ visible: false, template: null, isActive: false })}
        title={confirmModal.isActive ? 'Désactiver la tâche' : 'Réactiver la tâche'}
        size="sm"
        primaryAction={{
          title: confirmModal.isActive ? 'Désactiver' : 'Réactiver',
          onPress: () => confirmModal.template && confirmToggleActive(confirmModal.template, confirmModal.isActive),
          variant: confirmModal.isActive ? 'danger' : 'primary',
        }}
        secondaryAction={{
          title: 'Annuler',
          onPress: () => setConfirmModal({ visible: false, template: null, isActive: false }),
        }}
      >
        <View style={{ padding: spacing.md }}>
          <Text variant="body" color={colors.text.secondary}>
            {confirmModal.isActive
              ? 'La tâche sera marquée comme inactive.'
              : 'La tâche sera de nouveau active.'}
          </Text>
          {confirmModal.template && (
            <View
              style={{
                backgroundColor: colors.gray[50],
                padding: spacing.md,
                borderRadius: 8,
                marginTop: spacing.md,
                borderLeftWidth: 4,
                borderLeftColor: colors.secondary.purple,
              }}
            >
              <Text variant="h4" color={colors.text.primary} style={{ marginBottom: spacing.xs }}>
                {confirmModal.template.name}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {formatRecurrence(confirmModal.template)}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {showForm && (
        <RecurringTaskFormModal
          template={editingTemplate}
          activeFarmId={activeFarm?.farm_id ?? 0}
          plots={(farmData?.plots ?? []).filter((p) => p.is_active !== false && p.status !== 'inactive')}
          materials={(farmData?.materials ?? []).filter((m) => m.is_active !== false)}
          cultures={farmData?.cultures ?? []}
          onClose={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </>
  );
}

// --- RecurringTaskFormModal ---

interface RecurringTaskFormModalProps {
  template: RecurringTaskTemplate | null;
  activeFarmId: number;
  plots: PlotData[];
  materials: { id: number; name: string; is_active?: boolean }[];
  cultures: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (data: RecurringTaskCreateData | RecurringTaskUpdateData) => Promise<void>;
}

function RecurringTaskFormModal({
  template,
  activeFarmId,
  plots,
  materials,
  cultures,
  onClose,
  onSubmit,
}: RecurringTaskFormModalProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [durationMinutes, setDurationMinutes] = useState(template?.duration_minutes?.toString() ?? '60');
  const [durationUnit, setDurationUnit] = useState<'min' | 'h'>('min');
  const [action, setAction] = useState(template?.action ?? '');
  const [category, setCategory] = useState<DropdownItem[]>(
    template?.category ? [CATEGORY_OPTIONS.find((o) => o.id === template.category) ?? CATEGORY_OPTIONS[0]] : [CATEGORY_OPTIONS[0]]
  );
  const [culture, setCulture] = useState(template?.culture ?? '');
  const [numberOfPeople, setNumberOfPeople] = useState(template?.number_of_people?.toString() ?? '1');
  const [notes, setNotes] = useState(template?.notes ?? '');
  const [plotIds, setPlotIds] = useState<number[]>(template?.plot_ids ?? []);
  const [surfaceUnitIds, setSurfaceUnitIds] = useState<number[]>(template?.surface_unit_ids ?? []);
  const [materialIds, setMaterialIds] = useState<number[]>(template?.material_ids ?? []);
  const [isPermanent, setIsPermanent] = useState(template?.is_permanent ?? false);
  const [startMonth, setStartMonth] = useState<string>(template?.start_month?.toString() ?? '1');
  const [endMonth, setEndMonth] = useState<string>(template?.end_month?.toString() ?? '12');
  const [dayOfWeek, setDayOfWeek] = useState<DropdownItem[]>(
    template != null
      ? [DAY_OPTIONS.find((o) => o.id === String(template.day_of_week)) ?? DAY_OPTIONS[0]]
      : [DAY_OPTIONS[0]]
  );
  const [frequencyType, setFrequencyType] = useState<DropdownItem[]>(
    template?.frequency_type
      ? [FREQUENCY_OPTIONS.find((o) => o.id === template.frequency_type) ?? FREQUENCY_OPTIONS[0]]
      : [FREQUENCY_OPTIONS[0]]
  );
  const [frequencyInterval, setFrequencyInterval] = useState(template?.frequency_interval?.toString() ?? '1');
  const [saving, setSaving] = useState(false);

  const plotItems: DropdownItem[] = plots.map((p) => ({ id: p.id, label: p.name }));
  const materialItems: DropdownItem[] = materials.map((m) => ({ id: String(m.id), label: m.name }));
  const cultureItems: DropdownItem[] = cultures.map((c) => ({ id: String(c.id), label: c.name }));

  const selectedPlots = plots.filter((p) => plotIds.includes(parseInt(p.id, 10)));
  const surfaceUnitItems: DropdownItem[] = selectedPlots.flatMap((plot) =>
    (plot.surfaceUnits ?? []).map((u) => ({
      id: u.id,
      label: u.fullName ?? `${plot.name} – ${u.name}`,
    }))
  );
  const selectedSurfaceUnitItems = surfaceUnitItems.filter((u) =>
    surfaceUnitIds.includes(parseInt(u.id, 10))
  );

  const selectedPlotItems = plotItems.filter((p) => plotIds.includes(parseInt(p.id, 10)));
  const selectedMaterialItems = materialItems.filter((m) => materialIds.includes(parseInt(m.id, 10)));

  const durationDisplayValue =
    durationUnit === 'h'
      ? (() => {
          const m = parseInt(durationMinutes, 10) || 0;
          if (m === 0) return '';
          const h = m / 60;
          return h === Math.floor(h) ? String(h) : h.toFixed(1);
        })()
      : durationMinutes;

  const handleDurationChange = (text: string) => {
    if (durationUnit === 'h') {
      const hours = parseFloat(text.replace(',', '.')) || 0;
      setDurationMinutes(String(Math.max(0, Math.round(hours * 60))));
    } else {
      const m = text.replace(/\D/g, '');
      setDurationMinutes(m || '');
    }
  };

  const handlePlotSelectionChange = (items: DropdownItem[]) => {
    const newPlotIds = items.map((i) => parseInt(i.id, 10)).filter((n) => !isNaN(n));
    setPlotIds(newPlotIds);
    const newSelectedPlots = plots.filter((p) => newPlotIds.includes(parseInt(p.id, 10)));
    const validUnitIds = new Set(newSelectedPlots.flatMap((p) => (p.surfaceUnits ?? []).map((u) => parseInt(u.id, 10))));
    setSurfaceUnitIds((prev) => prev.filter((id) => validUnitIds.has(id)));
  };

  const handleSave = async () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      Alert.alert('Erreur', 'Le nom est obligatoire.');
      return;
    }
    const dur = parseInt(durationMinutes, 10);
    if (isNaN(dur) || dur <= 0) {
      Alert.alert('Erreur', 'Durée invalide (nombre de minutes > 0).');
      return;
    }
    const numPeople = parseInt(numberOfPeople, 10) || 1;
    const startM = parseInt(startMonth, 10) || 1;
    const endM = parseInt(endMonth, 10) || 12;
    const interval = parseInt(frequencyInterval, 10) || 1;

    setSaving(true);
    try {
      const payload = {
        ...(template ? { id: template.id } : {}),
        name: nameTrim,
        duration_minutes: dur,
        action: action.trim() || undefined,
        category: (category[0]?.id as RecurringTaskCategory) ?? 'general',
        culture: culture.trim() || undefined,
        number_of_people: numPeople,
        plot_ids: plotIds,
        surface_unit_ids: surfaceUnitIds,
        material_ids: materialIds,
        notes: notes.trim() || undefined,
        is_permanent: isPermanent,
        start_month: isPermanent ? 1 : startM,
        end_month: isPermanent ? 12 : endM,
        day_of_week: parseInt(dayOfWeek[0]?.id ?? '0', 10),
        frequency_type: (frequencyType[0]?.id as RecurringTaskFrequencyType) ?? 'weekly',
        frequency_interval: interval,
      };
      await onSubmit(payload as RecurringTaskCreateData & RecurringTaskUpdateData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardFormModal
      visible
      onClose={onClose}
      title={template ? 'Modifier la tâche récurrente' : 'Nouvelle tâche récurrente'}
      primaryAction={{ title: template ? 'Enregistrer' : 'Créer', onPress: handleSave, loading: saving }}
      secondaryAction={{ title: 'Annuler', onPress: onClose }}
    >
      <FormSection title="Informations de base" description="Nom, durée, action et type">
        <EnhancedInput
          label="Nom"
          value={name}
          onChangeText={setName}
          placeholder="Ex. Entretien serre"
          required
        />
        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Durée"
              value={durationDisplayValue}
              onChangeText={handleDurationChange}
              placeholder={durationUnit === 'h' ? '1' : '60'}
              keyboardType="decimal-pad"
            />
          </FieldWrapper>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 10, gap: 4 }}>
            <TouchableOpacity
              onPress={() => setDurationUnit('min')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: durationUnit === 'min' ? colors.primary[600] : colors.gray[200],
              }}
            >
              <Text variant="body" style={{ color: durationUnit === 'min' ? '#fff' : colors.text.secondary, fontWeight: '600' }}>
                min
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDurationUnit('h')}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: durationUnit === 'h' ? colors.primary[600] : colors.gray[200],
              }}
            >
              <Text variant="body" style={{ color: durationUnit === 'h' ? '#fff' : colors.text.secondary, fontWeight: '600' }}>
                h
              </Text>
            </TouchableOpacity>
          </View>
        </RowFields>
        <EnhancedInput
          label="Action"
          value={action}
          onChangeText={setAction}
          placeholder="Ex. Désherbage, arrosage"
        />
        <DropdownSelector
          label="Type d'action"
          items={CATEGORY_OPTIONS}
          selectedItems={category}
          onSelectionChange={setCategory}
          placeholder="Sélectionner"
        />
      </FormSection>

      <FormSection title="Ressources" description="Culture, personnes, parcelles, matériel">
        <DropdownSelector
          label="Culture"
          items={cultureItems}
          selectedItems={culture.trim() ? cultureItems.filter((c) => c.label === culture) : []}
          onSelectionChange={(items) => setCulture(items[0]?.label ?? '')}
          placeholder="Optionnel"
        />
        <EnhancedInput
          label="Nombre de personnes"
          value={numberOfPeople}
          onChangeText={setNumberOfPeople}
          placeholder="1"
          keyboardType="number-pad"
        />
        <DropdownSelector
          label="Parcelles"
          items={plotItems}
          selectedItems={selectedPlotItems}
          onSelectionChange={handlePlotSelectionChange}
          multiSelect
          placeholder="Optionnel"
        />
        <DropdownSelector
          label="Planches / Unités de surface"
          items={surfaceUnitItems}
          selectedItems={selectedSurfaceUnitItems}
          onSelectionChange={(items) => setSurfaceUnitIds(items.map((i) => parseInt(i.id, 10)).filter((n) => !isNaN(n)))}
          multiSelect
          placeholder={
            plotIds.length === 0
              ? 'Sélectionnez d\'abord des parcelles'
              : surfaceUnitItems.length === 0
                ? 'Aucune planche sur ces parcelles'
                : 'Optionnel'
          }
        />
        <DropdownSelector
          label="Matériel"
          items={materialItems}
          selectedItems={selectedMaterialItems}
          onSelectionChange={(items) => setMaterialIds(items.map((i) => parseInt(i.id, 10)).filter((n) => !isNaN(n)))}
          multiSelect
          placeholder="Optionnel"
        />
        <EnhancedInput
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes libres"
          multiline
        />
      </FormSection>

      <FormSection title="Récurrence" description="Période et fréquence (dates relatives, sans année)">
        <DropdownSelector
          label="Type de période"
          items={[
            { id: 'permanent', label: 'Permanente (toute l\'année)' },
            { id: 'seasonal', label: 'Saisonnière (mois de début / fin)' },
          ]}
          selectedItems={[isPermanent ? { id: 'permanent', label: 'Permanente (toute l\'année)' } : { id: 'seasonal', label: 'Saisonnière (mois de début / fin)' }]}
          onSelectionChange={(items) => setIsPermanent(items[0]?.id === 'permanent')}
          placeholder="Choisir"
        />
        {!isPermanent && (
          <RowFields>
            <FieldWrapper flex={1}>
              <DropdownSelector
                label="Mois de début"
                items={MONTH_OPTIONS}
                selectedItems={MONTH_OPTIONS.filter((o) => o.id === startMonth)}
                onSelectionChange={(items) => setStartMonth(items[0]?.id ?? '1')}
                placeholder="Mois"
              />
            </FieldWrapper>
            <FieldWrapper flex={1}>
              <DropdownSelector
                label="Mois de fin"
                items={MONTH_OPTIONS}
                selectedItems={MONTH_OPTIONS.filter((o) => o.id === endMonth)}
                onSelectionChange={(items) => setEndMonth(items[0]?.id ?? '12')}
                placeholder="Mois"
              />
            </FieldWrapper>
          </RowFields>
        )}
        <DropdownSelector
          label="Jour de la semaine"
          items={DAY_OPTIONS}
          selectedItems={dayOfWeek}
          onSelectionChange={setDayOfWeek}
          placeholder="Ex. Samedi"
        />
        <DropdownSelector
          label="Fréquence"
          items={FREQUENCY_OPTIONS}
          selectedItems={frequencyType}
          onSelectionChange={setFrequencyType}
          placeholder="Ex. Chaque semaine"
        />
        <EnhancedInput
          label="Intervalle (ex. 2 = tous les 2 samedis)"
          value={frequencyInterval}
          onChangeText={setFrequencyInterval}
          placeholder="1"
          keyboardType="number-pad"
        />
      </FormSection>
    </StandardFormModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: { color: colors.text.primary },
  subtitle: { color: colors.text.secondary, marginTop: spacing.xs },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary.purple,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  summaryTitle: { color: colors.text.primary },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStatItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  summaryLabel: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs },
  scrollContent: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  loadingContainer: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  loadingText: { marginTop: spacing.md, color: colors.text.secondary },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyTitle: { color: colors.text.primary, marginTop: spacing.md },
  emptySubtitle: { color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' },
  emptyButton: { marginTop: spacing.lg },
});
