import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Screen, Text, Button, Card } from '../design-system/components';
import { colors } from '../design-system/colors';
import { typography } from '../design-system/typography';
import { FarmAgentConfigService, MethodComparisonStats } from '../services/agent/FarmAgentConfigService';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../utils/webAlert';

/**
 * Écran de paramètres ferme - Configuration Agent IA
 */
export default function FarmSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentMethod, setCurrentMethod] = useState<'simple' | 'pipeline'>('simple');
  const [stats, setStats] = useState<MethodComparisonStats | null>(null);
  const [farmId, setFarmId] = useState<number | null>(null);

  const configService = new FarmAgentConfigService(supabase);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);

      // Récupérer l'ID de ferme active
      const { data: profile } = await supabase
        .from('profiles')
        .select('latest_active_farm_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.latest_active_farm_id) {
        showAlert('Erreur', 'Aucune ferme active');
        return;
      }

      setFarmId(profile.latest_active_farm_id);

      // Charger la configuration
      const config = await configService.getFarmConfig(profile.latest_active_farm_id);
      setCurrentMethod(config.agent_method);

      // Charger les statistiques
      const comparisonStats = await configService.getMethodComparisonStats(profile.latest_active_farm_id);
      setStats(comparisonStats);

    } catch (error) {
      console.error('Error loading config:', error);
      showAlert('Erreur', 'Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = async (method: 'simple' | 'pipeline') => {
    if (!farmId) return;

    console.log('🔧 [FarmSettings] Changement méthode demandé:', method);

    const methodName = method === 'simple' ? 'Simple (rapide)' : 'Pipeline (avancée)';
    
    // showAlert avec callback pour web compatibility
    showAlert(
      'Changer de méthode d\'analyse',
      `Voulez-vous passer à la méthode ${methodName} ?`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel',
          onPress: () => console.log('❌ [FarmSettings] Changement annulé')
        },
        { 
          text: 'Confirmer', 
          style: 'default',
          onPress: async () => {
            console.log('✅ [FarmSettings] Changement confirmé, début mise à jour...');
            try {
              setLoading(true);
              console.log('📡 [FarmSettings] Appel updateAgentMethod...');
              
              await configService.updateAgentMethod(
                farmId,
                method,
                `Changement utilisateur depuis paramètres`
              );
              
              console.log('✅ [FarmSettings] Méthode mise à jour en DB');
              setCurrentMethod(method);
              
              console.log('📡 [FarmSettings] Rechargement configuration...');
              await loadConfiguration();
              
              console.log('✅ [FarmSettings] Configuration rechargée');
              showAlert('✅ Succès', `Méthode ${method} activée`);
            } catch (error) {
              console.error('❌ [FarmSettings] Error updating method:', error);
              showAlert('Erreur', 'Impossible de changer la méthode');
            } finally {
              setLoading(false);
              console.log('🏁 [FarmSettings] Processus terminé');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Assistant IA Thomas</Text>
          <Text style={styles.subtitle}>
            Choisissez la méthode d'analyse des messages
          </Text>
        </View>

        {/* Méthode Simple */}
        <Card style={[
          styles.methodCard,
          currentMethod === 'simple' && styles.activeCard
        ]}>
          <View style={styles.methodHeader}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>⚡ Méthode Simple</Text>
              {currentMethod === 'simple' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.methodSubtitle}>Analyse rapide en un appel</Text>
          </View>

          <View style={styles.methodContent}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureText}>Rapide: ~2-3 secondes</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>✅</Text>
              <Text style={styles.featureText}>Fiable et testée</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>💰</Text>
              <Text style={styles.featureText}>Économique (1 appel IA)</Text>
            </View>

            {stats && stats.simple.total_count > 0 && (
              <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>Statistiques</Text>
                <Text style={styles.statsText}>
                  ✓ {stats.simple.success_count} / {stats.simple.total_count} succès
                </Text>
                <Text style={styles.statsText}>
                  📊 Taux: {stats.simple.success_rate}%
                </Text>
              </View>
            )}
          </View>

          {currentMethod !== 'simple' && (
            <Button
              title="Activer la méthode Simple"
              onPress={() => handleMethodChange('simple')}
              variant="primary"
              style={styles.button}
            />
          )}
        </Card>

        {/* Méthode Pipeline */}
        <Card style={[
          styles.methodCard,
          currentMethod === 'pipeline' && styles.activeCard
        ]}>
          <View style={styles.methodHeader}>
            <View style={styles.methodTitleRow}>
              <Text style={styles.methodTitle}>🔬 Méthode Pipeline</Text>
              {currentMethod === 'pipeline' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={styles.methodSubtitle}>Analyse modulaire avancée</Text>
          </View>

          <View style={styles.methodContent}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🧠</Text>
              <Text style={styles.featureText}>Intelligente: analyse en 6 étapes</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Précise: tool calling autonome</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🔧</Text>
              <Text style={styles.featureText}>Évolutive: facile à améliorer</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>⏱️</Text>
              <Text style={styles.featureText}>Plus lente: ~5-8 secondes</Text>
            </View>

            {stats && stats.pipeline.total_count > 0 && (
              <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>Statistiques</Text>
                <Text style={styles.statsText}>
                  ✓ {stats.pipeline.success_count} / {stats.pipeline.total_count} succès
                </Text>
                <Text style={styles.statsText}>
                  📊 Taux: {stats.pipeline.success_rate}%
                </Text>
              </View>
            )}
          </View>

          {currentMethod !== 'pipeline' && (
            <Button
              title="Activer la méthode Pipeline"
              onPress={() => handleMethodChange('pipeline')}
              variant="secondary"
              style={styles.button}
            />
          )}
        </Card>

        {/* Recommandation */}
        {stats && stats.recommended_method !== 'insufficient_data' && (
          <Card style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>💡 Recommandation</Text>
            <Text style={styles.recommendationText}>
              {stats.recommended_method === 'simple' ? '⚡ Méthode Simple' : '🔬 Méthode Pipeline'} recommandée
            </Text>
            <Text style={styles.recommendationReason}>{stats.reason}</Text>
          </Card>
        )}

        {/* Information */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Information</Text>
          <Text style={styles.infoText}>
            Vous pouvez changer de méthode à tout moment. Les deux méthodes analysent 
            vos messages de la même manière, seule la technologie diffère.
          </Text>
          <Text style={styles.infoText}>
            {'\n'}La méthode Simple est recommandée pour un usage quotidien. 
            La méthode Pipeline est en phase de test pour des analyses plus précises.
          </Text>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  methodCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  activeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  methodHeader: {
    marginBottom: 16,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  methodSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  activeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  methodContent: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  featureText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  statsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statsText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: 2,
  },
  button: {
    marginTop: 8,
  },
  recommendationCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  recommendationTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  infoCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.info + '10',
    borderWidth: 1,
    borderColor: colors.info,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  spacer: {
    height: 32,
  },
});
