import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SimpleInitService, UserFarm } from '../services/SimpleInitService';
import { FarmService } from '../services/FarmService';
import { FarmDataCacheService, TaskData } from '../services/FarmDataCacheService';
import { FarmContextCacheService } from '../services/FarmContextCacheService';
import { useAuth } from './AuthContext';
import type { PlotData } from '../design-system/components/cards/PlotCardStandard';
import type { MaterialFromDB } from '../services/MaterialService';
import type { Culture } from '../types';
import type { Database } from '../types/database';

type FarmUpdate = Database['public']['Tables']['farms']['Update'];
type FarmInsert = Database['public']['Tables']['farms']['Insert'];

interface FarmContextType {
  // État des fermes
  farms: UserFarm[];
  activeFarm: UserFarm | null;
  loading: boolean;
  error: string | null;
  needsSetup: boolean; // true si l'utilisateur doit créer sa première ferme

  // Données métier de la ferme active (cache)
  farmData: {
    plots: PlotData[];
    materials: MaterialFromDB[];
    cultures: Culture[];
    tasks: TaskData[];
    user_conversion_units: any[]; // Ajout des conversions utilisateur
    loading: boolean;
    lastUpdated: Date | null;
  };

  // Actions fermes
  changeActiveFarm: (farm: UserFarm) => Promise<void>;
  createFirstFarm: (farmData: { name: string; description?: string; farm_type?: string }) => Promise<void>;
  createFarm: (farmData: Omit<FarmInsert, 'owner_id'>) => Promise<UserFarm>;
  updateFarm: (farmId: number, updates: FarmUpdate) => Promise<void>;
  deleteFarm: (farmId: number) => Promise<void>;
  refreshFarms: () => Promise<void>;
  
  // Actions données métier
  refreshFarmData: () => Promise<void>;
  invalidateFarmData: (dataTypes?: ('plots' | 'materials' | 'cultures' | 'tasks')[]) => Promise<void>;
  refreshFarmDataSilently: (dataTypes?: ('plots' | 'materials' | 'cultures' | 'tasks')[]) => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

interface FarmProviderProps {
  children: ReactNode;
  initialFarms?: UserFarm[];
  initialActiveFarm?: UserFarm | null;
  initialNeedsSetup?: boolean;
}

export const FarmProvider: React.FC<FarmProviderProps> = ({ 
  children, 
  initialFarms, 
  initialActiveFarm,
  initialNeedsSetup 
}) => {
  const { user } = useAuth();
  const [farms, setFarms] = useState<UserFarm[]>(initialFarms || []);
  const [activeFarm, setActiveFarm] = useState<UserFarm | null>(initialActiveFarm || null);
  const [loading, setLoading] = useState(!initialFarms); // Pas de loading si initialisé
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(initialNeedsSetup || false);

  // État pour les données métier de la ferme active
  const [farmData, setFarmData] = useState<{
    plots: PlotData[];
    materials: MaterialFromDB[];
    cultures: Culture[];
    tasks: TaskData[];
    user_conversion_units: any[];
    loading: boolean;
    lastUpdated: Date | null;
  }>({
    plots: [],
    materials: [],
    cultures: [],
    tasks: [],
    user_conversion_units: [],
    loading: false,
    lastUpdated: null,
  });

  // Initialisation simple et unique
  useEffect(() => {
    // Si données initiales fournies, skip l'initialisation et charger les données de la ferme active
    if (initialFarms) {
      console.log('✅ [FARM-CONTEXT] Données initiales fournies, skip initialisation');
      setLoading(false);
      setNeedsSetup(initialFarms.length === 0);
      
      // Charger les données de la ferme active si disponible
      if (initialActiveFarm) {
        loadFarmData(initialActiveFarm.farm_id);
      }
      return;
    }

    const initializeFarms = async () => {
      if (!user) {
        // Réinitialiser l'état si pas d'utilisateur
        setFarms([]);
        setActiveFarm(null);
        setLoading(false);
        setNeedsSetup(false);
        setError(null);
        
        // Nettoyer les données métier
        setFarmData({
          plots: [],
          materials: [],
          cultures: [],
          tasks: [],
          user_conversion_units: [],
          loading: false,
          lastUpdated: null,
        });
        
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 [FARM-CONTEXT] Initialisation pour:', user.email);
        
        // Ajouter un timeout global pour éviter les blocages
        const initPromise = SimpleInitService.initializeUserFarms(user.id);
        // TIMEOUT FIXE 120s - FINI LES EMMERDES
        const globalTimeoutMs = 120000; // 2 minutes FIXE
        console.log(`⏰ [FARM-CONTEXT] Timeout FIXE 120s - FINI LES PROBLÈMES !`);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout initialisation fermes (120s FIXE)')), globalTimeoutMs)
        );
        
        const result = await Promise.race([initPromise, timeoutPromise]);
        
        setFarms(result.farms);
        setActiveFarm(result.activeFarm);
        setNeedsSetup(result.needsSetup);
        
        // Sauvegarder dans le cache pour mode hors ligne
        await FarmContextCacheService.saveFarmContext(
          user.id,
          result.farms,
          result.activeFarm,
          result.needsSetup
        );
        
        console.log('✅ [FARM-CONTEXT] Initialisation terminée:', {
          fermes: result.farms.length,
          active: result.activeFarm?.farm_name,
          setup: result.needsSetup
        });

        // Si ferme active disponible, charger ses données
        if (result.activeFarm) {
          loadFarmData(result.activeFarm.farm_id);
        }
        
      } catch (err) {
        console.error('❌ [FARM-CONTEXT] Erreur initialisation:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des fermes';
        setError(errorMessage);
        
        // En cas d'erreur, vider l'état
        setFarms([]);
        setActiveFarm(null);
        setNeedsSetup(false);
        
      } finally {
        setLoading(false);
      }
    };

    initializeFarms();
  }, [user, initialFarms, initialActiveFarm]);

  // Charger les données métier d'une ferme
  const loadFarmData = async (farmId: number) => {
    if (!farmId) return;

    try {
      console.log('🔄 [FARM-CONTEXT] Chargement données ferme:', farmId);
      
      setFarmData(prev => ({ ...prev, loading: true }));

      const data = await FarmDataCacheService.loadFarmData(farmId);
      
      setFarmData({
        plots: data.plots,
        materials: data.materials,
        cultures: data.cultures,
        tasks: data.tasks,
        user_conversion_units: (data as any).user_conversion_units || [],
        loading: false,
        lastUpdated: new Date(),
      });

      console.log('✅ [FARM-CONTEXT] Données ferme chargées:', {
        plots: data.plots.length,
        materials: data.materials.length,
        cultures: data.cultures.length,
        tasks: data.tasks.length,
        complete: data.isComplete
      });

    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur chargement données ferme:', err);
      setFarmData(prev => ({ 
        ...prev, 
        loading: false,
        // Garder les données existantes en cas d'erreur
      }));
    }
  };

  // Rafraîchir les données métier de la ferme active
  const refreshFarmData = async () => {
    if (!activeFarm) return;
    
    console.log('🔄 [FARM-CONTEXT] Rafraîchissement données ferme');
    
    // Invalider le cache et recharger
    await FarmDataCacheService.invalidateFarmCache(activeFarm.farm_id);
    await loadFarmData(activeFarm.farm_id);
  };

  // Invalider partiellement les données (ex: après création d'une parcelle)
  const invalidateFarmData = async (dataTypes?: ('plots' | 'materials' | 'cultures' | 'tasks')[]) => {
    if (!activeFarm) return;
    
    console.log('🗑️ [FARM-CONTEXT] Invalidation données:', dataTypes || 'toutes');
    
    if (dataTypes) {
      await FarmDataCacheService.invalidatePartialCache(activeFarm.farm_id, dataTypes);
    } else {
      await FarmDataCacheService.invalidateFarmCache(activeFarm.farm_id);
    }
    
    // Recharger les données
    await loadFarmData(activeFarm.farm_id);
  };

  // Version silencieuse pour rafraîchir en arrière-plan sans loading
  const refreshFarmDataSilently = async (dataTypes?: ('plots' | 'materials' | 'cultures' | 'tasks')[]) => {
    if (!activeFarm) return;
    
    try {
      console.log('🔄 [FARM-CONTEXT] Rafraîchissement silencieux:', dataTypes || 'toutes');
      
      // Invalider le cache
      if (dataTypes) {
        await FarmDataCacheService.invalidatePartialCache(activeFarm.farm_id, dataTypes);
      } else {
        await FarmDataCacheService.invalidateFarmCache(activeFarm.farm_id);
      }

      // Recharger les données SANS mettre loading: true
      const data = await FarmDataCacheService.loadFarmData(activeFarm.farm_id);
      
      setFarmData(prev => ({
        ...prev, // Garder loading: false
        plots: data.plots,
        materials: data.materials,
        cultures: data.cultures,
        tasks: data.tasks,
        user_conversion_units: data.user_conversion_units || [],
        lastUpdated: new Date(),
      }));

      console.log('✅ [FARM-CONTEXT] Rafraîchissement silencieux terminé');

    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur rafraîchissement silencieux:', err);
      // Ne pas changer l'état en cas d'erreur
    }
  };

  // Changer la ferme active
  const changeActiveFarm = async (farm: UserFarm) => {
    if (!user) return;
    
    try {
      console.log('🔄 [FARM-CONTEXT] Changement ferme active:', farm.farm_name);
      
      setActiveFarm(farm);
      
      // Sauvegarder dans le cache même si l'API échoue (mode hors ligne)
      await SimpleInitService.setActiveFarm(user.id, farm.farm_id, farm);
      
      // Charger les données de la nouvelle ferme active
      await loadFarmData(farm.farm_id);
      
      console.log('✅ [FARM-CONTEXT] Ferme active changée et données chargées');
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur changement ferme:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de ferme');
    }
  };

  // Créer la première ferme
  const createFirstFarm = async (farmData: { name: string; description?: string; farm_type?: string }) => {
    if (!user) return;
    
    try {
      console.log('🏗️ [FARM-CONTEXT] Création première ferme:', farmData.name);
      
      setLoading(true);
      setError(null);
      
      const newFarm = await SimpleInitService.createFirstFarm(user.id, farmData);
      
      // Mettre à jour l'état local
      setFarms([newFarm]);
      setActiveFarm(newFarm);
      setNeedsSetup(false);
      
      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        user.id,
        [newFarm],
        newFarm,
        false
      );
      
      console.log('✅ [FARM-CONTEXT] Première ferme créée');
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur création ferme:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la ferme');
    } finally {
      setLoading(false);
    }
  };

  // Créer une nouvelle ferme
  const createFarm = async (farmData: Omit<FarmInsert, 'owner_id'>): Promise<UserFarm> => {
    if (!user) throw new Error('Utilisateur non connecté');
    
    try {
      console.log('🏗️ [FARM-CONTEXT] Création ferme:', farmData.name);
      
      setLoading(true);
      setError(null);
      
      const newFarm = await FarmService.createFarm(farmData, user.id);
      
      // Convertir Farm en UserFarm
      const userFarm: UserFarm = {
        farm_id: newFarm.id,
        farm_name: newFarm.name,
        role: 'owner',
        is_owner: true,
      };
      
      // Ajouter à la liste des fermes
      const updatedFarms = [...farms, userFarm];
      setFarms(updatedFarms);
      
      // Si c'est la première ferme ou si needsSetup est true, la définir comme active
      if (farms.length === 0 || needsSetup) {
        setActiveFarm(userFarm);
        setNeedsSetup(false);
        await SimpleInitService.setActiveFarm(user.id, userFarm.farm_id, userFarm);
        await loadFarmData(userFarm.farm_id);
      }
      
      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        user.id,
        updatedFarms,
        activeFarm || userFarm,
        false
      );
      
      console.log('✅ [FARM-CONTEXT] Ferme créée:', userFarm.farm_name);
      return userFarm;
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur création ferme:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la ferme';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une ferme
  const updateFarm = async (farmId: number, updates: FarmUpdate): Promise<void> => {
    if (!user) throw new Error('Utilisateur non connecté');
    
    try {
      console.log('🔄 [FARM-CONTEXT] Mise à jour ferme:', farmId);
      
      setLoading(true);
      setError(null);
      
      const updatedFarm = await FarmService.updateFarm(farmId, updates);
      
      // Mettre à jour la liste des fermes
      const updatedFarms = farms.map(farm => 
        farm.farm_id === farmId
          ? { ...farm, farm_name: updatedFarm.name || farm.farm_name }
          : farm
      );
      setFarms(updatedFarms);
      
      // Si c'est la ferme active, mettre à jour
      let updatedActiveFarm = activeFarm;
      if (activeFarm?.farm_id === farmId) {
        updatedActiveFarm = {
          ...activeFarm,
          farm_name: updatedFarm.name || activeFarm.farm_name,
        };
        setActiveFarm(updatedActiveFarm);
      }
      
      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        user.id,
        updatedFarms,
        updatedActiveFarm,
        needsSetup
      );
      
      console.log('✅ [FARM-CONTEXT] Ferme mise à jour');
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur mise à jour ferme:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la ferme';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une ferme
  const deleteFarm = async (farmId: number): Promise<void> => {
    if (!user) throw new Error('Utilisateur non connecté');
    
    try {
      console.log('🗑️ [FARM-CONTEXT] Suppression ferme:', farmId);
      
      setLoading(true);
      setError(null);
      
      await FarmService.deleteFarm(farmId);
      
      // Retirer de la liste des fermes
      const updatedFarms = farms.filter(farm => farm.farm_id !== farmId);
      setFarms(updatedFarms);
      
      // Si c'était la ferme active, sélectionner une autre ou null
      let newActiveFarm = activeFarm;
      if (activeFarm?.farm_id === farmId) {
        newActiveFarm = updatedFarms.length > 0 ? updatedFarms[0] : null;
        setActiveFarm(newActiveFarm);
        if (newActiveFarm) {
          await SimpleInitService.setActiveFarm(user.id, newActiveFarm.farm_id, newActiveFarm);
          await loadFarmData(newActiveFarm.farm_id);
        } else {
          setNeedsSetup(true);
        }
      }
      
      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        user.id,
        updatedFarms,
        newActiveFarm,
        updatedFarms.length === 0
      );
      
      console.log('✅ [FARM-CONTEXT] Ferme supprimée');
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur suppression ferme:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de la ferme';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Rafraîchir les fermes depuis l'API
  const refreshFarms = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 [FARM-CONTEXT] Rafraîchissement des fermes');
      
      setLoading(true);
      setError(null);
      
      const result = await SimpleInitService.initializeUserFarms(user.id);
      
      setFarms(result.farms);
      setActiveFarm(result.activeFarm);
      setNeedsSetup(result.needsSetup);
      
      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        user.id,
        result.farms,
        result.activeFarm,
        result.needsSetup
      );
      
      console.log('✅ [FARM-CONTEXT] Fermes rafraîchies');
      
    } catch (err) {
      console.error('❌ [FARM-CONTEXT] Erreur rafraîchissement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
    }
  };

  const value: FarmContextType = {
    farms,
    activeFarm,
    loading,
    error,
    needsSetup,
    farmData,
    changeActiveFarm,
    createFirstFarm,
    createFarm,
    updateFarm,
    deleteFarm,
    refreshFarms,
    refreshFarmData,
    invalidateFarmData,
    refreshFarmDataSilently,
  };

  return (
    <FarmContext.Provider value={value}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = (): FarmContextType => {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
};

// Hooks utilitaires pour accéder aux données spécifiques
export const useFarmPlots = () => {
  const { farmData } = useFarm();
  return {
    plots: farmData.plots,
    loading: farmData.loading,
    lastUpdated: farmData.lastUpdated,
  };
};

export const useFarmMaterials = () => {
  const { farmData } = useFarm();
  return {
    materials: farmData.materials,
    loading: farmData.loading,
    lastUpdated: farmData.lastUpdated,
  };
};

export const useFarmTasks = () => {
  const { farmData } = useFarm();
  return {
    tasks: farmData.tasks,
    loading: farmData.loading,
    lastUpdated: farmData.lastUpdated,
  };
};

export const useFarmCultures = () => {
  const { farmData } = useFarm();
  return {
    cultures: farmData.cultures,
    loading: farmData.loading,
    lastUpdated: farmData.lastUpdated,
  };
};