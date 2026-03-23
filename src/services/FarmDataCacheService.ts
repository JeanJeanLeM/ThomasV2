import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlotService } from './plotService';
import { MaterialService } from './MaterialService';
import { CultureService, cultureService } from './CultureService';
import { DirectSupabaseService } from './DirectSupabaseService';
import type { PlotData } from '../design-system/components/cards/PlotCardStandard';
import type { MaterialFromDB } from './MaterialService';
import type { Culture, UserCulturePreferences, UserPhytosanitaryPreferences } from '../types';

// Types pour le cache des données ferme
export interface FarmDataCache {
  plots: PlotData[];
  materials: MaterialFromDB[];
  cultures: Culture[];
  tasks: TaskData[]; // À définir quand TaskService existera
  cachedAt: number;
  farmId: number;
}

export interface TaskData {
  id: string;
  title: string;
  date: string;
  status: 'en_attente' | 'en_cours' | 'terminee';
  dbStatus?: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee'; // Statut original de la DB
  type: 'completed' | 'planned'; // Type pour l'affichage des cartes
  priority: 'basse' | 'moyenne' | 'haute' | 'urgente';
  action?: string; // Action principale (récolter, planter, traiter, etc.)
  standard_action?: string | null; // Code action standard normalisé (réf. task_standard_actions)
  duration_minutes?: number; // Durée en minutes
  number_of_people?: number; // Nombre de personnes
  plants?: string[]; // Cultures/plantes
  plot_ids?: string[]; // IDs des parcelles
  material_ids?: string[]; // IDs des matériels/outils
  quantity?: { value: number; unit: string }; // Quantité avec unité
  quantity_converted?: { value: number; unit: string }; // Quantité convertie (ex: bottes -> kg)
  quantity_nature?: string; // Nature spécifique (laitues, compost, bouillie...)
  quantity_type?: string; // Type: engrais, produit_phyto, recolte, plantation, vente
  phytosanitary_product_amm?: string | null; // AMM du produit phytosanitaire (pour matching)
}

// Durées de cache par type de données
const CACHE_DURATIONS = {
  PLOTS: 30 * 60 * 1000,      // 30 min - Les parcelles changent peu
  MATERIALS: 20 * 60 * 1000,   // 20 min - Les matériels changent peu  
  CULTURES: 60 * 60 * 1000,    // 1h - Les cultures changent très peu
  TASKS: 5 * 60 * 1000,        // 5 min - Les tâches changent souvent
  USER_CULTURE_PREFERENCES: 60 * 60 * 1000, // 1h - Les préférences changent peu
  USER_PHYTO_PREFERENCES: 60 * 60 * 1000, // 1h - Les préférences produits phyto changent peu
} as const;

// Clés de cache
const CACHE_KEYS = {
  FARM_DATA: (farmId: number) => `@farm_data_${farmId}`,
  LAST_SYNC: (farmId: number) => `@farm_data_sync_${farmId}`,
  USER_CULTURE_PREFERENCES: (userId: string, farmId: number) => `@user_culture_prefs_${userId}_${farmId}`,
  USER_PHYTO_PREFERENCES: (userId: string, farmId: number) => `@user_phyto_prefs_${userId}_${farmId}`,
} as const;

/**
 * Service de cache pour les données métier de la ferme active
 * 
 * Philosophie :
 * - Chargement progressif par priorité  
 * - Cache intelligent avec durées différenciées
 * - Invalidation automatique et manuelle
 * - Chargement non-bloquant en arrière-plan
 */
export class FarmDataCacheService {

  /**
   * Charge toutes les données d'une ferme de façon progressive
   * Retourne immédiatement avec les données critiques, continue en arrière-plan
   */
  static async loadFarmData(farmId: number): Promise<{
    plots: PlotData[];
    materials: MaterialFromDB[];
    cultures: Culture[];
    tasks: TaskData[];
    isComplete: boolean;
  }> {
    try {
      console.log('🚀 [FARM-CACHE] Chargement progressif pour ferme:', farmId);

      console.log('🔄 [FARM-CACHE] Chargement des données de la ferme');

      // 1. Vérifier le cache d'abord
      const cachedData = await this.getCachedFarmData(farmId);
      if (cachedData && this.isCacheValid(cachedData, 'PLOTS')) {
        console.log('✅ [FARM-CACHE] Cache trouvé');
        
        // Vérifier si les tâches sont valides aussi
        const tasksValid = this.isCacheValid(cachedData, 'TASKS');
        
        if (!tasksValid || cachedData.tasks.length === 0) {
          console.log('🔄 [FARM-CACHE] Tâches vides ou invalides, rechargement immédiat');
          // Si pas de tâches, les charger immédiatement (pas en arrière-plan)
          const tasks = await this.getWeeklyTasks(farmId);
          console.log('✅ [FARM-CACHE] Tâches rechargées:', tasks.length);
          cachedData.tasks = tasks;
          cachedData.cachedAt = Date.now();
          await this.saveFarmDataToCache(cachedData);
        }
        
        console.log('📦 [FARM-CACHE] Retour des données:', {
          plots: cachedData.plots.length,
          materials: cachedData.materials.length,
          cultures: cachedData.cultures.length,
          tasks: cachedData.tasks.length
        });
        
        return {
          plots: cachedData.plots,
          materials: cachedData.materials,
          cultures: cachedData.cultures,
          tasks: cachedData.tasks,
          isComplete: true
        };
      }

      // 2. Cache invalide ou absent - Chargement progressif
      console.log('🔄 [FARM-CACHE] Cache invalide, chargement depuis API');

      // Test de connectivité rapide avant chargement
      const isConnected = await this.testConnectivity();
      
      if (!isConnected) {
        console.error('❌ [FARM-CACHE] Pas de connectivité Database');
        
        // Fallback sur cache même expiré ou données vides
        return {
          plots: cachedData?.plots || [],
          materials: cachedData?.materials || [],
          cultures: cachedData?.cultures || [],
          tasks: cachedData?.tasks || [],
          isComplete: false
        };
      }

      // Étape 1: Données critiques (parallèle pour vitesse)
      const [plots, materials] = await Promise.all([
        PlotService.getPlotsByFarm(farmId).catch(err => {
          console.error('❌ [FARM-CACHE] Erreur chargement parcelles:', err);
          return cachedData?.plots || [];
        }),
        MaterialService.getMaterialsByFarm(farmId).catch(err => {
          console.error('❌ [FARM-CACHE] Erreur chargement matériels:', err);
          return cachedData?.materials || [];
        })
      ]);

      console.log('✅ [FARM-CACHE] Données critiques chargées:', {
        plots: plots.length,
        materials: materials.length
      });

      // Retourner immédiatement les données critiques
      const result = {
        plots,
        materials,
        cultures: cachedData?.cultures || [],
        tasks: cachedData?.tasks || [],
        isComplete: false
      };

      // Étape 2: Charger le reste en arrière-plan (non-bloquant)
      this.loadSecondaryDataInBackground(farmId, plots, materials);

      return result;

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur chargement ferme:', error);
      
      // Fallback sur cache même expiré
      const cachedData = await this.getCachedFarmData(farmId);
      return {
        plots: cachedData?.plots || [],
        materials: cachedData?.materials || [],
        cultures: cachedData?.cultures || [],
        tasks: cachedData?.tasks || [],
        isComplete: false
      };
    }
  }

  /**
   * Charge les données secondaires en arrière-plan
   */
  private static async loadSecondaryDataInBackground(
    farmId: number, 
    plots: PlotData[], 
    materials: MaterialFromDB[]
  ): Promise<void> {
    try {
      console.log('🔄 [FARM-CACHE] Chargement données secondaires en arrière-plan');

      // Attendre 2s pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Charger cultures et tâches via services directs
      const [cultures, tasks] = await Promise.all([
        cultureService.getCultures(farmId).catch(err => {
          console.error('❌ [FARM-CACHE] Erreur chargement cultures:', err);
          return [];
        }),
        this.getWeeklyTasks(farmId).catch(err => {
          console.error('❌ [FARM-CACHE] Erreur chargement tâches:', err);  
          return [];
        })
      ]);

      // Sauvegarder tout en cache
      const farmData: FarmDataCache = {
        plots,
        materials,
        cultures,
        tasks,
        cachedAt: Date.now(),
        farmId
      };

      await this.saveFarmDataToCache(farmData);
      console.log('✅ [FARM-CACHE] Données secondaires sauvegardées en cache');

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur chargement arrière-plan:', error);
    }
  }

  /**
   * Refresh uniquement les tâches en arrière-plan (si elles sont déjà présentes)
   * NOTE: Cette fonction n'est plus utilisée car on charge les tâches immédiatement
   */
  private static async refreshTasksInBackground(farmId: number, cachedData: FarmDataCache): Promise<void> {
    try {
      if (this.isCacheValid(cachedData, 'TASKS')) {
        return; // Tâches encore valides
      }

      console.log('🔄 [FARM-CACHE] Refresh tâches en arrière-plan');
      
      const tasks = await this.getWeeklyTasks(farmId);
      
      // Mettre à jour seulement les tâches dans le cache
      const updatedData: FarmDataCache = {
        ...cachedData,
        tasks,
        cachedAt: Date.now()
      };

      await this.saveFarmDataToCache(updatedData);
      console.log('✅ [FARM-CACHE] Tâches rafraîchies en arrière-plan');

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur refresh tâches:', error);
    }
  }

  /**
   * Récupère les tâches de la semaine courante
   */
  private static async getWeeklyTasks(farmId: number): Promise<TaskData[]> {
    try {
      const tasksResult = await DirectSupabaseService.directSelect(
        'tasks',
        'id,title,date,status,type,priority,action,standard_action,duration_minutes,number_of_people,plants,plot_ids,material_ids,quantity_value,quantity_unit,quantity_converted_value,quantity_converted_unit,quantity_nature,quantity_type,phytosanitary_product_amm',
        [
          { column: 'farm_id', value: farmId },
          { column: 'is_active', value: true } // Filtrer uniquement les tâches actives
        ]
      );
      
      if (tasksResult.error) {
        console.warn('⚠️ [FARM-CACHE] Erreur chargement tâches:', tasksResult.error);
        return [];
      }
      
      const tasks = (tasksResult.data || []).map((task: any) => {
        return {
          id: task.id,
          title: task.title,
          date: task.date,
          status: task.status,
          dbStatus: task.status, // Ajouter dbStatus pour compatibilité avec TasksScreen
          type: task.status === 'terminee' ? 'completed' : 'planned', // Mapper le status vers le type attendu par les cartes
          priority: task.priority,
          action: task.action, // Action principale
          standard_action: task.standard_action || null, // Code action standard normalisé
          duration_minutes: task.duration_minutes, // Durée
          number_of_people: task.number_of_people, // Nombre de personnes
          plants: task.plants || [], // Cultures/plantes
          plot_ids: task.plot_ids || [], // Parcelles
          material_ids: task.material_ids || [], // Matériels
          // Reconstruire l'objet quantity depuis les colonnes séparées
          quantity: task.quantity_value && task.quantity_unit 
            ? { value: task.quantity_value, unit: task.quantity_unit }
            : undefined,
          // Reconstruire l'objet quantity_converted depuis les colonnes séparées
          quantity_converted: task.quantity_converted_value && task.quantity_converted_unit 
            ? { value: task.quantity_converted_value, unit: task.quantity_converted_unit }
            : undefined,
          quantity_nature: task.quantity_nature, // Nature spécifique (nom du produit pour affichage)
          quantity_type: task.quantity_type, // Type de quantité
          phytosanitary_product_amm: task.phytosanitary_product_amm || null, // AMM pour matching
        };
      });
      
      console.log('✅ [FARM-CACHE] Tâches chargées:', {
        total: tasks.length,
        completed: tasks.filter((t: TaskData) => t.status === 'terminee').length,
        planned: tasks.filter((t: TaskData) => t.status === 'en_attente' || t.status === 'en_cours').length
      });
      
      return tasks;
      
    } catch (error) {
      console.error('❌ [FARM-CACHE] Exception tâches:', error);
      return [];
    }
  }

  /**
   * Sauvegarde les données ferme en cache
   */
  private static async saveFarmDataToCache(farmData: FarmDataCache): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.FARM_DATA(farmData.farmId), 
        JSON.stringify(farmData)
      );
      
      await AsyncStorage.setItem(
        CACHE_KEYS.LAST_SYNC(farmData.farmId),
        Date.now().toString()
      );

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Récupère les données ferme du cache
   */
  private static async getCachedFarmData(farmId: number): Promise<FarmDataCache | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.FARM_DATA(farmId));
      
      if (!cached) return null;

      const farmData: FarmDataCache = JSON.parse(cached);
      
      // Vérifier que le cache correspond à la bonne ferme
      if (farmData.farmId !== farmId) {
        console.log('⚠️ [FARM-CACHE] Cache ne correspond pas à la ferme actuelle');
        return null;
      }

      return farmData;

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * Vérifie si une partie du cache est encore valide
   */
  private static isCacheValid(farmData: FarmDataCache, dataType: keyof typeof CACHE_DURATIONS): boolean {
    const now = Date.now();
    const cacheAge = now - farmData.cachedAt;
    return cacheAge < CACHE_DURATIONS[dataType];
  }

  /**
   * Invalide le cache d'une ferme (après modification)
   */
  static async invalidateFarmCache(farmId: number): Promise<void> {
    try {
      console.log('🗑️ [FARM-CACHE] Invalidation cache ferme:', farmId);
      
      await AsyncStorage.multiRemove([
        CACHE_KEYS.FARM_DATA(farmId),
        CACHE_KEYS.LAST_SYNC(farmId)
      ]);

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur invalidation cache:', error);
    }
  }

  /**
   * Invalide partiellement le cache (ex: seulement les parcelles).
   * En mettant cachedAt à 0, le prochain loadFarmData considère le cache expiré
   * et recharge depuis la DB pour les types concernés.
   */
  static async invalidatePartialCache(farmId: number, dataTypes: ('plots' | 'materials' | 'cultures' | 'tasks')[]): Promise<void> {
    try {
      const cachedData = await this.getCachedFarmData(farmId);
      if (!cachedData) return;

      console.log('🔄 [FARM-CACHE] Invalidation partielle:', dataTypes);

      // Forcer l'expiration du cache pour que le prochain loadFarmData recharge depuis la DB
      const updatedData: FarmDataCache = {
        ...cachedData,
        cachedAt: 0,
      };

      await this.saveFarmDataToCache(updatedData);

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur invalidation partielle:', error);
    }
  }


  /**
   * Test de connectivité avec timeout 120s
   */
  private static async testConnectivity(): Promise<boolean> {
    try {
      const { error } = await Promise.race([
        DirectSupabaseService.directSelect('farms', 'id', undefined, true),
        // Timeout logique de 120s qui renvoie une "erreur" standardisée
        new Promise<{ data: null; error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: { message: 'Timeout' } }),
            120000
          )
        ),
      ]);

      if (error && error.message === 'Timeout') {
        console.error('❌ [FARM-CACHE] Test connectivité timeout (120s)');
      }

      return !error;
    } catch (error) {
      console.error('❌ [FARM-CACHE] Test connectivité échoue:', error);
      return false;
    }
  }

  /**
   * Obtient les statistiques du cache pour debug
   */
  static async getCacheStats(farmId: number): Promise<{
    hasCache: boolean;
    ageMinutes: number;
    dataTypes: string[];
    sizes: Record<string, number>;
  }> {
    try {
      const cachedData = await this.getCachedFarmData(farmId);
      
      if (!cachedData) {
        return {
          hasCache: false,
          ageMinutes: 0,
          dataTypes: [],
          sizes: {}
        };
      }

      const ageMinutes = Math.round((Date.now() - cachedData.cachedAt) / (1000 * 60));
      
      return {
        hasCache: true,
        ageMinutes,
        dataTypes: ['plots', 'materials', 'cultures', 'tasks'],
        sizes: {
          plots: cachedData.plots.length,
          materials: cachedData.materials.length,
          cultures: cachedData.cultures.length,
          tasks: cachedData.tasks.length
        }
      };

    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur stats cache:', error);
      return {
        hasCache: false,
        ageMinutes: 0,
        dataTypes: [],
        sizes: {}
      };
    }
  }

  /**
   * Sauvegarde les préférences de cultures utilisateur en cache
   */
  static async saveUserCulturePreferences(
    userId: string,
    farmId: number,
    preferences: UserCulturePreferences
  ): Promise<void> {
    try {
      const cacheData = {
        preferences,
        cachedAt: Date.now(),
      };
      
      await AsyncStorage.setItem(
        CACHE_KEYS.USER_CULTURE_PREFERENCES(userId, farmId),
        JSON.stringify(cacheData)
      );
      
      console.log('✅ [FARM-CACHE] Préférences cultures sauvegardées en cache');
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur sauvegarde préférences:', error);
    }
  }

  /**
   * Récupère les préférences de cultures utilisateur du cache
   */
  static async getCachedUserCulturePreferences(
    userId: string,
    farmId: number
  ): Promise<UserCulturePreferences | null> {
    try {
      const cached = await AsyncStorage.getItem(
        CACHE_KEYS.USER_CULTURE_PREFERENCES(userId, farmId)
      );
      
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cacheAge = Date.now() - cacheData.cachedAt;
      
      // Vérifier si le cache est encore valide
      if (cacheAge > CACHE_DURATIONS.USER_CULTURE_PREFERENCES) {
        console.log('⚠️ [FARM-CACHE] Cache préférences expiré');
        return null;
      }

      return cacheData.preferences;
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur lecture cache préférences:', error);
      return null;
    }
  }

  /**
   * Invalide le cache des préférences de cultures utilisateur
   */
  static async invalidateUserCulturePreferences(
    userId: string,
    farmId: number
  ): Promise<void> {
    try {
      console.log('🗑️ [FARM-CACHE] Invalidation cache préférences cultures');
      
      await AsyncStorage.removeItem(
        CACHE_KEYS.USER_CULTURE_PREFERENCES(userId, farmId)
      );
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur invalidation cache préférences:', error);
    }
  }

  // ============================================================================
  // Cache des préférences produits phytosanitaires
  // ============================================================================

  /**
   * Sauvegarde les préférences de produits phytosanitaires utilisateur en cache
   */
  static async saveUserPhytoPreferences(
    userId: string,
    farmId: number,
    preferences: UserPhytosanitaryPreferences
  ): Promise<void> {
    try {
      const cacheData = {
        preferences,
        cachedAt: Date.now(),
      };
      
      await AsyncStorage.setItem(
        CACHE_KEYS.USER_PHYTO_PREFERENCES(userId, farmId),
        JSON.stringify(cacheData)
      );
      
      console.log('✅ [FARM-CACHE] Préférences produits phyto sauvegardées en cache');
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur sauvegarde préférences phyto:', error);
    }
  }

  /**
   * Récupère les préférences de produits phytosanitaires utilisateur du cache
   */
  static async getCachedUserPhytoPreferences(
    userId: string,
    farmId: number
  ): Promise<UserPhytosanitaryPreferences | null> {
    try {
      const cached = await AsyncStorage.getItem(
        CACHE_KEYS.USER_PHYTO_PREFERENCES(userId, farmId)
      );
      
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const cacheAge = Date.now() - cacheData.cachedAt;
      
      // Vérifier si le cache est encore valide
      if (cacheAge > CACHE_DURATIONS.USER_PHYTO_PREFERENCES) {
        console.log('⚠️ [FARM-CACHE] Cache préférences phyto expiré');
        return null;
      }

      return cacheData.preferences;
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur lecture cache préférences phyto:', error);
      return null;
    }
  }

  /**
   * Invalide le cache des préférences de produits phytosanitaires utilisateur
   */
  static async invalidateUserPhytoPreferences(
    userId: string,
    farmId: number
  ): Promise<void> {
    try {
      console.log('🗑️ [FARM-CACHE] Invalidation cache préférences produits phyto');
      
      await AsyncStorage.removeItem(
        CACHE_KEYS.USER_PHYTO_PREFERENCES(userId, farmId)
      );
    } catch (error) {
      console.error('❌ [FARM-CACHE] Erreur invalidation cache préférences phyto:', error);
    }
  }
}
