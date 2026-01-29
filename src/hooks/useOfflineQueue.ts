/**
 * Hook React pour surveiller et gérer la queue offline
 */

import { useState, useEffect, useCallback } from 'react';
import { OfflineQueueService, PendingMessage } from '../services/OfflineQueueService';

export interface OfflineQueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
}

export function useOfflineQueue() {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [stats, setStats] = useState<OfflineQueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Recharge la queue depuis le stockage local
   */
  const refreshQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      const pendingMessages = await OfflineQueueService.getPendingMessages();
      const queueStats = await OfflineQueueService.getStats();
      
      setMessages(pendingMessages);
      setStats(queueStats);
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE-HOOK] Error refreshing queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Recharge la queue au montage et toutes les 5 secondes
   */
  useEffect(() => {
    refreshQueue();

    // Rafraîchir périodiquement
    const interval = setInterval(refreshQueue, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshQueue]);

  /**
   * Retire un message de la queue (après sync réussie)
   */
  const removeMessage = useCallback(async (id: string) => {
    await OfflineQueueService.removeMessage(id);
    await refreshQueue();
  }, [refreshQueue]);

  /**
   * Réessaie un message échoué
   */
  const retryMessage = useCallback(async (id: string) => {
    await OfflineQueueService.retryMessage(id);
    await refreshQueue();
  }, [refreshQueue]);

  return {
    messages,
    stats,
    isLoading,
    refreshQueue,
    removeMessage,
    retryMessage,
  };
}
