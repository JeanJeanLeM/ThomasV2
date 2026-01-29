/**
 * Service de cache pour les messages de chat
 * 
 * Stratégie :
 * - Cache les 10 derniers messages de chaque chat
 * - TTL de 7 jours
 * - Chargement instantané depuis cache
 * - Mise à jour en arrière-plan
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from './ChatServiceDirect';

interface CachedChat {
  chatId: string;
  messages: ChatMessage[];
  cachedAt: string; // ISO timestamp
  version: number; // Pour migration future
}

const CACHE_PREFIX = '@thomas_chat_cache_';
const CHAT_LIST_PREFIX = '@thomas_chat_list_';
const CACHE_VERSION = 1;
const MAX_CACHED_MESSAGES = 10;
const CACHE_TTL_DAYS = 7;
const CHAT_LIST_TTL_HOURS = 1; // Liste des chats rafraîchie après 1h

export class ChatCacheService {
  
  /**
   * Sauvegarder les messages d'un chat en cache
   */
  static async cacheMessages(chatId: string, messages: ChatMessage[]): Promise<void> {
    try {
      // Ne garder que les 10 derniers messages
      const messagesToCache = messages.slice(-MAX_CACHED_MESSAGES);
      
      const cacheData: CachedChat = {
        chatId,
        messages: messagesToCache,
        cachedAt: new Date().toISOString(),
        version: CACHE_VERSION
      };
      
      const key = `${CACHE_PREFIX}${chatId}`;
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      
      console.log(`💾 [CACHE] Saved ${messagesToCache.length} messages for chat ${chatId}`);
    } catch (error) {
      console.error('❌ [CACHE] Error saving:', error);
      // Ne pas bloquer si le cache échoue
    }
  }
  
  /**
   * Récupérer les messages cachés d'un chat
   * Retourne null si pas de cache ou cache expiré
   */
  static async getCachedMessages(chatId: string): Promise<ChatMessage[] | null> {
    try {
      const key = `${CACHE_PREFIX}${chatId}`;
      const cachedData = await AsyncStorage.getItem(key);
      
      if (!cachedData) {
        console.log(`📭 [CACHE] No cache found for chat ${chatId}`);
        return null;
      }
      
      const cache: CachedChat = JSON.parse(cachedData);
      
      // Vérifier la version du cache
      if (cache.version !== CACHE_VERSION) {
        console.log(`🔄 [CACHE] Cache version mismatch for chat ${chatId}, invalidating`);
        await this.invalidateCache(chatId);
        return null;
      }
      
      // Vérifier si le cache est expiré (7 jours)
      const cachedAt = new Date(cache.cachedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > CACHE_TTL_DAYS) {
        console.log(`⌛ [CACHE] Cache expired for chat ${chatId} (${daysDiff.toFixed(1)} days old)`);
        await this.invalidateCache(chatId);
        return null;
      }
      
      console.log(`✅ [CACHE] Found ${cache.messages.length} cached messages for chat ${chatId} (${daysDiff.toFixed(1)} days old)`);
      return cache.messages;
      
    } catch (error) {
      console.error('❌ [CACHE] Error reading:', error);
      return null;
    }
  }
  
  /**
   * Invalider le cache d'un chat spécifique
   */
  static async invalidateCache(chatId: string): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${chatId}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ [CACHE] Invalidated cache for chat ${chatId}`);
    } catch (error) {
      console.error('❌ [CACHE] Error invalidating:', error);
    }
  }
  
  /**
   * Nettoyer tous les caches expirés
   * À appeler au démarrage de l'app
   */
  static async cleanExpiredCaches(): Promise<void> {
    try {
      console.log('🧹 [CACHE] Cleaning expired caches...');
      
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      
      let cleanedCount = 0;
      
      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key);
        if (!cachedData) continue;
        
        try {
          const cache: CachedChat = JSON.parse(cachedData);
          const cachedAt = new Date(cache.cachedAt);
          const now = new Date();
          const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
          
          // Supprimer si expiré ou mauvaise version
          if (daysDiff > CACHE_TTL_DAYS || cache.version !== CACHE_VERSION) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (parseError) {
          // Cache corrompu, supprimer
          await AsyncStorage.removeItem(key);
          cleanedCount++;
        }
      }
      
      console.log(`✅ [CACHE] Cleaned ${cleanedCount} expired/invalid caches`);
    } catch (error) {
      console.error('❌ [CACHE] Error cleaning caches:', error);
    }
  }
  
  /**
   * Obtenir des statistiques sur le cache
   * Utile pour debugging
   */
  static async getCacheStats(): Promise<{
    totalCaches: number;
    totalSizeKB: number;
    oldestCache: string | null;
    newestCache: string | null;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
      
      let totalSize = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;
      
      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key);
        if (!cachedData) continue;
        
        totalSize += cachedData.length;
        
        try {
          const cache: CachedChat = JSON.parse(cachedData);
          const cachedAt = new Date(cache.cachedAt);
          
          if (!oldestDate || cachedAt < oldestDate) {
            oldestDate = cachedAt;
          }
          if (!newestDate || cachedAt > newestDate) {
            newestDate = cachedAt;
          }
        } catch (parseError) {
          // Ignorer les caches corrompus
        }
      }
      
      return {
        totalCaches: cacheKeys.length,
        totalSizeKB: Math.round(totalSize / 1024),
        oldestCache: oldestDate?.toISOString() || null,
        newestCache: newestDate?.toISOString() || null
      };
    } catch (error) {
      console.error('❌ [CACHE] Error getting stats:', error);
      return {
        totalCaches: 0,
        totalSizeKB: 0,
        oldestCache: null,
        newestCache: null
      };
    }
  }
  
  /**
   * Effacer tout le cache (pour tests ou settings)
   */
  static async clearAllCaches(): Promise<void> {
    try {
      console.log('🗑️ [CACHE] Clearing all caches...');
      
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(CACHE_PREFIX) || key.startsWith(CHAT_LIST_PREFIX)
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log(`✅ [CACHE] Cleared ${cacheKeys.length} caches`);
    } catch (error) {
      console.error('❌ [CACHE] Error clearing all:', error);
    }
  }

  // ============================================================
  // CACHE DE LA LISTE DES CHATS (par ferme)
  // ============================================================

  /**
   * Sauvegarder la liste des chats d'une ferme en cache
   */
  static async cacheChatList(farmId: number, chatSessions: any[]): Promise<void> {
    try {
      const cacheData = {
        farmId,
        sessions: chatSessions,
        cachedAt: new Date().toISOString(),
        version: CACHE_VERSION
      };
      
      const key = `${CHAT_LIST_PREFIX}${farmId}`;
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      
      console.log(`💾 [CACHE-LIST] Saved ${chatSessions.length} chat sessions for farm ${farmId}`);
    } catch (error) {
      console.error('❌ [CACHE-LIST] Error saving:', error);
    }
  }

  /**
   * Récupérer la liste des chats cachée d'une ferme
   * Retourne null si pas de cache ou cache expiré
   */
  static async getCachedChatList(farmId: number): Promise<any[] | null> {
    try {
      const key = `${CHAT_LIST_PREFIX}${farmId}`;
      const cachedData = await AsyncStorage.getItem(key);
      
      if (!cachedData) {
        console.log(`📭 [CACHE-LIST] No cache found for farm ${farmId}`);
        return null;
      }
      
      const cache = JSON.parse(cachedData);
      
      // Vérifier la version
      if (cache.version !== CACHE_VERSION) {
        console.log(`🔄 [CACHE-LIST] Cache version mismatch for farm ${farmId}, invalidating`);
        await this.invalidateChatListCache(farmId);
        return null;
      }
      
      // Vérifier si le cache est expiré (1 heure)
      const cachedAt = new Date(cache.cachedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > CHAT_LIST_TTL_HOURS) {
        console.log(`⌛ [CACHE-LIST] Cache expired for farm ${farmId} (${hoursDiff.toFixed(1)}h old)`);
        await this.invalidateChatListCache(farmId);
        return null;
      }
      
      console.log(`✅ [CACHE-LIST] Found ${cache.sessions.length} cached sessions for farm ${farmId} (${Math.round(hoursDiff * 60)}min old)`);
      return cache.sessions;
      
    } catch (error) {
      console.error('❌ [CACHE-LIST] Error reading:', error);
      return null;
    }
  }

  /**
   * Invalider le cache de la liste des chats d'une ferme
   */
  static async invalidateChatListCache(farmId: number): Promise<void> {
    try {
      const key = `${CHAT_LIST_PREFIX}${farmId}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ [CACHE-LIST] Invalidated cache for farm ${farmId}`);
    } catch (error) {
      console.error('❌ [CACHE-LIST] Error invalidating:', error);
    }
  }
}

