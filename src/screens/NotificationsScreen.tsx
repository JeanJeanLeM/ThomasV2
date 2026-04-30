import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import {
  BellIcon,
  ClockIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../design-system/icons';
import { Text, Switch } from '../design-system/components';
import { TimePicker } from '../design-system/components/TimePicker';
import { PushNotificationService } from '../services/PushNotificationService';
import { DailyReminderService, DailyReminderConfig } from '../services/DailyReminderService';
import { InactivityNotificationService, InactivityConfig } from '../services/InactivityNotificationService';
import { ActivityStreakService, ActivityStreakState } from '../services/ActivityStreakService';
import { useFarm } from '../contexts/FarmContext';

interface NotificationsScreenProps {
  onNavigate: (screen: 'CreateNotification' | 'EditNotification', data?: any) => void;
}

const DAYS = [
  { label: 'Dim', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 },
  { label: 'Ven', value: 5 },
  { label: 'Sam', value: 6 },
];

const VACATION_OPTIONS = [
  { label: '1 semaine', weeks: 1 },
  { label: '2 semaines', weeks: 2 },
  { label: '3 semaines', weeks: 3 },
  { label: '4 semaines', weeks: 4 },
];

// ─── Carte générique configurable ────────────────────────────────────────────
interface SystemCardProps {
  title: string;
  subtitle: string;
  accentColor: string;
  defaultDays: number[];
  defaultTime: string;
  isActive: boolean;
  activeDays: number[];
  sendTime: string;
  loading: boolean;
  onToggle: (val: boolean) => void;
  onDayToggle: (day: number) => void;
  onTimeChange: (time: string) => void;
  daysLabel: string;
  expandedDaysLabel: string;
}

function SystemCard({
  title, subtitle, accentColor, isActive, activeDays, sendTime,
  loading, onToggle, onDayToggle, onTimeChange, daysLabel, expandedDaysLabel,
}: SystemCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.card, { borderLeftColor: isActive ? accentColor : colors.gray[200] }]}>
      {/* En-tête */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: isActive ? accentColor : colors.gray[200] }]}>
          <BellIcon color={isActive ? '#ffffff' : colors.gray[400]} size={18} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <>
            <View style={[
              styles.statusPill,
              isActive
                ? { backgroundColor: accentColor + '20', borderColor: accentColor + '60' }
                : { backgroundColor: colors.gray[100], borderColor: colors.gray[300] },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? accentColor : colors.gray[400] }]} />
              <Text style={[styles.statusPillText, { color: isActive ? accentColor : colors.gray[500] }]}>
                {isActive ? 'Actif' : 'Inactif'}
              </Text>
            </View>
            <Switch value={isActive} onValueChange={onToggle} />
          </>
        )}
      </View>

      {/* Résumé / formulaire */}
      {isActive && !expanded && (
        <TouchableOpacity style={styles.summaryRow} onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <View style={styles.summaryPill}>
            <ClockIcon color={colors.gray[600]} size={12} />
            <Text style={styles.summaryPillText}>{sendTime.slice(0, 5)}</Text>
          </View>
          <View style={styles.summaryPill}>
            <CalendarIcon color={colors.gray[600]} size={12} />
            <Text style={styles.summaryPillText}>{daysLabel}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <ChevronDownIcon color={colors.gray[400]} size={16} />
        </TouchableOpacity>
      )}

      {isActive && expanded && (
        <View style={styles.form}>
          <Text style={styles.formLabel}>{expandedDaysLabel}</Text>
          <View style={styles.daysRow}>
            {DAYS.map(d => {
              const sel = activeDays.includes(d.value);
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dayChip, sel && { backgroundColor: accentColor, borderColor: accentColor }]}
                  onPress={() => onDayToggle(d.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayChipText, sel && { color: '#ffffff', fontWeight: '700' }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Heure d'envoi</Text>
          <TimePicker value={sendTime} onChange={onTimeChange} />

          <TouchableOpacity style={styles.collapseBtn} onPress={() => setExpanded(false)} activeOpacity={0.7}>
            <ChevronUpIcon color={colors.gray[500]} size={16} />
            <Text style={styles.collapseBtnText}>Réduire</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isActive && (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {title === 'Rappel tâches quotidiennes'
              ? 'Recevez un rappel à heure fixe pour penser à renseigner vos tâches dans Thomas.'
              : 'Recevez un rappel le matin si aucune tâche ni observation n\'a été renseignée la veille.'}
          </Text>
        </View>
      )}
    </View>
  );
}

interface VacationCardProps {
  loading: boolean;
  vacationEnabled: boolean;
  vacationStart: string | null | undefined;
  vacationEnd: string | null | undefined;
  onSetWeeks: (weeks: number) => void;
  onDisable: () => void;
}

function VacationCard({
  loading,
  vacationEnabled,
  vacationStart,
  vacationEnd,
  onSetWeeks,
  onDisable,
}: VacationCardProps) {
  const isActive = ActivityStreakService.isVacationActive({
    vacation_enabled: vacationEnabled,
    vacation_start: vacationStart,
    vacation_end: vacationEnd,
  });

  return (
    <View style={[styles.card, { borderLeftColor: isActive ? colors.secondary.blue : colors.gray[200] }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: isActive ? colors.secondary.blue : colors.gray[200] }]}>
          <CalendarIcon color={isActive ? '#ffffff' : colors.gray[400]} size={18} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>Mode vacances</Text>
          <Text style={styles.cardSubtitle}>
            Suspend la streak et toutes les notifications automatiques
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.secondary.blue} />
        ) : (
          <View style={[
            styles.statusPill,
            isActive
              ? { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }
              : { backgroundColor: colors.gray[100], borderColor: colors.gray[300] },
          ]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? colors.secondary.blue : colors.gray[400] }]} />
            <Text style={[styles.statusPillText, { color: isActive ? '#1d4ed8' : colors.gray[500] }]}>
              {isActive ? 'En pause' : 'Inactif'}
            </Text>
          </View>
        )}
      </View>

      {isActive ? (
        <View style={styles.form}>
          <Text style={styles.infoText}>
            En pause du {ActivityStreakService.formatVacationRange(vacationStart, vacationEnd)}.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onDisable} activeOpacity={0.75}>
            <Text style={styles.secondaryButtonText}>Reprendre maintenant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formLabel}>Partir en vacances</Text>
          <View style={styles.vacationOptions}>
            {VACATION_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.weeks}
                style={styles.vacationOption}
                onPress={() => onSetWeeks(option.weeks)}
                activeOpacity={0.75}
              >
                <Text style={styles.vacationOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

interface StreakCardProps {
  loading: boolean;
  state: ActivityStreakState | null;
  activeDays: number[];
  onToggle: (value: boolean) => void;
  onDayToggle: (day: number) => void;
}

function StreakCard({ loading, state, activeDays, onToggle, onDayToggle }: StreakCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isActive = state?.is_active ?? true;
  const safePass = state?.safe_pass_balance ?? 0;
  const safeCap = state?.safe_pass_cap ?? 4;

  return (
    <View style={[styles.card, { borderLeftColor: isActive ? colors.error[500] : colors.gray[200] }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: isActive ? colors.error[500] : colors.gray[200] }]}>
          <Text style={styles.flameIcon}>🔥</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>Streak d'activite</Text>
          <Text style={styles.cardSubtitle}>
            Une flamme si vous ajoutez une tache chaque jour attendu
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.error[500]} />
        ) : (
          <>
            <View style={[
              styles.statusPill,
              isActive
                ? { backgroundColor: colors.error[50], borderColor: colors.error[200] }
                : { backgroundColor: colors.gray[100], borderColor: colors.gray[300] },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? colors.error[500] : colors.gray[400] }]} />
              <Text style={[styles.statusPillText, { color: isActive ? colors.error[700] : colors.gray[500] }]}>
                {isActive ? 'Actif' : 'Inactif'}
              </Text>
            </View>
            <Switch value={isActive} onValueChange={onToggle} />
          </>
        )}
      </View>

      {isActive && !expanded && (
        <TouchableOpacity style={styles.summaryRow} onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>{state?.current_streak ?? 0} jours</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryPillText}>Safe pass {safePass}/{safeCap}</Text>
          </View>
          <View style={styles.summaryPill}>
            <CalendarIcon color={colors.gray[600]} size={12} />
            <Text style={styles.summaryPillText}>
              {ActivityStreakService.formatActiveDays(activeDays)}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <ChevronDownIcon color={colors.gray[400]} size={16} />
        </TouchableOpacity>
      )}

      {isActive && expanded && (
        <View style={styles.form}>
          <View style={styles.streakStatsRow}>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{state?.current_streak ?? 0}</Text>
              <Text style={styles.streakStatLabel}>Jours</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{state?.best_streak ?? 0}</Text>
              <Text style={styles.streakStatLabel}>Record</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakStatNumber}>{safePass}/{safeCap}</Text>
              <Text style={styles.streakStatLabel}>Safe pass</Text>
            </View>
          </View>

          <Text style={[styles.formLabel, { marginTop: spacing.md }]}>Jours attendus</Text>
          <View style={styles.daysRow}>
            {DAYS.map(d => {
              const selected = activeDays.includes(d.value);
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[
                    styles.dayChip,
                    selected && { backgroundColor: colors.error[500], borderColor: colors.error[500] },
                  ]}
                  onPress={() => onDayToggle(d.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayChipText, selected && { color: '#ffffff', fontWeight: '700' }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.streakHint}>
            Les jours non selectionnes et les vacances ne cassent pas la streak.
            Un safe pass est ajoute chaque semaine, avec un maximum de {safeCap}.
          </Text>

          <TouchableOpacity style={styles.collapseBtn} onPress={() => setExpanded(false)} activeOpacity={0.7}>
            <ChevronUpIcon color={colors.gray[500]} size={16} />
            <Text style={styles.collapseBtnText}>Reduire</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function NotificationsScreen({ onNavigate: _onNavigate }: NotificationsScreenProps) {
  const { activeFarm } = useFarm();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

  // ── Daily reminder ──
  const [dailyConfig, setDailyConfig] = useState<DailyReminderConfig | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyDays, setDailyDays] = useState([1, 2, 3, 4, 5]);
  const [dailyTime, setDailyTime] = useState('08:00:00');

  // ── Inactivity reminder ──
  const [inactivityConfig, setInactivityConfig] = useState<InactivityConfig | null>(null);
  const [inactivityLoading, setInactivityLoading] = useState(true);
  const [inactivityDays, setInactivityDays] = useState([1, 2, 3, 4, 5, 6]);
  const [inactivityTime, setInactivityTime] = useState('10:00:00');

  // ── Activity streak ──
  const [streakState, setStreakState] = useState<ActivityStreakState | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [streakDays, setStreakDays] = useState(ActivityStreakService.defaultActiveDays);

  useEffect(() => {
    if (!activeFarm) return;

    if (Platform.OS !== 'web') {
      PushNotificationService.isEnabled().then(setPushEnabled);
    }

    DailyReminderService.getConfig(activeFarm.farm_id)
      .then(async cfg => {
        if (cfg) {
          setDailyConfig(cfg);
          setDailyDays(cfg.active_days);
          setDailyTime(cfg.send_time);
        } else {
          // Première ouverture : créer la config active par défaut
          const created = await DailyReminderService.saveConfig(activeFarm.farm_id, {
            is_active: true,
            active_days: [1, 2, 3, 4, 5],
            send_time: '08:00:00',
          });
          setDailyConfig(created);
        }
      })
      .catch(console.error)
      .finally(() => setDailyLoading(false));

    InactivityNotificationService.getConfig(activeFarm.farm_id)
      .then(async cfg => {
        if (cfg) {
          setInactivityConfig(cfg);
          setInactivityDays(cfg.active_days);
          setInactivityTime(cfg.send_time);
        } else {
          // Première ouverture : créer la config active par défaut
          const created = await InactivityNotificationService.saveConfig(activeFarm.farm_id, {
            is_active: true,
            active_days: [1, 2, 3, 4, 5, 6],
            send_time: '10:00:00',
          });
          setInactivityConfig(created);
        }
      })
      .catch(console.error)
      .finally(() => setInactivityLoading(false));

    ActivityStreakService.refreshAndGetState(activeFarm.farm_id)
      .then(state => {
        setStreakState(state);
        setStreakDays(state.active_days ?? ActivityStreakService.defaultActiveDays);
      })
      .catch(console.error)
      .finally(() => setStreakLoading(false));
  }, [activeFarm]);

  const saveDaily = async (days: number[], time: string, isActive: boolean) => {
    if (!activeFarm) return;
    try {
      const saved = await DailyReminderService.saveConfig(activeFarm.farm_id, { is_active: isActive, active_days: days, send_time: time });
      setDailyConfig(saved);
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
  };

  const saveInactivity = async (days: number[], time: string, isActive: boolean) => {
    if (!activeFarm) return;
    try {
      const saved = await InactivityNotificationService.saveConfig(activeFarm.farm_id, { is_active: isActive, active_days: days, send_time: time });
      setInactivityConfig(saved);
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
  };

  const formatDays = (days: number[]) => DailyReminderService.formatActiveDays(days);

  const refreshStreak = async () => {
    if (!activeFarm) return null;
    const state = await ActivityStreakService.refreshAndGetState(activeFarm.farm_id);
    setStreakState(state);
    setStreakDays(state.active_days ?? ActivityStreakService.defaultActiveDays);
    return state;
  };

  const saveStreak = async (config: Parameters<typeof ActivityStreakService.saveConfig>[1]) => {
    if (!activeFarm) return;
    try {
      await ActivityStreakService.saveConfig(activeFarm.farm_id, config);
      await refreshStreak();
    } catch (error) {
      console.error('Erreur sauvegarde streak:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la streak');
    }
  };

  const setVacationWeeks = async (weeks: number) => {
    if (!activeFarm) return;
    try {
      await ActivityStreakService.setVacationWeeks(activeFarm.farm_id, weeks);
      await refreshStreak();
    } catch (error) {
      console.error('Erreur mode vacances:', error);
      Alert.alert('Erreur', 'Impossible d’activer le mode vacances');
    }
  };

  const disableVacation = async () => {
    if (!activeFarm) return;
    try {
      await ActivityStreakService.disableVacationMode(activeFarm.farm_id);
      await refreshStreak();
    } catch (error) {
      console.error('Erreur désactivation vacances:', error);
      Alert.alert('Erreur', 'Impossible de désactiver le mode vacances');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Statut push */}
      {Platform.OS !== 'web' && pushEnabled !== null && (
        <View style={[styles.pushBanner, pushEnabled ? styles.pushBannerOk : styles.pushBannerWarn]}>
          <BellIcon color={pushEnabled ? colors.primary[600] : colors.warning[600]} size={14} />
          <Text style={[styles.pushBannerText, { color: pushEnabled ? colors.primary[700] : colors.warning[700] }]}>
            {pushEnabled ? 'Notifications push activées' : 'Notifications push désactivées — activez-les dans les réglages'}
          </Text>
        </View>
      )}

      {/* Section titre */}
      <Text style={styles.sectionTitle}>Notifications automatiques</Text>
      <Text style={styles.sectionDesc}>
        Configurez vos rappels. Les notifications sont envoyées selon l'heure et les jours choisis.
      </Text>

      <VacationCard
        loading={streakLoading}
        vacationEnabled={streakState?.vacation_enabled ?? false}
        vacationStart={streakState?.vacation_start}
        vacationEnd={streakState?.vacation_end}
        onSetWeeks={setVacationWeeks}
        onDisable={disableVacation}
      />

      <StreakCard
        loading={streakLoading}
        state={streakState}
        activeDays={streakDays}
        onToggle={(value) => saveStreak({ is_active: value })}
        onDayToggle={(day) => {
          const next = streakDays.includes(day)
            ? streakDays.filter(d => d !== day)
            : [...streakDays, day].sort((a, b) => a - b);
          setStreakDays(next);
          saveStreak({ active_days: next });
        }}
      />

      {/* Rappel quotidien */}
      <SystemCard
        title="Rappel tâches quotidiennes"
        subtitle="Rappel à heure fixe pour renseigner vos tâches"
        accentColor={colors.primary[600]}
        defaultDays={[1, 2, 3, 4, 5]}
        defaultTime="08:00:00"
        isActive={dailyConfig?.is_active ?? false}
        activeDays={dailyDays}
        sendTime={dailyTime}
        loading={dailyLoading}
        daysLabel={formatDays(dailyDays)}
        expandedDaysLabel="Jours d'envoi"
        onToggle={(v) => { saveDaily(dailyDays, dailyTime, v); setDailyConfig(c => c ? { ...c, is_active: v } : null); }}
        onDayToggle={(day) => {
          const next = dailyDays.includes(day) ? dailyDays.filter(d => d !== day) : [...dailyDays, day];
          setDailyDays(next);
          if (dailyConfig) saveDaily(next, dailyTime, dailyConfig.is_active);
        }}
        onTimeChange={(t) => {
          setDailyTime(t);
          if (dailyConfig) saveDaily(dailyDays, t, dailyConfig.is_active);
        }}
      />

      {/* Rappel inactivité */}
      <SystemCard
        title="Rappel d'inactivité"
        subtitle="Alerte si aucune tâche renseignée la veille"
        accentColor={colors.warning[500]}
        defaultDays={[1, 2, 3, 4, 5, 6]}
        defaultTime="10:00:00"
        isActive={inactivityConfig?.is_active ?? false}
        activeDays={inactivityDays}
        sendTime={inactivityTime}
        loading={inactivityLoading}
        daysLabel={formatDays(inactivityDays)}
        expandedDaysLabel="Jours où les tâches sont attendues"
        onToggle={(v) => { saveInactivity(inactivityDays, inactivityTime, v); setInactivityConfig(c => c ? { ...c, is_active: v } : null); }}
        onDayToggle={(day) => {
          const next = inactivityDays.includes(day) ? inactivityDays.filter(d => d !== day) : [...inactivityDays, day];
          setInactivityDays(next);
          if (inactivityConfig) saveInactivity(next, inactivityTime, inactivityConfig.is_active);
        }}
        onTimeChange={(t) => {
          setInactivityTime(t);
          if (inactivityConfig) saveInactivity(inactivityDays, t, inactivityConfig.is_active);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },

  // Push banner
  pushBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  pushBannerOk: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  pushBannerWarn: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
  },
  pushBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },

  // Titre section
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },

  // Carte système
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 15,
  },

  // Pill statut
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Résumé compact
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 20,
  },
  summaryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[700],
  },

  // Formulaire inline
  form: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: colors.gray[300],
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[700],
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  collapseBtnText: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Info quand inactif
  infoRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  infoText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  secondaryButtonText: {
    color: colors.gray[700],
    fontSize: 13,
    fontWeight: '700',
  },
  vacationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  vacationOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  vacationOptionText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  flameIcon: {
    fontSize: 20,
  },
  streakStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  streakStat: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  streakStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.error[600],
  },
  streakStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[500],
    marginTop: 2,
  },
  streakHint: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
    marginTop: spacing.md,
  },
});
