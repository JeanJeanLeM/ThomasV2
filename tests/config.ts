/**
 * Configuration pour les tests de validation
 * Charge les variables depuis .env
 */

// Charger dotenv pour accéder aux variables d'environnement
import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger .env depuis la racine du projet
dotenv.config({ path: path.join(__dirname, '..', '.env') })

export const TEST_CONFIG = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kvwzbofifqqytyfertkh.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  TEST_USER_ID: 'd74d6020-8252-42b6-9dcc-b6ab1aca2659',
  TEST_FARM_ID: 16
}

