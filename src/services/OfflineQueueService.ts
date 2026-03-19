/**
 * Service de gestion de la queue locale pour les messages en attente
 * 
 * Stocke les messages texte et audios qui n'ont pas pu être envoyés
 * en raison d'une absence de connexion Internet.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PendingMessage {
  id: string; // UUID local
  type: 'text' | 'audio';
  session_id: string;
  user_id: string;
  farm_id: number;
  content?: string; // Pour messages texte
  audio_uri?: string; // URI locale du fichier audio (référence AudioStorageService)
  audio_metadata?: {
    duration: number;
    file_size: number;
    mime_type: string;
  };
  created_at: number; // Timestamp
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  error?: string;
  server_message_id?: string; // ID du message sur le serveur après sync
}

const QUEUE_KEY = '@thomas_offline_queue';
const MAX_RETRY_COUNT = 3;

export class OfflineQueueService {
  /**
   * Ajoute un message à la queue locale
   */
  static async addMessage(message: Omit<PendingMessage, 'id' | 'created_at' | 'status' | 'retry_count'>): Promise<string> {
    try {
      const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const pendingMessage: PendingMessage = {
        ...message,
        id,
        created_at: Date.now(),
        status: 'pending',
        retry_count: 0,
      };

      const queue = await this.getPendingMessages();
      queue.push(pendingMessage);
      
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      
      console.log('📥 [OFFLINE-QUEUE] Message ajouté à la queue:', id);
      return id;
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error adding message:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les messages en attente
   */
  static async getPendingMessages(): Promise<PendingMessage[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      if (!data) {
        return [];
      }
      
      const queue: PendingMessage[] = JSON.parse(data);
      // Trier par date de création (plus ancien en premier)
      return queue.sort((a, b) => a.created_at - b.created_at);
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error getting messages:', error);
      return [];
    }
  }

  /**
   * Récupère les messages en attente (non traités)
   */
  static async getPendingOnly(): Promise<PendingMessage[]> {
    const all = await this.getPendingMessages();
    return all.filter(msg => msg.status === 'pending');
  }

  /**
   * Récupère les messages échoués
   */
  static async getFailedMessages(): Promise<PendingMessage[]> {
    const all = await this.getPendingMessages();
    return all.filter(msg => msg.status === 'failed');
  }

  /**
   * Marque un message comme en cours de traitement
   */
  static async markAsProcessing(id: string): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const message = queue.find(msg => msg.id === id);
      
      if (message) {
        message.status = 'processing';
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log('🔄 [OFFLINE-QUEUE] Message marqué comme processing:', id);
      }
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error marking as processing:', error);
    }
  }

  /**
   * Marque un message comme complété et le retire de la queue
   */
  static async markAsCompleted(id: string, serverMessageId?: string): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const filtered = queue.filter(msg => msg.id !== id);
      
      // Si on a un serverMessageId, on peut l'enregistrer pour référence
      if (serverMessageId) {
        const message = queue.find(msg => msg.id === id);
        if (message) {
          message.server_message_id = serverMessageId;
          // On peut garder une trace dans un historique séparé si besoin
        }
      }
      
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('✅ [OFFLINE-QUEUE] Message complété et retiré:', id);
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error marking as completed:', error);
    }
  }

  /**
   * Marque un message comme échoué
   */
  static async markAsFailed(id: string, error: string): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const message = queue.find(msg => msg.id === id);
      
      if (message) {
        message.status = 'failed';
        message.error = error;
        message.retry_count += 1;
        
        // Si trop de tentatives, on garde mais on ne retry plus automatiquement
        if (message.retry_count >= MAX_RETRY_COUNT) {
          console.warn('⚠️ [OFFLINE-QUEUE] Message a atteint le max de retry:', id);
        }
        
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log('❌ [OFFLINE-QUEUE] Message marqué comme failed:', id, error);
      }
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error marking as failed:', error);
    }
  }

  /**
   * Réinitialise le statut d'un message échoué pour retry
   */
  static async retryMessage(id: string): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const message = queue.find(msg => msg.id === id);
      
      if (message && message.status === 'failed') {
        message.status = 'pending';
        message.error = undefined;
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log('🔄 [OFFLINE-QUEUE] Message réinitialisé pour retry:', id);
      }
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error retrying message:', error);
    }
  }

  /**
   * Nettoie les messages complétés (optionnel, pour libérer de l'espace)
   */
  static async clearCompleted(): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const filtered = queue.filter(msg => msg.status !== 'completed');
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('🧹 [OFFLINE-QUEUE] Messages complétés nettoyés');
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error clearing completed:', error);
    }
  }

  /**
   * Obtient les statistiques de la queue
   */
  static async getStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failed: number;
  }> {
    const queue = await this.getPendingMessages();
    
    return {
      total: queue.length,
      pending: queue.filter(msg => msg.status === 'pending').length,
      processing: queue.filter(msg => msg.status === 'processing').length,
      failed: queue.filter(msg => msg.status === 'failed').length,
    };
  }

  /**
   * Supprime un message de la queue (pour nettoyage manuel)
   */
  static async removeMessage(id: string): Promise<void> {
    try {
      const queue = await this.getPendingMessages();
      const filtered = queue.filter(msg => msg.id !== id);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('🗑️ [OFFLINE-QUEUE] Message supprimé:', id);
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error removing message:', error);
    }
  }

  /**
   * Supprime tous les messages échoués de la queue
   */
  static async removeFailedMessages(): Promise<number> {
    try {
      const queue = await this.getPendingMessages();
      const failedIds = queue.filter(msg => msg.status === 'failed').map(msg => msg.id);
      if (failedIds.length === 0) {
        return 0;
      }
      const filtered = queue.filter(msg => msg.status !== 'failed');
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('🗑️ [OFFLINE-QUEUE] Messages échoués supprimés:', failedIds.length);
      return failedIds.length;
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE] Error removing failed messages:', error);
      return 0;
    }
  }
}
