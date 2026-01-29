/**
 * Composant pour afficher les messages en attente dans le chat
 * Affiche les messages/audios en attente de synchronisation avec indicateurs visuels
 */

import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { PendingMessage } from '../services/OfflineQueueService';
import { OfflineQueueService } from '../services/OfflineQueueService';
import { SyncService } from '../services/SyncService';

interface PendingMessagesListProps {
  messages: PendingMessage[];
  onRefresh?: () => void;
}

export function PendingMessagesList({ messages, onRefresh }: PendingMessagesListProps) {
  const [syncingIds, setSyncingIds] = React.useState<Set<string>>(new Set());

  if (messages.length === 0) {
    return null;
  }

  const handleRetry = async (message: PendingMessage) => {
    if (syncingIds.has(message.id)) {
      return;
    }

    setSyncingIds(prev => new Set(prev).add(message.id));

    try {
      // Réinitialiser le statut
      await OfflineQueueService.retryMessage(message.id);
      
      // Synchroniser ce message spécifique
      const success = await SyncService.syncMessage(message);
      
      if (success) {
        await OfflineQueueService.markAsCompleted(message.id);
      } else {
        await OfflineQueueService.markAsFailed(message.id, 'Échec de la synchronisation');
      }

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('❌ Erreur retry message:', error);
      await OfflineQueueService.markAsFailed(message.id, error.message || 'Erreur inconnue');
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(message.id);
        return next;
      });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'À l\'instant';
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `Il y a ${diffHours}h`;
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  };

  return (
    <View>
      {messages.map((message) => {
        const isSyncing = syncingIds.has(message.id);
        const isFailed = message.status === 'failed';

        return (
          <Card
            key={message.id}
            style={{
              marginHorizontal: spacing.md,
              marginVertical: spacing.xs,
              backgroundColor: isFailed ? colors.errorLight : colors.warningLight,
              borderLeftWidth: 4,
              borderLeftColor: isFailed ? colors.error : colors.warning,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  {message.type === 'audio' ? (
                    <Ionicons
                      name="mic-outline"
                      size={16}
                      color={isFailed ? colors.error : colors.warning}
                      style={{ marginRight: spacing.xs }}
                    />
                  ) : (
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color={isFailed ? colors.error : colors.warning}
                      style={{ marginRight: spacing.xs }}
                    />
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isFailed ? colors.error : colors.warning,
                    }}
                  >
                    {message.type === 'audio'
                      ? 'Audio en attente'
                      : 'Message en attente'}
                  </Text>
                </View>

                {message.content && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.text,
                      marginBottom: spacing.xs,
                    }}
                  >
                    {message.content}
                  </Text>
                )}

                {message.type === 'audio' && message.audio_metadata && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Durée: {Math.round(message.audio_metadata.duration)}s
                  </Text>
                )}

                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                  }}
                >
                  {formatDate(message.created_at)}
                  {message.status === 'processing' && ' • En cours de traitement...'}
                  {isFailed && message.error && ` • ${message.error}`}
                </Text>
              </View>

              {isFailed && !isSyncing && (
                <TouchableOpacity
                  onPress={() => handleRetry(message)}
                  style={{
                    padding: spacing.sm,
                    marginLeft: spacing.sm,
                  }}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color={colors.error}
                  />
                </TouchableOpacity>
              )}

              {isSyncing && (
                <View
                  style={{
                    padding: spacing.sm,
                    marginLeft: spacing.sm,
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          </Card>
        );
      })}
    </View>
  );
}
