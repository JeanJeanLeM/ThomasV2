import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Screen, Text, Button } from '../design-system/components';
import { colors } from '../design-system/colors';
import { typography } from '../design-system/typography';
import { spacing } from '../design-system/spacing';
import { FarmAgentConfigService, MethodComparisonStats, AgentMethodMetrics } from '../services/agent/FarmAgentConfigService';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../utils/webAlert';
import { Ionicons } from '@expo/vector-icons';

interface MethodCardProps {
  active: boolean;
  accentColor: string;
  emoji: string;
  title: string;
  shortMeta: string;
  features: { icon: string; label: string }[];
  stats: AgentMethodMetrics | undefined;
  onActivate: () => void;
  activateLabel: string;
  activateVariant: 'primary' | 'secondary';
}

function AgentMethodCard({
  active,
  accentColor,
  emoji,
  title,
  shortMeta,
  features,
  stats,
  onActivate,
  activateLabel,
  activateVariant,
}: MethodCardProps) {
  const hasStats = stats && stats.total_count > 0;

  return (
    <View style={[styles.cardShell, active && styles.cardShellActive]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconCircleEmoji}>{emoji}</Text>
          </View>
          <View style={styles.shortTexts}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              {active && (
                <View style={styles.pillActive}>
                  <Text style={styles.pillActiveText}>Actif</Text>
                </View>
              )}
            </View>
            <Text style={styles.shortMeta}>{shortMeta}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.featureGrid}>
            {features.map((f) => (
              <View key={f.label} style={styles.featureChip}>
                <Text style={styles.featureChipIcon}>{f.icon}</Text>
                <Text style={styles.featureChipText}>{f.label}</Text>
              </View>
            ))}
          </View>

          {hasStats && (
            <View style={styles.statsInline}>
              <Text style={styles.statsInlineText}>
                {stats!.success_count}/{stats!.total_count} succès · {stats!.success_rate}%
              </Text>
            </View>
          )}

          {!active && (
            <Button
              title={activateLabel}
              onPress={onActivate}
              variant={activateVariant}
              style={styles.activateBtn}
            />
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Écran de paramètres ferme - Configuration Agent IA
 */
export default function FarmSettingsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentMethod, setCurrentMethod] = useState<'simple' | 'pipeline'>('pipeline');
  const [stats, setStats] = useState<MethodComparisonStats | null>(null);
  const [farmId, setFarmId] = useState<number | null>(null);

  const configService = new FarmAgentConfigService(supabase);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);

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

      const config = await configService.getFarmConfig(profile.latest_active_farm_id);
      setCurrentMethod(config.agent_method);

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

    const methodName = method === 'simple' ? 'Simple' : 'Pipeline';

    showAlert(
      'Changer de méthode',
      `Passer à la méthode ${methodName} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Confirmer',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await configService.updateAgentMethod(
                farmId,
                method,
                `Changement utilisateur depuis paramètres`
              );
              setCurrentMethod(method);
              await loadConfiguration();
              showAlert('Succès', `${methodName} activé`);
            } catch (error) {
              console.error('Error updating method:', error);
              showAlert('Erreur', 'Impossible de changer la méthode');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </Screen>
    );
  }

  const pipelineFeatures = [
    { icon: '🧠', label: '6 étapes' },
    { icon: '🎯', label: 'Tools auto' },
    { icon: '🔧', label: 'Évolutif' },
    { icon: '⏱️', label: '~5–8 s' },
  ];
  const simpleFeatures = [
    { icon: '⚡', label: '~2–3 s' },
    { icon: '✅', label: 'Stable' },
    { icon: '💰', label: '1 appel IA' },
  ];

  return (
    <Screen backgroundColor={colors.background.primary}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Assistant IA Thomas</Text>
          <Text style={styles.subtitle}>Méthode d’analyse des messages</Text>
        </View>

        <AgentMethodCard
          active={currentMethod === 'pipeline'}
          accentColor={colors.secondary.purple}
          emoji="🔬"
          title="Pipeline"
          shortMeta="Recommandé · multi-étapes · outils auto · ~5–8 s"
          features={pipelineFeatures}
          stats={stats ? stats.pipeline : undefined}
          onActivate={() => handleMethodChange('pipeline')}
          activateLabel="Activer Pipeline"
          activateVariant="primary"
        />

        <AgentMethodCard
          active={currentMethod === 'simple'}
          accentColor={colors.secondary.orange}
          emoji="⚡"
          title="Simple"
          shortMeta="Un seul appel IA · rapide · ~2–3 s"
          features={simpleFeatures}
          stats={stats ? stats.simple : undefined}
          onActivate={() => handleMethodChange('simple')}
          activateLabel="Activer Simple"
          activateVariant="secondary"
        />

        {stats && stats.recommended_method !== 'insufficient_data' && (
          <View style={styles.recoShell}>
            <View style={styles.recoHeader}>
              <Ionicons name="bulb-outline" size={20} color={colors.semantic.warning} />
              <Text style={styles.recoTitle}>
                Recommandation :{' '}
                {stats.recommended_method === 'simple' ? 'Simple' : 'Pipeline'}
              </Text>
            </View>
            <Text style={styles.recoReason}>{stats.reason}</Text>
          </View>
        )}

        <View style={styles.infoShell}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={22} color={colors.semantic.info} />
            <Text style={styles.infoTitle}>Information</Text>
          </View>
          <Text style={styles.infoBody}>
            Vous pouvez changer à tout moment. Par défaut, Thomas utilise Pipeline (ventes, achats,
            parcelles…). Simple = réponses un peu plus rapides, un seul appel IA.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },

  cardShell: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardShellActive: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  accentBar: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    paddingLeft: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleEmoji: {
    fontSize: 20,
  },
  shortTexts: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  pillActive: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  pillActiveText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.success[700],
  },
  shortMeta: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  details: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    marginTop: spacing.xs,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featureChipIcon: {
    fontSize: 12,
  },
  featureChipText: {
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  statsInline: {
    backgroundColor: colors.gray[50],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  statsInlineText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  activateBtn: {
    marginTop: spacing.xs,
  },

  recoShell: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning[200],
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  recoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recoTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  recoReason: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    paddingLeft: spacing.sm + 20,
  },

  infoShell: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  infoBody: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  spacer: {
    height: spacing.xl,
  },
});
