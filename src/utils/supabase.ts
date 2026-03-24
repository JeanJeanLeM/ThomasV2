/**
 * Configuration Supabase pour Thomas V2
 * Selon TECHNICAL_SPECIFICATIONS.md - Étape 1.2
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV_CLIENT, validateClientEnv } from './env';
import * as SecureStore from 'expo-secure-store';

// ==============================
// CLIENT SUPABASE (côté mobile)
// ==============================

/**
 * Client Supabase pour l'app mobile
 * Utilise UNIQUEMENT les variables EXPO_PUBLIC_*
 */
const createSupabaseClient = () => {
  // Validation des variables requises
  const validation = validateClientEnv();
  if (!validation.isValid) {
    throw new Error(
      `Variables d'environnement manquantes: ${validation.missing.join(', ')}\n` +
      'Assurez-vous que votre fichier .env contient les variables EXPO_PUBLIC_SUPABASE_*'
    );
  }

  const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  // Création du client avec les variables publiques et custom storage
  return createClient(
    ENV_CLIENT.SUPABASE_URL,
    ENV_CLIENT.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        // Nécessaire sur web pour finaliser OAuth après redirection.
        // Désactivé sur mobile natif où la gestion passe par deep links.
        detectSessionInUrl: isWeb,
        debug: false,
        // Storage personnalisé utilisant SecureStore pour mobile
        storage: {
          getItem: async (key: string) => {
            try {
              // Pour web, utiliser localStorage
              if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                return window.localStorage.getItem(key);
              }
              // Pour mobile, utiliser SecureStore
              return await SecureStore.getItemAsync(key);
            } catch (error) {
              console.warn('[STORAGE] getItem error:', error);
              return null;
            }
          },
          setItem: async (key: string, value: string) => {
            try {
              // Pour web, utiliser localStorage
              if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                window.localStorage.setItem(key, value);
                return;
              }
              // Pour mobile, utiliser SecureStore
              await SecureStore.setItemAsync(key, value);
            } catch (error) {
              console.warn('[STORAGE] setItem error:', error);
            }
          },
          removeItem: async (key: string) => {
            try {
              // Pour web, utiliser localStorage
              if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                window.localStorage.removeItem(key);
                return;
              }
              // Pour mobile, utiliser SecureStore
              await SecureStore.deleteItemAsync(key);
            } catch (error) {
              console.warn('[STORAGE] removeItem error:', error);
            }
          },
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
};

export const supabase = createSupabaseClient();

// Exporter les variables pour les diagnostics
export const SUPABASE_CONFIG = {
  url: ENV_CLIENT.SUPABASE_URL,
  anonKey: ENV_CLIENT.SUPABASE_ANON_KEY,
};

// ==============================
// TYPES POUR L'APP
// ==============================

export type Database = {
  public: {
    Tables: {
      farms: {
        Row: {
          id: number;
          name: string;
          description?: string;
          farm_type: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'autre';
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string;
          farm_type: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'autre';
          owner_id: string;
        };
        Update: {
          name?: string;
          description?: string;
          farm_type?: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'autre';
        };
      };
    };
  };
};
