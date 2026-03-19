/**
 * Écran bloquant affiché lorsqu'une mise à jour OTA est téléchargée et en attente.
 * Un seul bouton : « Redémarrer pour mettre à jour ». Pas de moyen de fermer.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Ionicons } from '@expo/vector-icons';

export interface ForceUpdateScreenProps {
  onReload: () => Promise<void>;
}

export function ForceUpdateScreen({ onReload }: ForceUpdateScreenProps): React.ReactElement {
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await onReload();
    } catch (e) {
      console.warn('[ForceUpdate] reload failed:', e);
      setReloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-download-outline" size={64} color={colors.primary.main} />
        </View>
        <Text variant="title" style={styles.title}>
          Une mise à jour est disponible
        </Text>
        <Text variant="body" style={styles.message}>
          Redémarrez l'application pour utiliser la dernière version.
        </Text>
        <Button
          title="Redémarrer pour mettre à jour"
          onPress={handleReload}
          disabled={reloading}
          loading={reloading}
          style={styles.button}
          accessibilityLabel="Redémarrer pour mettre à jour"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background?.primary ?? colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    maxWidth: 320,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing['2xl'],
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.gray[900],
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    color: colors.gray[600],
  },
  button: {
    minWidth: 200,
  },
});
