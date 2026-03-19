/**
 * Hook React pour surveiller et gérer la queue offline
 */

import React, { useState, useEffect, useCallback } from 'react';
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
   * Compare avant de setState pour éviter les re-renders inutiles
   */
  const isFirstLoad = React.useRef(true);
  const refreshQueue = useCallback(async () => {
    try {
      // Seulement afficher le loading au premier chargement
      if (isFirstLoad.current) {
        setIsLoading(true);
      }
      const pendingMessages = await OfflineQueueService.getPendingMessages();
      const queueStats = await OfflineQueueService.getStats();
      
      // Seulement mettre à jour si les données ont réellement changé
      setMessages(prev => {
        if (prev.length !== pendingMessages.length) return pendingMessages;
        const prevIds = prev.map(m => m.id).join(',');
        const newIds = pendingMessages.map(m => m.id).join(',');
        return prevIds === newIds ? prev : pendingMessages;
      });
      setStats(prev => {
        if (prev.total === queueStats.total && prev.pending === queueStats.pending && 
            prev.processing === queueStats.processing && prev.failed === queueStats.failed) {
          return prev;
        }
        return queueStats;
      });
    } catch (error) {
      console.error('❌ [OFFLINE-QUEUE-HOOK] Error refreshing queue:', error);
    } finally {
      if (isFirstLoad.current) {
        setIsLoading(false);
        isFirstLoad.current = false;
      }
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

  /**
   * Supprime tous les messages échoués de la queue
   */
  const removeFailedMessages = useCallback(async () => {
    await OfflineQueueService.removeFailedMessages();
    await refreshQueue();
  }, [refreshQueue]);

  return {
    messages,
    stats,
    isLoading,
    refreshQueue,
    removeMessage,
    retryMessage,
    removeFailedMessages,
  };
}
