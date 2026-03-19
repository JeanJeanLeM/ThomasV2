import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../utils/supabase';

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class PushNotificationService {

  /**
   * Request permission and register the device push token.
   * Call this once at app startup.
   * Returns the Expo push token string, or null if unavailable.
   */
  static async registerForPushNotifications(): Promise<string | null> {
    // Push notifications don't work on web
    if (Platform.OS === 'web') {
      console.log('ℹ️ [PUSH] Push notifications non supportées sur le web');
      return null;
    }

    // Must be a physical device (not simulator/emulator) for push tokens
    if (!Device.isDevice) {
      console.log('ℹ️ [PUSH] Push tokens uniquement disponibles sur appareils physiques');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request if not yet granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ [PUSH] Permission refusée pour les notifications');
        return null;
      }

      // Android: create a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('thomas-reminders', {
          name: 'Rappels Thomas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#22c55e',
          sound: 'default',
        });
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('❌ [PUSH] projectId manquant dans app.json extra.eas.projectId');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      console.log('✅ [PUSH] Token obtenu:', token.substring(0, 30) + '...');
      return token;

    } catch (error) {
      console.error('❌ [PUSH] Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  /**
   * Save or update the push token in Supabase for the current user.
   */
  static async savePushToken(token: string): Promise<void> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) {
        console.warn('⚠️ [PUSH] Utilisateur non connecté, token non sauvegardé');
        return;
      }

      const platform = Platform.OS as 'ios' | 'android' | 'web';
      const deviceName = Device.deviceName || 'Appareil inconnu';

      // Upsert: update token if already exists for this user+token combo
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userResp.user.id,
            token,
            platform,
            device_name: deviceName,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' }
        );

      if (error) {
        console.error('❌ [PUSH] Erreur sauvegarde token:', error);
      } else {
        console.log('✅ [PUSH] Token sauvegardé en base');
      }
    } catch (error) {
      console.error('❌ [PUSH] Erreur savePushToken:', error);
    }
  }

  /**
   * Deactivate all push tokens for the current user (called on logout).
   */
  static async deactivateUserTokens(): Promise<void> {
    try {
      const { data: userResp } = await supabase.auth.getUser();
      if (!userResp.user) return;

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userResp.user.id);

      if (error) {
        console.error('❌ [PUSH] Erreur désactivation tokens:', error);
      } else {
        console.log('✅ [PUSH] Tokens désactivés');
      }
    } catch (error) {
      console.error('❌ [PUSH] Erreur deactivateUserTokens:', error);
    }
  }

  /**
   * Full registration: request permission + save token to DB.
   * Returns the token or null.
   */
  static async registerAndSave(): Promise<string | null> {
    const token = await this.registerForPushNotifications();
    if (token) {
      await this.savePushToken(token);
    }
    return token;
  }

  /**
   * Check if push notifications are enabled (permission granted).
   */
  static async isEnabled(): Promise<boolean> {
    if (Platform.OS === 'web' || !Device.isDevice) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}
