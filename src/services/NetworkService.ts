/**
 * Service de détection de la connexion réseau
 * 
 * Utilise @react-native-community/netinfo pour détecter l'état de la connexion
 * et tester la connectivité réelle avec le serveur.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { SUPABASE_CONFIG } from '../utils/supabase';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  details?: any;
}

export class NetworkService {
  /**
   * Obtient l'état actuel de la connexion
   */
  static async getStatus(): Promise<NetworkStatus> {
    try {
      const state = await NetInfo.fetch();
      
      return {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        details: state.details,
      };
    } catch (error) {
      console.error('❌ [NETWORK] Error getting network status:', error);
      // En cas d'erreur, supposer offline
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      };
    }
  }

  /**
   * S'abonne aux changements de connexion
   * Retourne une fonction pour se désabonner
   */
  static subscribe(callback: (status: NetworkStatus) => void): () => void {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        details: state.details,
      };
      
      console.log('📡 [NETWORK] Status changed:', status);
      callback(status);
    });

    return () => {
      unsubscribe();
    };
  }

  /**
   * Teste la connectivité réelle avec le serveur Supabase
   * Plus fiable que juste vérifier l'état réseau
   * Timeout réduit à 3s pour une réponse plus rapide
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Test simple de ping vers Supabase avec timeout court
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout (plus rapide)

      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
        },
      });

      clearTimeout(timeoutId);

      const isReachable = response.ok || response.status === 404; // 404 = serveur répond
      console.log('🌐 [NETWORK] Connection test:', isReachable ? 'OK' : 'FAILED');
      
      return isReachable;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ [NETWORK] Connection test timeout (3s)');
      } else {
        console.warn('⚠️ [NETWORK] Connection test failed:', error.message);
      }
      return false;
    }
  }

  /**
   * Vérifie si on est connecté ET que Internet est accessible
   */
  static async isOnline(): Promise<boolean> {
    const status = await this.getStatus();
    
    // Si isInternetReachable est null, on teste manuellement
    if (status.isInternetReachable === null || status.isInternetReachable === undefined) {
      return await this.testConnection();
    }
    
    return status.isConnected && status.isInternetReachable;
  }
}
