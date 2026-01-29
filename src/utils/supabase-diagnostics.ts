/**
 * Utilitaires de diagnostic Supabase
 * Pour identifier précisément les problèmes de connectivité
 */

import { supabase, SUPABASE_CONFIG } from './supabase';

export class SupabaseDiagnostics {
  
  /**
   * Test séparé des endpoints Supabase
   */
  static async runFullDiagnostic(): Promise<{
    auth: { working: boolean; latency?: number; error?: string };
    database: { working: boolean; latency?: number; error?: string };
    rpc: { working: boolean; latency?: number; error?: string };
  }> {
    console.log('🔍 [DIAGNOSTIC] === DIAGNOSTIC COMPLET SUPABASE ===');
    
    const results = {
      auth: { working: false },
      database: { working: false },  
      rpc: { working: false }
    } as any;
    
    // Test 1: API Auth (on sait que ça marche)
    try {
      console.log('🔐 [DIAGNOSTIC] Test API Auth...');
      const authStart = performance.now();
      
      const { data: session, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000)) // 120s FIXE
      ]);
      
      const authLatency = Math.round(performance.now() - authStart);
      
      results.auth = {
        working: !error,
        latency: authLatency,
        error: error?.message
      };
      
      console.log(`🔐 [DIAGNOSTIC] API Auth: ${results.auth.working ? 'OK' : 'KO'} (${authLatency}ms)`);
      
    } catch (authError) {
      results.auth = { working: false, error: authError.message };
      console.log('🔐 [DIAGNOSTIC] API Auth: TIMEOUT');
    }
    
    // Test 2: API Database REST (le problème)
    try {
      console.log('🗄️ [DIAGNOSTIC] Test API Database REST...');
      const dbStart = performance.now();
      
      // Test le plus simple possible
      const response = await Promise.race([
        fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Content-Type': 'application/json'
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000)) // 120s FIXE
      ]);
      
      const dbLatency = Math.round(performance.now() - dbStart);
      const working = response.status < 400;
      
      results.database = {
        working,
        latency: dbLatency,
        error: working ? undefined : `HTTP ${response.status}`
      };
      
      console.log(`🗄️ [DIAGNOSTIC] API Database: ${working ? 'OK' : 'KO'} (${dbLatency}ms, status: ${response.status})`);
      
    } catch (dbError) {
      results.database = { working: false, error: dbError.message };
      console.log('🗄️ [DIAGNOSTIC] API Database: TIMEOUT/ERROR');
    }
    
    // Test 3: RPC Functions
    try {
      console.log('⚙️ [DIAGNOSTIC] Test RPC Functions...');
      const rpcStart = performance.now();
      
      // Test avec une RPC qui doit exister
      const { data, error } = await Promise.race([
        supabase.rpc('get_user_farms'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000)) // 120s FIXE
      ]);
      
      const rpcLatency = Math.round(performance.now() - rpcStart);
      
      results.rpc = {
        working: !error,
        latency: rpcLatency,
        error: error?.message
      };
      
      console.log(`⚙️ [DIAGNOSTIC] RPC Functions: ${results.rpc.working ? 'OK' : 'KO'} (${rpcLatency}ms)`);
      
    } catch (rpcError) {
      results.rpc = { working: false, error: rpcError.message };
      console.log('⚙️ [DIAGNOSTIC] RPC Functions: TIMEOUT');
    }
    
    console.log('🔍 [DIAGNOSTIC] === RÉSULTATS COMPLETS ===');
    console.table(results);
    
    return results;
  }
  
  /**
   * Test basique de connectivité avec différentes méthodes
   */
  static async testConnectivityMethods(): Promise<void> {
    console.log('🌐 [DIAGNOSTIC] Test connectivité multiple...');
    
    // Test 1: Via client Supabase
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      console.log('📊 [TEST1] Supabase Client:', error ? `KO (${error.message})` : 'OK');
    } catch (e) {
      console.log('📊 [TEST1] Supabase Client: EXCEPTION:', e.message);
    }
    
    // Test 2: Via fetch direct  
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🌐 [TEST2] Fetch Direct: OK', response.status, 'Données:', data.length || 0);
      } else {
        const errorText = await response.text();
        console.log('🌐 [TEST2] Fetch Direct: KO', response.status, 'Erreur:', errorText);
      }
    } catch (e) {
      console.log('🌐 [TEST2] Fetch Direct: EXCEPTION:', e.message);
    }
    
    // Test 3: Ping simple du domaine
    try {
      const pingResponse = await fetch(`${SUPABASE_CONFIG.url}/`, { method: 'HEAD' });
      console.log('🏓 [TEST3] Domain Ping:', pingResponse.ok ? 'OK' : 'KO');
    } catch (e) {
      console.log('🏓 [TEST3] Domain Ping: EXCEPTION:', e.message);
    }
  }
}
