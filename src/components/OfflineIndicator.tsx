/**
 * Composant indicateur de connexion offline
 * Affiche un bandeau en haut de l'écran avec le nombre d'éléments en attente
 */

import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { SyncService } from '../services/SyncService';

export function OfflineIndicator() {
  const networkStatus = useNetworkStatus();
  const { stats } = useOfflineQueue();
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Si online et pas d'éléments en attente, ne rien afficher
  if (networkStatus.isConnected && stats.pending === 0 && stats.failed === 0) {
    return null;
  }

  const handleSync = async () => {
    if (isSyncing || !networkStatus.isConnected) {
      return;
    }

    setIsSyncing(true);
    try {
      const result = await SyncService.syncPendingItems();
      if (result.success) {
        console.log('✅ Synchronisation réussie');
      } else {
        console.warn('⚠️ Synchronisation partielle:', result);
      }
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: networkStatus.isConnected 
          ? colors.warning 
          : colors.error,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Ionicons
          name={networkStatus.isConnected ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          size={20}
          color={colors.white}
          style={{ marginRight: spacing.sm }}
        />
        <Text
          style={{
            color: colors.white,
            fontSize: 14,
            flex: 1,
          }}
        >
          {networkStatus.isConnected
            ? `${stats.pending + stats.failed} élément(s) en attente`
            : 'Mode hors ligne'}
          {stats.pending > 0 && ` • ${stats.pending} en attente`}
          {stats.failed > 0 && ` • ${stats.failed} échoué(s)`}
        </Text>
      </View>

      {networkStatus.isConnected && (stats.pending > 0 || stats.failed > 0) && (
        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            backgroundColor: colors.white,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name="sync-outline"
                size={16}
                color={colors.primary}
                style={{ marginRight: spacing.xs }}
              />
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                Synchroniser
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
