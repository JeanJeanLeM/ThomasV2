import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserFarm } from './SimpleInitService';

/**
 * Service de cache pour le contexte de ferme (FarmContext)
 * 
 * Permet l'utilisation hors ligne en sauvegardant :
 * - Liste des fermes (farms)
 * - Ferme active (activeFarm)
 * - État de setup (needsSetup)
 * 
 * Cache persistant via AsyncStorage pour permettre l'utilisation hors ligne
 */
export interface FarmContextCache {
  userId: string;
  farms: UserFarm[];
  activeFarm: UserFarm | null;
  needsSetup: boolean;
  cachedAt: number;
}

// Clés de cache
const CACHE_KEYS = {
  FARM_CONTEXT: (userId: string) => `@farm_context_${userId}`,
} as const;

// Durée de validité du cache (7 jours)
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export class FarmContextCacheService {
  
  /**
   * Sauvegarde le contexte de ferme en cache
   */
  static async saveFarmContext(
    userId: string,
    farms: UserFarm[],
    activeFarm: UserFarm | null,
    needsSetup: boolean
  ): Promise<void> {
    try {
      const cache: FarmContextCache = {
        userId,
        farms,
        activeFarm,
        needsSetup,
        cachedAt: Date.now(),
      };

      await AsyncStorage.setItem(
        CACHE_KEYS.FARM_CONTEXT(userId),
        JSON.stringify(cache)
      );

      console.log('✅ [FARM-CONTEXT-CACHE] Contexte sauvegardé en cache:', {
        farms: farms.length,
        activeFarm: activeFarm?.farm_name || 'aucune',
        needsSetup
      });

    } catch (error) {
      console.error('❌ [FARM-CONTEXT-CACHE] Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Récupère le contexte de ferme depuis le cache
   */
  static async getCachedFarmContext(userId: string): Promise<FarmContextCache | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.FARM_CONTEXT(userId));
      
      if (!cached) {
        console.log('📭 [FARM-CONTEXT-CACHE] Aucun cache trouvé');
        return null;
      }

      const cache: FarmContextCache = JSON.parse(cached);

      // Vérifier que le cache correspond au bon utilisateur
      if (cache.userId !== userId) {
        console.log('⚠️ [FARM-CONTEXT-CACHE] Cache ne correspond pas à l\'utilisateur');
        return null;
      }

      // Vérifier que le cache n'est pas expiré
      const cacheAge = Date.now() - cache.cachedAt;
      if (cacheAge > CACHE_DURATION_MS) {
        console.log('⏰ [FARM-CONTEXT-CACHE] Cache expiré (âge:', Math.round(cacheAge / (1000 * 60 * 60 * 24)), 'jours)');
        return null;
      }

      console.log('✅ [FARM-CONTEXT-CACHE] Cache trouvé et valide:', {
        farms: cache.farms.length,
        activeFarm: cache.activeFarm?.farm_name || 'aucune',
        needsSetup: cache.needsSetup,
        age: Math.round(cacheAge / (1000 * 60)) + ' min'
      });

      return cache;

    } catch (error) {
      console.error('❌ [FARM-CONTEXT-CACHE] Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * Invalide le cache du contexte de ferme
   */
  static async invalidateFarmContext(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.FARM_CONTEXT(userId));
      console.log('🗑️ [FARM-CONTEXT-CACHE] Cache invalidé pour utilisateur:', userId);
    } catch (error) {
      console.error('❌ [FARM-CONTEXT-CACHE] Erreur invalidation cache:', error);
    }
  }

  /**
   * Met à jour uniquement la ferme active dans le cache
   */
  static async updateActiveFarmInCache(
    userId: string,
    activeFarm: UserFarm | null
  ): Promise<void> {
    try {
      const cached = await this.getCachedFarmContext(userId);
      
      if (!cached) {
        console.log('⚠️ [FARM-CONTEXT-CACHE] Pas de cache à mettre à jour');
        return;
      }

      // Mettre à jour la ferme active
      await this.saveFarmContext(
        userId,
        cached.farms,
        activeFarm,
        cached.needsSetup
      );

      console.log('✅ [FARM-CONTEXT-CACHE] Ferme active mise à jour en cache');

    } catch (error) {
      console.error('❌ [FARM-CONTEXT-CACHE] Erreur mise à jour ferme active:', error);
    }
  }

  /**
   * Met à jour uniquement la liste des fermes dans le cache
   */
  static async updateFarmsInCache(
    userId: string,
    farms: UserFarm[]
  ): Promise<void> {
    try {
      const cached = await this.getCachedFarmContext(userId);
      
      if (!cached) {
        console.log('⚠️ [FARM-CONTEXT-CACHE] Pas de cache à mettre à jour');
        return;
      }

      // Trouver la ferme active dans la nouvelle liste
      let activeFarm = null;
      if (cached.activeFarm) {
        activeFarm = farms.find(f => f.farm_id === cached.activeFarm!.farm_id) || null;
      }

      // Mettre à jour les fermes
      await this.saveFarmContext(
        userId,
        farms,
        activeFarm,
        farms.length === 0
      );

      console.log('✅ [FARM-CONTEXT-CACHE] Liste des fermes mise à jour en cache');

    } catch (error) {
      console.error('❌ [FARM-CONTEXT-CACHE] Erreur mise à jour fermes:', error);
    }
  }
}
