import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  BellIcon, 
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  CheckmarkIcon,
} from '../design-system/icons';
import { Text, Switch } from '../design-system/components';
import { NotificationService, NotificationWithLogs } from '../services/NotificationService';
import { PushNotificationService } from '../services/PushNotificationService';
import { useFarm } from '../contexts/FarmContext';

interface NotificationsScreenProps {
  onNavigate: (screen: 'CreateNotification' | 'EditNotification', data?: any) => void;
}

export default function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const { activeFarm } = useFarm();
  const [notifications, setNotifications] = useState<NotificationWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    custom: 0,
    system: 0,
    task_reminders: 0
  });

  useEffect(() => {
    loadNotifications();
    // Vérifier le statut des permissions push
    if (Platform.OS !== 'web') {
      PushNotificationService.isEnabled().then(setPushEnabled);
    }
  }, [activeFarm]);

  const loadNotifications = async () => {
    if (!activeFarm) return;
    
    try {
      setLoading(true);
      const [notificationsData, statsData] = await Promise.all([
        NotificationService.getUserNotifications(activeFarm.farm_id),
        NotificationService.getNotificationStats(activeFarm.farm_id)
      ]);
      
      setNotifications(notificationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotification = async (id: string, isActive: boolean) => {
    try {
      await NotificationService.toggleNotification(id, isActive);
      await loadNotifications();
    } catch (error) {
      console.error('Erreur toggle notification:', error);
      Alert.alert('Erreur', 'Impossible de modifier la notification');
    }
  };

  const handleDeleteNotification = (notification: NotificationWithLogs) => {
    Alert.alert(
      'Supprimer la notification',
      `Êtes-vous sûr de vouloir supprimer "${notification.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.deleteNotification(notification.id);
              await loadNotifications();
            } catch (error) {
              console.error('Erreur suppression notification:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la notification');
            }
          }
        }
      ]
    );
  };

  const renderNotificationCard = (notification: NotificationWithLogs) => (
    <View key={notification.id} style={styles.notificationCard}>
      {/* Badge type système */}
      {notification.notification_type !== 'custom' && (
        <View style={styles.systemBadge}>
          <Text style={styles.systemBadgeText}>
            {notification.notification_type === 'task_reminder' ? 'Rappel système' : 'Système'}
          </Text>
        </View>
      )}

      {/* En-tête de la carte */}
      <View style={styles.cardHeader}>
        <View style={[
          styles.notificationIcon,
          { backgroundColor: notification.is_active ? colors.primary[50] : colors.neutral[100] }
        ]}>
          <BellIcon 
            color={notification.is_active ? colors.primary[600] : colors.neutral[400]} 
            size={20} 
          />
        </View>
        <View style={styles.notificationTitleContainer}>
          <Text variant="body1" weight="medium" style={styles.notificationTitle}>
            {notification.title}
          </Text>
          <Text variant="caption" color={colors.text.secondary} style={styles.notificationMessage}>
            {notification.message}
          </Text>
        </View>
        <Switch
          value={notification.is_active}
          onValueChange={(value) => handleToggleNotification(notification.id, value)}
        />
      </View>

      {/* Détails */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <ClockIcon color={colors.neutral[500]} size={14} />
          <Text variant="caption" style={styles.detailText}>
            {NotificationService.formatReminderTime(notification.reminder_time)}
          </Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <CalendarIcon color={colors.neutral[500]} size={14} />
          <Text variant="caption" style={styles.detailText}>
            {NotificationService.formatSelectedDays(notification.selected_days)}
          </Text>
        </View>
        {notification.total_sent > 0 && (
          <>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <CheckmarkIcon color={colors.semantic.success} size={14} />
              <Text variant="caption" style={styles.detailText}>
                {notification.total_sent} envoyée{notification.total_sent > 1 ? 's' : ''}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('EditNotification', { notification })}
        >
          <PencilIcon color={colors.primary[600]} size={16} />
          <Text variant="caption" style={styles.actionButtonText}>
            Modifier
          </Text>
        </TouchableOpacity>
        
        {notification.notification_type === 'custom' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteNotification(notification)}
          >
            <TrashIcon color={colors.semantic.error} size={16} />
            <Text variant="caption" style={[styles.actionButtonText, { color: colors.semantic.error }]}>
              Supprimer
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text variant="body" style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte de stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <BellIcon color={colors.primary[600]} size={20} />
            </View>
            <Text style={styles.summaryTitle}>Aperçu de vos notifications</Text>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryNumber}>{stats.active}</Text>
              <Text style={styles.summaryLabel}>Actives</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryNumber}>{stats.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryNumber}>{stats.custom}</Text>
              <Text style={styles.summaryLabel}>Personnalisées</Text>
            </View>
          </View>
        </View>

        {/* Statut push notifications */}
        {Platform.OS !== 'web' && (
          <View style={[
            styles.pushStatusBanner,
            pushEnabled
              ? styles.pushStatusBannerActive
              : styles.pushStatusBannerInactive
          ]}>
            <BellIcon
              color={pushEnabled ? colors.semantic.success : colors.semantic.warning}
              size={16}
            />
            <Text style={[
              styles.pushStatusText,
              { color: pushEnabled ? colors.semantic.success : colors.semantic.warning }
            ]}>
              {pushEnabled
                ? 'Notifications push activées sur cet appareil'
                : 'Notifications push désactivées — activez-les dans les réglages du téléphone'}
            </Text>
          </View>
        )}

        {/* Bouton créer */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => onNavigate('CreateNotification')}
          activeOpacity={0.8}
        >
          <PlusIcon color={colors.white} size={20} />
          <Text style={styles.createButtonText}>Créer une notification</Text>
        </TouchableOpacity>

        {/* Liste */}
        <View style={styles.listSection}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <BellIcon size={48} color={colors.neutral[300]} />
              <Text variant="body1" weight="medium" style={styles.emptyTitle}>
                Aucune notification
              </Text>
              <Text variant="caption" style={styles.emptyDescription}>
                Créez votre premier rappel personnalisé pour ne rien oublier !
              </Text>
            </View>
          ) : (
            <>
              <Text variant="body2" weight="medium" style={styles.sectionTitle}>
                Vos notifications ({notifications.length})
              </Text>
              {notifications.map(renderNotificationCard)}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
  },

  // Summary card (même style que PlotsSettings)
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[600],
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.neutral[200],
  },

  // Bannière statut push
  pushStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
  },
  pushStatusBannerActive: {
    backgroundColor: colors.semantic.success + '12',
    borderLeftColor: colors.semantic.success,
  },
  pushStatusBannerInactive: {
    backgroundColor: colors.semantic.warning + '12',
    borderLeftColor: colors.semantic.warning,
  },
  pushStatusText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  // Bouton créer
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Liste
  listSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Carte notification
  notificationCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[400],
  },
  systemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  systemBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTitle: {
    color: colors.text.primary,
    marginBottom: 2,
  },
  notificationMessage: {
    lineHeight: 18,
  },

  // Détails (heure + jours)
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
    paddingLeft: 44,
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  detailDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.neutral[300],
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    paddingLeft: 44,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    color: colors.primary[600],
    fontSize: 13,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text.primary,
  },
  emptyDescription: {
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
