import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  BellIcon, 
  PlusIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '../design-system/icons';
import { Text, Button, Card, Switch, EmptyState, SkeletonList } from '../design-system/components';
import { NotificationService, NotificationWithLogs } from '../services/NotificationService';
import { useFarm } from '../contexts/FarmContext';

interface NotificationsScreenProps {
  onNavigate: (screen: 'CreateNotification' | 'EditNotification', data?: any) => void;
}

export default function NotificationsScreen({ onNavigate }: NotificationsScreenProps) {
  const { currentFarm } = useFarm();
  const [notifications, setNotifications] = useState<NotificationWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, [currentFarm]);

  const loadNotifications = async () => {
    if (!currentFarm) return;
    
    try {
      setLoading(true);
      const [notificationsData, statsData] = await Promise.all([
        NotificationService.getUserNotifications(currentFarm.id),
        NotificationService.getNotificationStats(currentFarm.id)
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
      await loadNotifications(); // Reload to get updated data
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
    <Card key={notification.id} style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleRow}>
          <View style={styles.notificationIcon}>
            <BellIcon 
              color={notification.is_active ? colors.primary[600] : colors.neutral[400]} 
              size={20} 
            />
          </View>
          <View style={styles.notificationTitleContainer}>
            <Text variant="body1" weight="medium" style={styles.notificationTitle}>
              {notification.title}
            </Text>
            <Text variant="caption" color="secondary" style={styles.notificationMessage}>
              {notification.message}
            </Text>
          </View>
          <Switch
            value={notification.is_active}
            onValueChange={(value) => handleToggleNotification(notification.id, value)}
          />
        </View>
      </View>

      <View style={styles.notificationDetails}>
        <View style={styles.detailRow}>
          <ClockIcon color={colors.neutral[500]} size={16} />
          <Text variant="caption" color="secondary" style={styles.detailText}>
            {NotificationService.formatReminderTime(notification.reminder_time)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <CalendarDaysIcon color={colors.neutral[500]} size={16} />
          <Text variant="caption" color="secondary" style={styles.detailText}>
            {NotificationService.formatSelectedDays(notification.selected_days)}
          </Text>
        </View>

        {notification.total_sent > 0 && (
          <View style={styles.detailRow}>
            <CheckIcon color={colors.semantic.success} size={16} />
            <Text variant="caption" color="secondary" style={styles.detailText}>
              {notification.total_sent} notification{notification.total_sent > 1 ? 's' : ''} envoyée{notification.total_sent > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.notificationActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('EditNotification', { notification })}
        >
          <PencilIcon color={colors.primary[600]} size={18} />
          <Text variant="caption" style={styles.actionButtonText}>
            Modifier
          </Text>
        </TouchableOpacity>
        
        {notification.notification_type === 'custom' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteNotification(notification)}
          >
            <TrashIcon color={colors.semantic.error} size={18} />
            <Text variant="caption" style={[styles.actionButtonText, { color: colors.semantic.error }]}>
              Supprimer
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {notification.notification_type !== 'custom' && (
        <View style={styles.systemBadge}>
          <Text variant="caption" style={styles.systemBadgeText}>
            {notification.notification_type === 'task_reminder' ? 'Rappel système' : 'Système'}
          </Text>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonList count={4} variant="card" itemHeight={100} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header avec statistiques */}
          <View style={styles.headerSection}>
            <View style={styles.headerTitleRow}>
              <BellIcon color={colors.primary[600]} size={24} />
              <Text variant="h3" style={styles.headerTitle}>
                Mes notifications
              </Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.active}</Text>
                <Text style={styles.statLabel}>Actives</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.custom}</Text>
                <Text style={styles.statLabel}>Personnalisées</Text>
              </View>
            </View>
          </View>

          {/* Bouton créer notification */}
          <View style={styles.createSection}>
            <Button
              variant="primary"
              onPress={() => onNavigate('CreateNotification')}
              style={styles.createButton}
            >
              <View style={styles.createButtonContent}>
                <PlusIcon color={colors.white} size={20} />
                <Text variant="body1" weight="medium" style={styles.createButtonText}>
                  Créer une notification
                </Text>
              </View>
            </Button>
          </View>

          {/* Liste des notifications */}
          <View style={styles.notificationsSection}>
            {notifications.length === 0 ? (
              <EmptyState
                icon={<BellIcon size={48} color={colors.gray[400]} />}
                title="Aucune notification"
                description="Créez votre première notification personnalisée pour ne rien oublier !"
              />
            ) : (
              <>
                <Text variant="h4" style={styles.sectionTitle}>
                  Vos notifications ({notifications.length})
                </Text>
                {notifications.map(renderNotificationCard)}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  loadingText: {
    marginTop: spacing.md,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    marginLeft: spacing.sm,
    color: colors.neutral[900],
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  createSection: {
    marginBottom: spacing.lg,
  },
  createButton: {
    paddingVertical: spacing.md,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    marginLeft: spacing.sm,
    color: colors.white,
  },
  notificationsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.neutral[900],
  },
  notificationCard: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  notificationHeader: {
    marginBottom: spacing.sm,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTitle: {
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  notificationMessage: {
    lineHeight: 18,
  },
  notificationDetails: {
    marginBottom: spacing.md,
    paddingLeft: 40, // Align with title
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    marginLeft: spacing.sm,
  },
  notificationActions: {
    flexDirection: 'row',
    paddingLeft: 40, // Align with title
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    marginLeft: spacing.xs,
    color: colors.primary[600],
  },
  systemBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.secondary.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  systemBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
});













