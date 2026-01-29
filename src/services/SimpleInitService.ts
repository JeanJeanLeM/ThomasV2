import { supabase } from '../utils/supabase';
import type { Database } from '../types/database';
import { DirectSupabaseService } from './DirectSupabaseService';
import { FarmContextCacheService } from './FarmContextCacheService';

// Types simples pour l'initialisation
export interface UserFarm {
  farm_id: number;
  farm_name: string;
  role: string;
  is_owner: boolean;
}

export interface InitializationResult {
  farms: UserFarm[];
  activeFarm: UserFarm | null;
  needsSetup: boolean; // true si l'utilisateur n'a aucune ferme
}

/**
 * Service d'initialisation PROPRE pour Thomas V2
 * 
 * Utilise fetch() direct car le client Supabase JS a des problèmes de timeout
 * Performance optimisée et fiable
 */
export class SimpleInitService {
  
  /**
   * Initialise les fermes pour un utilisateur
   * Supporte le mode hors ligne via cache
   */
  static async initializeUserFarms(userId: string): Promise<InitializationResult> {
    try {
      console.log('🚀 [SIMPLE-INIT] Initialisation pour utilisateur:', userId.substring(0, 8) + '...');

      // 1. Essayer de charger depuis le cache d'abord (pour mode hors ligne)
      const cachedContext = await FarmContextCacheService.getCachedFarmContext(userId);
      if (cachedContext) {
        console.log('📦 [SIMPLE-INIT] Cache trouvé, utilisation en mode hors ligne');
        // Retourner le cache immédiatement pour permettre l'utilisation hors ligne
        // L'API sera appelée en arrière-plan si possible
      }

      // 2. Essayer de charger depuis l'API
      let apiResult: InitializationResult | null = null;
      try {
        // 2.1. Récupérer le profil utilisateur via fetch direct
        console.log('👤 [SIMPLE-INIT] Récupération profil utilisateur...');
        const profileResult = await DirectSupabaseService.directSelect(
          'profiles',
          'id,latest_active_farm_id,first_name,last_name,email',
          [{ column: 'id', value: userId }],
          true
        );

        let profile = null;
        if (profileResult.error) {
          console.log('🆕 [SIMPLE-INIT] Profil inexistant, création automatique...');
          await this.createUserProfile(userId);
        } else {
          profile = profileResult.data;
          console.log('✅ [SIMPLE-INIT] Profil trouvé, ferme active:', profile.latest_active_farm_id || 'aucune');
        }

        // 2.2. Récupérer les fermes de l'utilisateur via fetch direct
        // Inclure les fermes où l'utilisateur est propriétaire ET membre
        console.log('🏢 [SIMPLE-INIT] Récupération fermes utilisateur...');
        
        // 2.2.1. Fermes où l'utilisateur est propriétaire
        const ownerFarmsResult = await DirectSupabaseService.directSelect(
          'farms',
          'id,name,owner_id,description,farm_type',
          [{ column: 'owner_id', value: userId }]
        );

        if (ownerFarmsResult.error) {
          console.error('❌ [SIMPLE-INIT] Erreur récupération fermes propriétaire:', ownerFarmsResult.error);
          throw new Error('Impossible de récupérer les fermes');
        }

        const ownerFarms: UserFarm[] = (ownerFarmsResult.data || []).map((farm: any) => ({
          farm_id: farm.id,
          farm_name: farm.name,
          role: 'owner',
          is_owner: true
        }));

        // 2.2.2. Fermes où l'utilisateur est membre (via farm_members)
        const memberFarmsResult = await DirectSupabaseService.directSelect(
          'farm_members',
          'farm_id,role',
          [
            { column: 'user_id', value: userId },
            { column: 'is_active', value: true }
          ]
        );

        let memberFarms: UserFarm[] = [];
        if (!memberFarmsResult.error && memberFarmsResult.data) {
          const memberData = memberFarmsResult.data as any[];
          const memberFarmIds = memberData.map(m => m.farm_id);
          
          // Récupérer les détails des fermes où l'utilisateur est membre
          if (memberFarmIds.length > 0) {
            const memberFarmsDetails = await Promise.all(
              memberFarmIds.map(farmId =>
                DirectSupabaseService.directSelect(
                  'farms',
                  'id,name,owner_id,description,farm_type',
                  [{ column: 'id', value: farmId }],
                  true
                )
              )
            );

            memberFarms = memberFarmsDetails
              .filter(r => !r.error && r.data)
              .map((r, index) => {
                const farm = r.data as any;
                const memberInfo = memberData.find(m => m.farm_id === farm.id);
                return {
                  farm_id: farm.id,
                  farm_name: farm.name,
                  role: memberInfo?.role || 'viewer',
                  is_owner: farm.owner_id === userId
                };
              });
          }
        }

        // 2.2.3. Combiner les fermes (propriétaire + membre), en évitant les doublons
        const allFarmIds = new Set([...ownerFarms.map(f => f.farm_id), ...memberFarms.map(f => f.farm_id)]);
        const userFarms: UserFarm[] = [];
        
        // Ajouter d'abord les fermes propriétaires
        ownerFarms.forEach(farm => {
          userFarms.push(farm);
        });
        
        // Ajouter les fermes membres (sauf celles déjà ajoutées comme propriétaire)
        memberFarms.forEach(farm => {
          if (!userFarms.find(f => f.farm_id === farm.farm_id)) {
            userFarms.push(farm);
          }
        });

        console.log('✅ [SIMPLE-INIT] Fermes trouvées:', userFarms.length, `(${ownerFarms.length} propriétaire, ${memberFarms.length} membre)`);

        // 2.3. Cas où l'utilisateur n'a pas de ferme
        if (userFarms.length === 0) {
          console.log('📝 [SIMPLE-INIT] Aucune ferme → Setup requis');
          apiResult = {
            farms: [],
            activeFarm: null,
            needsSetup: true
          };
        } else {
          // 2.4. Sélection de la ferme active
          let activeFarm: UserFarm | null = null;

          // Essayer la ferme mémorisée dans le profil
          if (profile?.latest_active_farm_id) {
            activeFarm = userFarms.find(farm => farm.farm_id === profile.latest_active_farm_id) || null;
            if (activeFarm) {
              console.log('✅ [SIMPLE-INIT] Ferme active restaurée:', activeFarm.farm_name);
            }
          }

          // Sinon, sélectionner la première ferme
          if (!activeFarm && userFarms.length > 0) {
            activeFarm = userFarms[0] || null;
            if (activeFarm) {
              console.log('🎯 [SIMPLE-INIT] Ferme active sélectionnée:', activeFarm.farm_name);
              
              // Sauvegarder le choix
              await this.setActiveFarm(userId, activeFarm.farm_id);
            }
          }

          apiResult = {
            farms: userFarms,
            activeFarm,
            needsSetup: false
          };
        }

        // 3. Sauvegarder le résultat dans le cache
        if (apiResult) {
          await FarmContextCacheService.saveFarmContext(
            userId,
            apiResult.farms,
            apiResult.activeFarm,
            apiResult.needsSetup
          );
        }

        console.log('✅ [SIMPLE-INIT] Initialisation terminée avec succès');
        return apiResult;

      } catch (apiError) {
        console.error('❌ [SIMPLE-INIT] Erreur API:', apiError);
        
        // 4. En cas d'erreur API, utiliser le cache si disponible
        if (cachedContext) {
          console.log('📦 [SIMPLE-INIT] Utilisation du cache en mode hors ligne');
          return {
            farms: cachedContext.farms,
            activeFarm: cachedContext.activeFarm,
            needsSetup: cachedContext.needsSetup
          };
        }

        // 5. Si pas de cache et erreur API, lancer l'erreur
        throw apiError;
      }

    } catch (error) {
      console.error('❌ [SIMPLE-INIT] Erreur initialisation:', error);
      throw error;
    }
  }

  /**
   * Crée un profil utilisateur via fetch direct
   */
  private static async createUserProfile(userId: string): Promise<void> {
    try {
      // Récupérer email depuis la session auth
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      
      console.log('📝 [SIMPLE-INIT] Création profil...');
      
      const response = await fetch(`${DirectSupabaseService.getBaseUrl()}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': DirectSupabaseService.getAnonKey(),
          'Authorization': `Bearer ${DirectSupabaseService.getAnonKey()}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: userId,
          email: userEmail,
          language: 'fr',
          notification_preferences: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [SIMPLE-INIT] Erreur création profil:', errorData);
        throw new Error('Impossible de créer le profil utilisateur');
      }

      console.log('✅ [SIMPLE-INIT] Profil créé avec succès');
      
    } catch (error) {
      console.error('❌ [SIMPLE-INIT] Exception création profil:', error);
      // Ne pas faire échouer l'initialisation pour ça
    }
  }

  /**
   * Change la ferme active pour un utilisateur
   * Met à jour le cache même en cas d'erreur API (mode hors ligne)
   */
  static async setActiveFarm(userId: string, farmId: number, activeFarm?: UserFarm): Promise<void> {
    try {
      console.log('🔄 [SIMPLE-INIT] Changement ferme active:', farmId);
      
      try {
        const response = await fetch(`${DirectSupabaseService.getBaseUrl()}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'apikey': DirectSupabaseService.getAnonKey(),
            'Authorization': `Bearer ${DirectSupabaseService.getAnonKey()}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            latest_active_farm_id: farmId
          })
        });

        if (!response.ok) {
          console.error('❌ [SIMPLE-INIT] Erreur sauvegarde ferme active');
          throw new Error('Impossible de sauvegarder la ferme active');
        }

        console.log('✅ [SIMPLE-INIT] Ferme active sauvegardée');
      } catch (apiError) {
        console.warn('⚠️ [SIMPLE-INIT] Erreur API, mise à jour cache uniquement');
        // Continuer pour mettre à jour le cache même en cas d'erreur API
      }

      // Mettre à jour le cache même si l'API a échoué (mode hors ligne)
      if (activeFarm) {
        await FarmContextCacheService.updateActiveFarmInCache(userId, activeFarm);
      }
      
    } catch (error) {
      console.error('❌ [SIMPLE-INIT] Exception setActiveFarm:', error);
      throw error;
    }
  }

  /**
   * Crée la première ferme pour un utilisateur
   */
  static async createFirstFarm(userId: string, farmData: {
    name: string;
    description?: string;
    farm_type?: string;
  }): Promise<UserFarm> {
    try {
      console.log('🏗️ [SIMPLE-INIT] Création première ferme:', farmData.name);

      // Créer la ferme via fetch direct
      const response = await fetch(`${DirectSupabaseService.getBaseUrl()}/rest/v1/farms`, {
        method: 'POST',
        headers: {
          'apikey': DirectSupabaseService.getAnonKey(),
          'Authorization': `Bearer ${DirectSupabaseService.getAnonKey()}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: farmData.name,
          description: farmData.description || null,
          farm_type: farmData.farm_type || 'autre',
          owner_id: userId,
          country: 'France'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [SIMPLE-INIT] Erreur création ferme:', errorData);
        throw new Error('Impossible de créer la ferme');
      }

      const newFarms = await response.json();
      const newFarm = Array.isArray(newFarms) ? newFarms[0] : newFarms;

      // Créer l'entrée farm_members
      await fetch(`${DirectSupabaseService.getBaseUrl()}/rest/v1/farm_members`, {
        method: 'POST',
        headers: {
          'apikey': DirectSupabaseService.getAnonKey(),
          'Authorization': `Bearer ${DirectSupabaseService.getAnonKey()}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          farm_id: newFarm.id,
          user_id: userId,
          role: 'owner',
          permissions: ["read", "write", "delete", "manage_members"],
          is_active: true
        })
      });

      const userFarm: UserFarm = {
        farm_id: newFarm.id,
        farm_name: newFarm.name,
        role: 'owner',
        is_owner: true
      };

      // Définir comme ferme active (avec cache)
      await this.setActiveFarm(userId, newFarm.id, userFarm);

      // Sauvegarder dans le cache
      await FarmContextCacheService.saveFarmContext(
        userId,
        [userFarm],
        userFarm,
        false
      );

      console.log('✅ [SIMPLE-INIT] Première ferme créée avec succès');
      return userFarm;

    } catch (error) {
      console.error('❌ [SIMPLE-INIT] Erreur createFirstFarm:', error);
      throw error;
    }
  }
}