/**
 * Debug temporaire pour vérifier les variables d'environnement
 */

export const debugEnv = (): void => {
  console.log('=== DEBUG VARIABLES ENVIRONNEMENT ===');
  console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env['EXPO_PUBLIC_SUPABASE_URL']);
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ? '✅ Présente' : '❌ Manquante');
  console.log('Toutes les variables EXPO_PUBLIC_*:');
  
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('EXPO_PUBLIC_')) {
      console.log(`  ${key}: ${key.includes('KEY') ? '***' : process.env[key]}`);
    }
  });
  
  console.log('=====================================');
};

