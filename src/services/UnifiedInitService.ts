import { supabase } from '../utils/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { DirectSupabaseService } from './DirectSupabaseService';
import { SimpleInitService, type UserFarm, type InitializationResult } from './SimpleInitService';
import { ChatCacheService } from './ChatCacheService';
import { getItem, deleteItem } from '../utils/secureStore';

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  latest_active_farm_id: number | null;
}

export interface CacheStats {
  totalCaches: number;
  totalSizeKB: number;
  oldestCache: string | null;
  newestCache: string | null;
}

export interface UnifiedInitResult {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  farms: UserFarm[];
  activeFarm: UserFarm | null;
  needsSetup: boolean;
  cacheStats: CacheStats;
}

export interface InitProgress {
  step: string;
  progress: number; // 0-100
}

/**
 * Service d'initialisation unifié pour Thomas V2
 * 
 * Orchestre toute l'initialisation en une seule opération :
 * - Chargement/validation de la session
 * - Chargement/création du profil
 * - Nettoyage du cache
 * - Chargement des fermes
 * 
 * Avec progression visible pour l'utilisateur
 */
export class UnifiedInitService {
  
  /**
   * Initialise toute l'application en une seule opération
   * 
   * @param onProgress Callback appelé à chaque étape avec la progression
   * @returns Résultat complet de l'initialisation
   */
  static async initialize(
    onProgress?: (progress: InitProgress) => void
  ): Promise<UnifiedInitResult> {
    const reportProgress = (step: string, progress: number) => {
      onProgress?.({ step, progress });
    };

    try {
      console.log('🚀 [UNIFIED-INIT] Démarrage initialisation unifiée...');

      // ========== ÉTAPE 1: Vérification de la session (0-20%) ==========
      reportProgress('Vérification de la session...', 0);
      
      let user: User | null = null;
      let session: Session | null = null;

      // Essayer de récupérer la session Supabase
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (supabaseSession && !sessionError) {
        console.log('✅ [UNIFIED-INIT] Session Supabase trouvée');
        session = supabaseSession;
        user = supabaseSession.user;
        
        // Valider la session avec getUser()
        try {
          const { data: { user: validatedUser }, error: validationError } = await Promise.race([
            supabase.auth.getUser(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout validation')), 10000)
            )
          ]);
          
          if (validationError?.message?.includes('User from sub claim in JWT does not exist')) {
            console.error('🚨 [UNIFIED-INIT] JWT corrompu, nettoyage...');
            await supabase.auth.signOut();
            session = null;
            user = null;
          } else if (validatedUser) {
            user = validatedUser;
            console.log('✅ [UNIFIED-INIT] Utilisateur validé:', user.email);
          }
        } catch (validationError) {
          console.log('⚠️ [UNIFIED-INIT] Timeout validation, utilisation session directe');
          // Utiliser la session directe si validation timeout
        }
      } else {
        // Pas de session Supabase, essayer le cache local
        console.log('⚠️ [UNIFIED-INIT] Pas de session Supabase, tentative cache local...');
        
        try {
          const cachedSessionStr = await getItem('supabase-session');
          
          if (cachedSessionStr) {
            const cachedSession = JSON.parse(cachedSessionStr);
            
            // Vérifier que la session cache n'est pas expirée (6 mois)
            const now = Math.floor(Date.now() / 1000);
            if (cachedSession.cache_expires_at && cachedSession.cache_expires_at > now) {
              console.log('✅ [UNIFIED-INIT] Cache valide, restauration session...');
              
              // Restaurer la session dans Supabase avec le refresh_token
              const { data, error: setError } = await supabase.auth.setSession({
                access_token: cachedSession.access_token,
                refresh_token: cachedSession.refresh_token,
              });
              
              if (!setError && data.session) {
                console.log('✅ [UNIFIED-INIT] Session restaurée depuis cache:', data.session.user?.email);
                session = data.session;
                user = data.session.user;
              } else {
                console.warn('⚠️ [UNIFIED-INIT] Échec restauration session:', setError?.message);
              }
            } else {
              console.log('⚠️ [UNIFIED-INIT] Cache expiré (> 6 mois), nettoyage...');
              await deleteItem('supabase-session');
              await deleteItem('thomas_auth_user');
            }
          }
        } catch (cacheError) {
          console.warn('⚠️ [UNIFIED-INIT] Erreur lecture cache:', cacheError);
        }
      }

      reportProgress('Vérification de la session...', 20);

      // Si pas d'utilisateur, retourner résultat vide
      if (!user || !session) {
        console.log('📴 [UNIFIED-INIT] Aucun utilisateur connecté');
        const cacheStats = await ChatCacheService.getCacheStats();
        return {
          user: null,
          session: null,
          profile: null,
          farms: [],
          activeFarm: null,
          needsSetup: false,
          cacheStats,
        };
      }

      // ========== ÉTAPE 2: Chargement du profil (20-40%) ==========
      reportProgress('Chargement du profil...', 25);

      let profile: Profile | null = null;

      try {
        const profileResult = await DirectSupabaseService.directSelect(
          'profiles',
          'id,email,first_name,last_name,latest_active_farm_id',
          [{ column: 'id', value: user.id }],
          true
        );

        if (profileResult.error) {
          console.log('🆕 [UNIFIED-INIT] Profil inexistant, création automatique...');
          
          // Créer le profil
          const metadata = (user.user_metadata || {}) as any;
          const fullName: string = metadata['full_name'] || '';
          const [firstNameFromFull, ...rest] = fullName.split(' ');
          const lastNameFromFull = rest.join(' ');

          const profilePayload = {
            id: user.id,
            email: user.email,
            first_name: metadata['first_name'] || firstNameFromFull || null,
            last_name: metadata['last_name'] || lastNameFromFull || null,
            phone: null as string | null,
            profession: null as string | null,
            bio: null as string | null,
          };

          const createResult = await DirectSupabaseService.directInsert('profiles', profilePayload);
          
          if (!createResult.error) {
            profile = {
              id: user.id,
              email: user.email || '',
              first_name: profilePayload.first_name,
              last_name: profilePayload.last_name,
              latest_active_farm_id: null,
            };
            console.log('✅ [UNIFIED-INIT] Profil créé');
          } else {
            console.warn('⚠️ [UNIFIED-INIT] Erreur création profil:', createResult.error);
          }
        } else {
          profile = profileResult.data as Profile;
          console.log('✅ [UNIFIED-INIT] Profil trouvé:', profile.email);
        }
      } catch (profileError) {
        console.error('❌ [UNIFIED-INIT] Erreur chargement profil:', profileError);
        // Continuer même si le profil échoue
      }

      reportProgress('Chargement du profil...', 40);

      // ========== ÉTAPE 3: Nettoyage du cache (40-50%, en parallèle) ==========
      reportProgress('Nettoyage du cache...', 45);

      let cacheStats: CacheStats = {
        totalCaches: 0,
        totalSizeKB: 0,
        oldestCache: null,
        newestCache: null,
      };

      try {
        // Nettoyer les caches expirés (non-bloquant)
        await ChatCacheService.cleanExpiredCaches();
        cacheStats = await ChatCacheService.getCacheStats();
        console.log('✅ [UNIFIED-INIT] Cache nettoyé:', cacheStats);
      } catch (cacheError) {
        console.warn('⚠️ [UNIFIED-INIT] Erreur nettoyage cache:', cacheError);
        // Ne pas bloquer l'initialisation
      }

      reportProgress('Nettoyage du cache...', 50);

      // ========== ÉTAPE 4: Chargement des fermes (50-80%) ==========
      reportProgress('Chargement des fermes...', 55);

      let farms: UserFarm[] = [];
      let activeFarm: UserFarm | null = null;
      let needsSetup = false;

      try {
        const initResult: InitializationResult = await SimpleInitService.initializeUserFarms(user.id);
        
        farms = initResult.farms;
        activeFarm = initResult.activeFarm;
        needsSetup = initResult.needsSetup;

        console.log('✅ [UNIFIED-INIT] Fermes chargées:', {
          count: farms.length,
          active: activeFarm?.farm_name || 'aucune',
          needsSetup,
        });
      } catch (farmsError) {
        console.error('❌ [UNIFIED-INIT] Erreur chargement fermes:', farmsError);
        // En cas d'erreur, considérer qu'il faut un setup
        needsSetup = true;
      }

      reportProgress('Chargement des fermes...', 80);

      // ========== ÉTAPE 5: Finalisation (80-100%) ==========
      reportProgress('Finalisation...', 90);

      const result: UnifiedInitResult = {
        user,
        session,
        profile,
        farms,
        activeFarm,
        needsSetup,
        cacheStats,
      };

      reportProgress('Terminé', 100);

      console.log('✅ [UNIFIED-INIT] Initialisation terminée avec succès');
      return result;

    } catch (error) {
      console.error('❌ [UNIFIED-INIT] Erreur initialisation unifiée:', error);
      
      // Retourner un résultat minimal en cas d'erreur
      const cacheStats = await ChatCacheService.getCacheStats().catch(() => ({
        totalCaches: 0,
        totalSizeKB: 0,
        oldestCache: null,
        newestCache: null,
      }));

      return {
        user: null,
        session: null,
        profile: null,
        farms: [],
        activeFarm: null,
        needsSetup: false,
        cacheStats,
      };
    }
  }
}
