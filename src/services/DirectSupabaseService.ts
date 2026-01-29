/**
 * Service Supabase Direct via Fetch
 * Bypass du client Supabase JS qui timeout
 * Utilise fetch() directement car ça marche parfaitement !
 */

import { SUPABASE_CONFIG, supabase } from '../utils/supabase';

/**
 * Interface for WHERE conditions in Supabase queries
 * Supports standard Supabase REST API operators
 */
export interface WhereCondition {
  column: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'not.is' | 'in' | 'cs' | 'cd';
}

/**
 * Service Supabase Direct via Fetch
 * Plus fiable que le client JS qui timeout
 */

export class DirectSupabaseService {
  
  /**
   * Récupère le token auth actuel
   * Utilise localStorage sur web (instantané) et getSession() sur mobile (SecureStore)
   */
  public static async getAuthToken(): Promise<string | null> {
    try {
      // Sur web : accès direct au localStorage (instantané, pas de timeout)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          // Supabase stocke la session dans localStorage avec la clé : sb-<project-ref>-auth-token
          const storageKey = `sb-${SUPABASE_CONFIG.url.split('//')[1].split('.')[0]}-auth-token`;
          const sessionStr = localStorage.getItem(storageKey);
          
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session?.access_token) {
              return session.access_token;
            }
          }
        } catch (e) {
          console.warn('⚠️ [DIRECT-API] Erreur lecture localStorage, fallback vers getSession():', e);
        }
      }
      
      // Sur mobile ou si localStorage a échoué : utiliser getSession()
      // Timeout de 2 secondes pour mobile (SecureStore peut être lent)
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ [DIRECT-API] getSession() timeout après 2s');
          resolve(null);
        }, 2000);
      });
      
      const sessionPromise = supabase.auth.getSession();
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (!result) {
        console.warn('⚠️ [DIRECT-API] Timeout ou erreur getSession()');
        return null;
      }
      
      const { data: { session }, error } = result;
      
      if (error) {
        console.warn('⚠️ [DIRECT-API] Error getting session:', error);
        return null;
      }
      
      if (session?.access_token) {
        return session.access_token;
      }
      
      console.warn('⚠️ [DIRECT-API] No auth token found');
      return null;
    } catch (error) {
      console.error('❌ [DIRECT-API] Error getting auth token:', error);
      return null;
    }
  }
  
  /**
   * Getters pour configuration
   */
  static getBaseUrl(): string {
    return SUPABASE_CONFIG.url;
  }
  
  static getAnonKey(): string {
    return SUPABASE_CONFIG.anonKey;
  }
  
  /**
   * Requête GET directe vers Supabase REST
   */
  static async directSelect(
    table: string,
    select: string = '*',
    where?: WhereCondition[],
    single: boolean = false
  ): Promise<{ data: any; error: any }> {
    try {
      const authToken = await DirectSupabaseService.getAuthToken();
      
      // Construction URL  
      let url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
      
      if (where) {
        where.forEach(condition => {
          // Gérer les valeurs NULL correctement
          if (condition.value === null || condition.value === 'null') {
            url += `&${condition.column}=is.null`;
          } else if (condition.value === 'NOT_NULL' || condition.operator === 'not.null') {
            // Support pour IS NOT NULL
            url += `&${condition.column}=not.is.null`;
          } else {
            const operator = condition.operator || 'eq';
            // Gérer les booléens correctement pour Supabase REST API
            if (typeof condition.value === 'boolean') {
              url += `&${condition.column}=${operator}.${condition.value.toString().toLowerCase()}`;
            } else {
              url += `&${condition.column}=${operator}.${encodeURIComponent(condition.value)}`;
            }
          }
        });
      }
      
      if (single) {
        url += '&limit=1';
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { data: null, error: { message: data.message, code: data.code } };
      }
      
      return { data: single && Array.isArray(data) ? data[0] : data, error: null };
      
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }
  
  /**
   * Récupère le profil d'un utilisateur
   */
  static async getUserProfile(userId: string): Promise<any> {
    return await this.directSelect(
      'profiles',
      'id,latest_active_farm_id,first_name,last_name,email',
      [{ column: 'id', value: userId }],
      true
    );
  }
  
  /**
   * Récupère les fermes d'un utilisateur
   */
  static async getUserFarms(userId: string): Promise<any> {
    return await this.directSelect(
      'farms',
      'id,name,owner_id,description,farm_type',
      [{ column: 'owner_id', value: userId }]
    );
  }
  
  /**
   * INSERT direct vers Supabase REST
   */
  static async directInsert(
    table: string,
    data: any,
    select: string = '*'
  ): Promise<{ data: any; error: any }> {
    try {
      console.log(`🚀 [DIRECT-API] Starting INSERT to ${table}`);
      
      const authToken = await DirectSupabaseService.getAuthToken();
      
      const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
      const headers = {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': `return=representation`,
        'Accept': 'application/json'
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error(`❌ [DIRECT-API] INSERT ${table} failed:`, responseData);
        return { data: null, error: { message: responseData.message || responseData.details, code: response.status } };
      }
      
      console.log(`✅ [DIRECT-API] INSERT ${table} success`);
      return { data: Array.isArray(responseData) ? responseData[0] : responseData, error: null };
      
    } catch (error) {
      console.error(`❌ [DIRECT-API] INSERT ${table} exception:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  /**
   * UPDATE direct vers Supabase REST
   */
  static async directUpdate(
    table: string,
    data: any,
    where?: Omit<WhereCondition, 'operator'>[],
    select: string = '*'
  ): Promise<{ data: any; error: any }> {
    try {
      const authToken = await DirectSupabaseService.getAuthToken();
      
      // Construction URL avec conditions WHERE
      let url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
      if (where && where.length > 0) {
        const conditions = where.map(condition => 
          `${condition.column}=eq.${encodeURIComponent(condition.value)}`
        ).join('&');
        url += `?${conditions}`;
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': select ? 'return=representation' : 'return=minimal',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      let responseData = null;
      if (select && select !== 'minimal') {
        responseData = await response.json();
      }
      
      if (!response.ok) {
        const errorData = responseData || await response.json();
        console.error(`❌ [DIRECT-API] UPDATE ${table} failed:`, errorData);
        return { data: null, error: { message: errorData.message || errorData.details, code: response.status } };
      }
      
      console.log(`✅ [DIRECT-API] UPDATE ${table} success`);
      return { data: responseData, error: null };
      
    } catch (error) {
      console.error(`❌ [DIRECT-API] UPDATE ${table} exception:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  /**
   * DELETE direct vers Supabase REST
   */
  static async directDelete(
    table: string,
    where: Omit<WhereCondition, 'operator'>[]
  ): Promise<{ data: any; error: any }> {
    try {
      const authToken = await DirectSupabaseService.getAuthToken();
      
      // Construction URL avec conditions WHERE
      const conditions = where.map(condition => 
        `${condition.column}=eq.${encodeURIComponent(condition.value)}`
      ).join('&');
      const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}?${conditions}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ [DIRECT-API] DELETE ${table} failed:`, errorData);
        return { data: null, error: { message: errorData.message || errorData.details, code: response.status } };
      }
      
      console.log(`✅ [DIRECT-API] DELETE ${table} success`);
      return { data: null, error: null };
      
    } catch (error) {
      console.error(`❌ [DIRECT-API] DELETE ${table} exception:`, error);
      return { data: null, error: { message: error.message } };
    }
  }

  /**
   * Appel RPC via POST direct
   */
  static async directRPC(functionName: string, params: any = {}): Promise<{ data: any; error: any }> {
    try {
      const authToken = await DirectSupabaseService.getAuthToken();
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { data: null, error: { message: data.message, code: response.status } };
      }
      
      return { data, error: null };
      
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  /**
   * Invoker Edge Function directement
   */
  static async directEdgeFunction(functionName: string, params: any = {}): Promise<{ data: any; error: any }> {
    try {
      const authToken = await DirectSupabaseService.getAuthToken();
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ [DIRECT-API] Edge function ${functionName} failed:`, data);
        return { data: null, error: { message: data.message || data.error, code: response.status } };
      }
      
      console.log(`✅ [DIRECT-API] Edge function ${functionName} success`);
      return { data, error: null };
      
    } catch (error) {
      console.error(`❌ [DIRECT-API] Edge function ${functionName} exception:`, error);
      return { data: null, error: { message: error.message } };
    }
  }
}
