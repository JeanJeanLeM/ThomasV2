import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from './DirectSupabaseService';
import type { Database } from '../types/database';

// Types from database
type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];
type NotificationLog = Database['public']['Tables']['notification_logs']['Row'];

// Extended types for UI
export interface NotificationWithLogs extends Notification {
  logs?: NotificationLog[];
  last_sent?: string;
  total_sent?: number;
}

export interface CreateNotificationData {
  title: string;
  message: string;
  reminder_time: string; // Format: "HH:MM:SS"
  selected_days: number[]; // Array of day numbers (0=Sunday, 1=Monday, etc.)
  farm_id: number;
}

export interface UpdateNotificationData {
  title?: string;
  message?: string;
  reminder_time?: string;
  selected_days?: number[];
  is_active?: boolean;
}

/**
 * Service for managing user notifications
 */
export class NotificationService {
  
  /**
   * Get all notifications for the current user's active farm
   */
  static async getUserNotifications(farmId: number): Promise<NotificationWithLogs[]> {
    console.log('🔔 [API] Récupération des notifications pour la ferme:', farmId);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non connecté');
      }

      // First, ensure default notification exists
      await this.ensureDefaultNotification(farmId, user.user.id);

      const { data, error } = await DirectSupabaseService.directSelect(
        'notifications',
        `
          *,
          logs:notification_logs(
            id,
            sent_at,
            status,
            error_message
          )
        `,
        [
          { column: 'farm_id', value: farmId },
          { column: 'user_id', value: user.user.id }
        ]
      );

      if (error) {
        console.error('❌ [API] Erreur récupération notifications (Direct API):', error);
        throw new Error(error.message || 'Erreur récupération notifications');
      }

      const rows = (data || []) as any[];

      // Tri côté client par created_at (desc)
      rows.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Transform data to include computed fields
      const notificationsWithStats: NotificationWithLogs[] = rows.map(notification => ({
        ...notification,
        last_sent: notification.logs?.[0]?.sent_at || null,
        total_sent: notification.logs?.length || 0
      }));

      console.log('✅ [API] Notifications récupérées:', notificationsWithStats.length);
      return notificationsWithStats;

    } catch (error) {
      console.error('❌ [NotificationService] Erreur getUserNotifications:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(notificationData: CreateNotificationData): Promise<Notification> {
    console.log('🔔 [API] Création notification:', notificationData.title);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non connecté');
      }

      // Validate selected_days
      if (!notificationData.selected_days || notificationData.selected_days.length === 0) {
        throw new Error('Au moins un jour doit être sélectionné');
      }

      if (notificationData.selected_days.some(day => day < 0 || day > 6)) {
        throw new Error('Les jours doivent être entre 0 (dimanche) et 6 (samedi)');
      }

      const insertData: NotificationInsert = {
        ...notificationData,
        user_id: user.user.id,
        notification_type: 'custom'
      };

      const { data, error } = await DirectSupabaseService.directInsert(
        'notifications',
        insertData
      );

      if (error) {
        console.error('❌ [API] Erreur création notification (Direct API):', error);
        throw new Error(error.message || 'Erreur création notification');
      }

      const created = (Array.isArray(data) ? data[0] : data) as Notification;

      console.log('✅ [API] Notification créée:', created.id);
      return created;

    } catch (error) {
      console.error('❌ [NotificationService] Erreur createNotification:', error);
      throw error;
    }
  }

  /**
   * Update an existing notification
   */
  static async updateNotification(id: string, updateData: UpdateNotificationData): Promise<Notification> {
    console.log('🔔 [API] Mise à jour notification:', id);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non connecté');
      }

      // Validate selected_days if provided
      if (updateData.selected_days) {
        if (updateData.selected_days.length === 0) {
          throw new Error('Au moins un jour doit être sélectionné');
        }
        if (updateData.selected_days.some(day => day < 0 || day > 6)) {
          throw new Error('Les jours doivent être entre 0 (dimanche) et 6 (samedi)');
        }
      }

      const payload: Partial<NotificationUpdate> = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await DirectSupabaseService.directUpdate(
        'notifications',
        payload,
        [
          { column: 'id', value: id },
          { column: 'user_id', value: user.user.id }
        ]
      );

      if (error) {
        console.error('❌ [API] Erreur mise à jour notification (Direct API):', error);
        throw new Error(error.message || 'Erreur mise à jour notification');
      }

      const updated = (Array.isArray(data) ? data[0] : data) as Notification;

      console.log('✅ [API] Notification mise à jour:', updated.id);
      return updated;

    } catch (error) {
      console.error('❌ [NotificationService] Erreur updateNotification:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(id: string): Promise<void> {
    console.log('🔔 [API] Suppression notification:', id);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non connecté');
      }

      const { error } = await DirectSupabaseService.directDelete(
        'notifications',
        [
          { column: 'id', value: id },
          { column: 'user_id', value: user.user.id }
        ]
      );

      if (error) {
        console.error('❌ [API] Erreur suppression notification (Direct API):', error);
        throw new Error(error.message || 'Erreur suppression notification');
      }

      console.log('✅ [API] Notification supprimée:', id);

    } catch (error) {
      console.error('❌ [NotificationService] Erreur deleteNotification:', error);
      throw error;
    }
  }

  /**
   * Toggle notification active status
   */
  static async toggleNotification(id: string, isActive: boolean): Promise<Notification> {
    console.log('🔔 [API] Toggle notification:', id, isActive);
    
    return this.updateNotification(id, { is_active: isActive });
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(farmId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    custom: number;
    system: number;
    task_reminders: number;
  }> {
    console.log('📊 [API] Récupération statistiques notifications pour ferme:', farmId);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data, error } = await DirectSupabaseService.directSelect(
        'notifications',
        'is_active,notification_type',
        [
          { column: 'farm_id', value: farmId },
          { column: 'user_id', value: user.user.id }
        ]
      );

      if (error) {
        console.error('❌ [API] Erreur récupération stats notifications (Direct API):', error);
        throw new Error(error.message || 'Erreur récupération stats notifications');
      }

      const rows = (data || []) as any[];

      const stats = {
        total: rows.length,
        active: rows.filter(n => n.is_active).length,
        inactive: rows.filter(n => !n.is_active).length,
        custom: rows.filter(n => n.notification_type === 'custom').length,
        system: rows.filter(n => n.notification_type === 'system').length,
        task_reminders: rows.filter(n => n.notification_type === 'task_reminder').length
      };

      console.log('✅ [API] Stats notifications:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [NotificationService] Erreur getNotificationStats:', error);
      throw error;
    }
  }

  /**
   * Get day name in French
   */
  static getDayName(dayNumber: number): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[dayNumber] || 'Jour inconnu';
  }

  /**
   * Get day abbreviation in French
   */
  static getDayAbbreviation(dayNumber: number): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[dayNumber] || '?';
  }

  /**
   * Format selected days for display
   */
  static formatSelectedDays(selectedDays: number[]): string {
    if (!selectedDays || selectedDays.length === 0) {
      return 'Aucun jour sélectionné';
    }

    if (selectedDays.length === 7) {
      return 'Tous les jours';
    }

    // Check for weekdays (Monday to Friday)
    const weekdays = [1, 2, 3, 4, 5];
    if (selectedDays.length === 5 && weekdays.every(day => selectedDays.includes(day))) {
      return 'Jours de semaine';
    }

    // Check for weekend
    const weekend = [0, 6];
    if (selectedDays.length === 2 && weekend.every(day => selectedDays.includes(day))) {
      return 'Week-end';
    }

    // Otherwise, list the days
    const sortedDays = [...selectedDays].sort();
    return sortedDays.map(day => this.getDayAbbreviation(day)).join(', ');
  }

  /**
   * Format reminder time for display
   */
  static formatReminderTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      return timeString;
    }
  }

  /**
   * Create default notifications for all active farms (utility function)
   * This can be called manually if needed
   */
  static async createDefaultNotificationsForAllFarms(): Promise<{
    created: number;
    errors: number;
    details: string[];
  }> {
    console.log('🔔 [API] Création des notifications par défaut pour toutes les fermes');
    
    const result = {
      created: 0,
      errors: 0,
      details: [] as string[]
    };

    try {
      // Get all active farms with their owners via Direct API
      const { data: farms, error: farmsError } = await DirectSupabaseService.directSelect(
        'farms',
        'id,name,owner_id,is_active'
      );

      if (farmsError) {
        throw new Error(farmsError.message || 'Erreur récupération fermes');
      }

      const activeFarms = (farms || []).filter((f: any) => f.is_active);

      if (activeFarms.length === 0) {
        result.details.push('Aucune ferme active trouvée');
        return result;
      }

      // Process each farm
      for (const farm of activeFarms as any[]) {
        try {
          // Check if user exists in auth.users
          const { data: user, error: userError } = await supabase.auth.admin.getUserById(farm.owner_id);
          
          if (userError || !user) {
            result.errors++;
            result.details.push(`Ferme ${farm.name} (${farm.id}): Propriétaire introuvable`);
            continue;
          }

          // Check if default notification already exists
          const { data: existingNotification, error: checkError } = await DirectSupabaseService.directSelect(
            'notifications',
            'id',
            [
              { column: 'farm_id', value: farm.id },
              { column: 'user_id', value: farm.owner_id },
              { column: 'notification_type', value: 'task_reminder' }
            ],
            true
          );

          if (checkError) {
            result.errors++;
            result.details.push(`Ferme ${farm.name} (${farm.id}): Erreur vérification - ${checkError.message}`);
            continue;
          }

          if (existingNotification) {
            result.details.push(`Ferme ${farm.name} (${farm.id}): Notification existe déjà`);
            continue;
          }

          // Create default notification
          const defaultNotificationData: NotificationInsert = {
            farm_id: farm.id,
            user_id: farm.owner_id,
            title: 'Rappel tâches quotidiennes',
            message: 'N\'oubliez pas d\'ajouter vos tâches réalisées via le chat Thomas !',
            reminder_time: '18:00:00',
            selected_days: [1, 2, 3, 4, 5], // Monday to Friday
            notification_type: 'task_reminder',
            metadata: { is_default: true, auto_created: true, created_by_utility: true }
          };

          const { error: createError } = await DirectSupabaseService.directInsert(
            'notifications',
            defaultNotificationData
          );

          if (createError) {
            result.errors++;
            result.details.push(`Ferme ${farm.name} (${farm.id}): Erreur création - ${createError.message}`);
          } else {
            result.created++;
            result.details.push(`Ferme ${farm.name} (${farm.id}): Notification créée avec succès`);
          }

        } catch (error) {
          result.errors++;
          result.details.push(`Ferme ${farm.name} (${farm.id}): Exception - ${error}`);
        }
      }

      console.log('✅ [API] Création terminée:', result);
      return result;

    } catch (error) {
      console.error('❌ [NotificationService] Erreur createDefaultNotificationsForAllFarms:', error);
      result.errors++;
      result.details.push(`Erreur générale: ${error}`);
      return result;
    }
  }

  /**
   * Ensure default task reminder notification exists for the user/farm
   * Creates it if it doesn't exist
   */
  private static async ensureDefaultNotification(farmId: number, userId: string): Promise<void> {
    try {
      // Check if default notification already exists
      const { data: existingNotification, error: checkError } = await DirectSupabaseService.directSelect(
        'notifications',
        'id',
        [
          { column: 'farm_id', value: farmId },
          { column: 'user_id', value: userId },
          { column: 'notification_type', value: 'task_reminder' }
        ],
        true
      );

      if (checkError) {
        console.error('❌ [API] Erreur vérification notification par défaut (Direct API):', checkError);
        return; // Don't throw, just skip creation
      }

      // If notification already exists, skip creation
      if (existingNotification) {
        console.log('✅ [API] Notification par défaut existe déjà');
        return;
      }

      // Create default notification
      const defaultNotificationData: NotificationInsert = {
        farm_id: farmId,
        user_id: userId,
        title: 'Rappel tâches quotidiennes',
        message: 'N\'oubliez pas d\'ajouter vos tâches réalisées via le chat Thomas !',
        reminder_time: '18:00:00',
        selected_days: [1, 2, 3, 4, 5], // Monday to Friday
        notification_type: 'task_reminder',
        metadata: { is_default: true, auto_created: true }
      };

      const { error: createError } = await DirectSupabaseService.directInsert(
        'notifications',
        defaultNotificationData
      );

      if (createError) {
        console.error('❌ [API] Erreur création notification par défaut (Direct API):', createError);
        // Don't throw, just log the error
      } else {
        console.log('✅ [API] Notification par défaut créée avec succès');
      }

    } catch (error) {
      console.error('❌ [NotificationService] Erreur ensureDefaultNotification:', error);
      // Don't throw, just log the error to avoid breaking the main flow
    }
  }
}
