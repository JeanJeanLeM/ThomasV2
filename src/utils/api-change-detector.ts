/**
 * Détecteur de changements API Supabase
 * Pour identifier si Supabase a changé quelque chose côté serveur
 */

import { SUPABASE_CONFIG } from './supabase';

export class APIChangeDetector {
  
  /**
   * Test des endpoints Supabase pour détecter les changements
   */
  static async detectAPIChanges(): Promise<{
    authAPI: { working: boolean; version?: string; error?: string };
    restAPI: { working: boolean; version?: string; error?: string };
    realtimeAPI: { working: boolean; version?: string; error?: string };
    possibleChanges: string[];
  }> {
    console.log('🔍 [API-CHANGE] === DÉTECTION CHANGEMENTS API SUPABASE ===');
    
    const results = {
      authAPI: { working: false },
      restAPI: { working: false },
      realtimeAPI: { working: false },
      possibleChanges: []
    } as any;
    
    // Test 1: API Auth (version et endpoints)
    try {
      console.log('🔐 [API-CHANGE] Test API Auth...');
      
      const authResponse = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/settings`, {
        headers: { 'apikey': SUPABASE_CONFIG.anonKey }
      });
      
      results.authAPI = {
        working: authResponse.ok,
        version: authResponse.headers.get('x-supabase-api-version') || 'inconnue',
        error: authResponse.ok ? undefined : `HTTP ${authResponse.status}`
      };
      
      console.log('🔐 [API-CHANGE] Auth API:', results.authAPI);
      
    } catch (authError) {
      results.authAPI = { working: false, error: authError.message };
    }
    
    // Test 2: API REST (version et endpoints)
    try {
      console.log('🗄️ [API-CHANGE] Test API REST...');
      
      const restResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        headers: { 
          'apikey': SUPABASE_CONFIG.anonKey,
          'Content-Type': 'application/json'
        }
      });
      
      const restBody = await restResponse.text();
      
      results.restAPI = {
        working: restResponse.ok,
        version: restResponse.headers.get('x-supabase-api-version') || 'inconnue',
        error: restResponse.ok ? undefined : `HTTP ${restResponse.status}: ${restBody}`
      };
      
      console.log('🗄️ [API-CHANGE] REST API:', results.restAPI);
      
      // Détecter changements possibles
      if (!restResponse.ok) {
        if (restResponse.status === 403) {
          results.possibleChanges.push('❌ API REST: Erreur 403 - Permissions RLS changées ?');
        }
        if (restResponse.status === 404) {
          results.possibleChanges.push('❌ API REST: Erreur 404 - Endpoints API changés ?');  
        }
        if (restResponse.status === 500) {
          results.possibleChanges.push('❌ API REST: Erreur 500 - Problème serveur Supabase ?');
        }
      }
      
    } catch (restError) {
      results.restAPI = { working: false, error: restError.message };
      results.possibleChanges.push('❌ REST API: Exception réseau - Firewall/proxy ?');
    }
    
    // Test 3: Headers et configuration  
    try {
      console.log('🔧 [API-CHANGE] Test configuration et headers...');
      
      const configResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'HEAD',
        headers: { 'apikey': SUPABASE_CONFIG.anonKey }
      });
      
      const headers = Object.fromEntries(configResponse.headers.entries());
      console.log('📋 [API-CHANGE] Headers API:', headers);
      
      // Vérifier si des headers critiques ont changé
      if (!headers['access-control-allow-origin']) {
        results.possibleChanges.push('⚠️ CORS: Header Access-Control-Allow-Origin manquant');
      }
      
    } catch (headerError) {
      console.log('❌ [API-CHANGE] Erreur test headers:', headerError);
    }
    
    // Analyse globale
    if (results.authAPI.working && !results.restAPI.working) {
      results.possibleChanges.push('🚨 PROBLÈME SPÉCIFIQUE: Auth OK mais Database KO');
      results.possibleChanges.push('   → Firewall bloque spécifiquement /rest/');
      results.possibleChanges.push('   → Changement permissions RLS Supabase');  
      results.possibleChanges.push('   → Migration DB cassée');
    }
    
    console.log('🔍 [API-CHANGE] === RÉSULTATS DÉTECTION ===');
    console.table(results);
    
    return results;
  }
  
  /**
   * Test spécifique des tables critiques
   */
  static async testCriticalTables(): Promise<{
    profiles: boolean;
    farms: boolean; 
    farm_members: boolean;
    errors: string[];
  }> {
    console.log('📊 [TABLE-TEST] Test accès tables critiques...');
    
    const results = {
      profiles: false,
      farms: false,
      farm_members: false,
      errors: []
    };
    
    const tables = [
      { name: 'profiles', key: 'profiles' },
      { name: 'farms', key: 'farms' },
      { name: 'farm_members', key: 'farm_members' }
    ];
    
    for (const table of tables) {
      try {
        const response = await fetch(
          `${SUPABASE_CONFIG.url}/rest/v1/${table.name}?select=count`, 
          {
            headers: {
              'apikey': SUPABASE_CONFIG.anonKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        results[table.key as keyof typeof results] = response.ok;
        
        if (!response.ok) {
          const errorText = await response.text();
          results.errors.push(`${table.name}: HTTP ${response.status} - ${errorText}`);
        }
        
        console.log(`📋 [TABLE-TEST] ${table.name}: ${response.ok ? 'OK' : 'KO'} (${response.status})`);
        
      } catch (error) {
        results.errors.push(`${table.name}: Exception - ${error.message}`);
        console.log(`📋 [TABLE-TEST] ${table.name}: EXCEPTION`);
      }
    }
    
    return results;
  }
}
