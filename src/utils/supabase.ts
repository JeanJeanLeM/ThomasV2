/**
 * Configuration Supabase pour Thomas V2
 * Selon TECHNICAL_SPECIFICATIONS.md - Étape 1.2
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV_CLIENT, validateClientEnv } from './env';

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

  // Création du client avec les variables publiques
  return createClient(
    ENV_CLIENT.SUPABASE_URL,
    ENV_CLIENT.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
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
