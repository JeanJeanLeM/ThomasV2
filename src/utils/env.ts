/**
 * Utilitaire de gestion des variables d'environnement Thomas V2
 * Sépare clairement les variables client vs serveur
 */

// ==============================
// VARIABLES CLIENT (accessibles dans l'app mobile)
// ==============================

export const ENV_CLIENT = {
  // Supabase - accès public sécurisé
  SUPABASE_URL: process.env['EXPO_PUBLIC_SUPABASE_URL'] || '',
  SUPABASE_ANON_KEY: process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || '',
  
  // Configuration IA Thomas
  OPENAI_MODEL: process.env['EXPO_PUBLIC_OPENAI_MODEL'] || 'gpt-4o-mini',
  
  // Auth OAuth
  GOOGLE_CLIENT_ID: process.env['EXPO_PUBLIC_GOOGLE_CLIENT_ID'] || '',
  APPLE_CLIENT_ID: process.env['EXPO_PUBLIC_APPLE_CLIENT_ID'] || '',
  
  // Configuration app
  APP_NAME: process.env['EXPO_PUBLIC_APP_NAME'] || 'Thomas V2',
  APP_VERSION: process.env['EXPO_PUBLIC_APP_VERSION'] || '1.0.0',
  API_BASE_URL: process.env['EXPO_PUBLIC_API_BASE_URL'] || '',
  
  // Development
  DEV_MODE: process.env['EXPO_PUBLIC_DEV_MODE'] === 'true',
  LOG_LEVEL: process.env['EXPO_PUBLIC_LOG_LEVEL'] || 'info',
} as const;

// ==============================
// VARIABLES SERVEUR (Edge Functions uniquement)
// ==============================

export const ENV_SERVER = {
  // Supabase - clés sensibles
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
  SUPABASE_ACCESS_TOKEN: process.env['SUPABASE_ACCESS_TOKEN'] || '',
  SUPABASE_PROJECT_ID: process.env['SUPABASE_PROJECT_ID'] || '',
  
  // OpenAI - clé API sensible
  OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || '',
} as const;

// ==============================
// VALIDATION & HELPERS
// ==============================

/**
 * Valide que toutes les variables client requises sont présentes
 */
export const validateClientEnv = (): { isValid: boolean; missing: string[] } => {
  const required: (keyof typeof ENV_CLIENT)[] = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !ENV_CLIENT[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
  };
};

/**
 * Valide que toutes les variables serveur requises sont présentes
 * À utiliser dans les Edge Functions
 */
export const validateServerEnv = (): { isValid: boolean; missing: string[] } => {
  const required: (keyof typeof ENV_SERVER)[] = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ];
  
  const missing = required.filter(key => !ENV_SERVER[key]);
  
  return {
    isValid: missing.length === 0,
    missing,
  };
};

/**
 * Helper pour les logs de développement
 */
export const isDev = (): boolean => ENV_CLIENT.DEV_MODE;

/**
 * Helper pour construire les URLs API
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = ENV_CLIENT.API_BASE_URL || ENV_CLIENT.SUPABASE_URL;
  return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
};
