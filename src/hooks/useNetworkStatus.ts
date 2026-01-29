/**
 * Hook React pour surveiller l'état de la connexion réseau
 */

import { useState, useEffect } from 'react';
import { NetworkService, NetworkStatus } from '../services/NetworkService';

export function useNetworkStatus(): NetworkStatus & { isLoading: boolean } {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger l'état initial
    NetworkService.getStatus().then((initialStatus) => {
      setStatus(initialStatus);
      setIsLoading(false);
    });

    // S'abonner aux changements
    const unsubscribe = NetworkService.subscribe((newStatus) => {
      setStatus(newStatus);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    isLoading,
  };
}
