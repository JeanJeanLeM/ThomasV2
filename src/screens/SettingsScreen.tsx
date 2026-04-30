import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { textStyles } from '../design-system/typography';
import { 
  MapIcon, 
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  QuestionMarkCircleIcon,
  MicrophoneIcon,
  CogIcon,
  UserIcon,
  SproutIcon
} from '../design-system/icons';
import { Text } from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { useNavigation } from '../contexts/NavigationContext';
import { ConversionService } from '../services/ConversionService';
import InterfaceTourTarget from '../components/interface-tour/InterfaceTourTarget';

interface SettingsScreenProps {
  onNavigate: (screen: 'PlotsSettings' | 'MaterialsSettings' | 'ConversionsSettings' | 'CulturesListSettings' | 'PhytosanitaryProductsSettings' | 'RecurringTasksSettings') => void;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const { activeFarm, farmData } = useFarm();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const optionLayoutsRef = useRef<Record<string, number>>({});
  const optionsContainerYRef = useRef(0);
  const [userConversions, setUserConversions] = useState<any[]>([]);
  const isInterfaceTourMode = navigation.navigationParams?.interfaceTourMode === true;
  const interfaceTourTargetId = navigation.navigationParams?.interfaceTourTargetId as string | undefined;

  // Charger les conversions de la ferme
  useEffect(() => {
    const loadUserConversions = async () => {
      if (!activeFarm?.farm_id) {
        console.log('⚠️ [SETTINGS] Farm ID manquant, skip du chargement des conversions');
        setUserConversions([]);
        return;
      }

      try {
        console.log('🔄 [SETTINGS] Chargement des conversions actives...', {
          farmId: activeFarm.farm_id
        });

        const conversions = await ConversionService.getActiveConversions(
          activeFarm.farm_id
        );

        console.log(`✅ [SETTINGS] ${conversions.length} conversions actives chargées pour farm_id=${activeFarm.farm_id}:`, 
          conversions.map(c => ({ 
            id: c.id, 
            name: `${c.container_name} de ${c.crop_name}`, 
            active: c.is_active 
          }))
        );

        setUserConversions(conversions);
      } catch (err) {
        console.error('❌ [SETTINGS] Erreur chargement conversions utilisateur:', err);
        setUserConversions([]);
      }
    };

    loadUserConversions();
  }, [activeFarm?.farm_id]);

  useEffect(() => {
    if (!isInterfaceTourMode || !interfaceTourTargetId?.startsWith('settings.option.')) return;

    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scrollToTarget = () => {
      const targetY = optionLayoutsRef.current[interfaceTourTargetId];
      if (typeof targetY !== 'number') {
        attempts += 1;
        if (attempts < 10) {
          timeout = setTimeout(scrollToTarget, 80);
        }
        return;
      }

      scrollViewRef.current?.scrollTo({
        y: Math.max(0, optionsContainerYRef.current + targetY - 96),
        animated: false,
      });
    };

    timeout = setTimeout(scrollToTarget, 80);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [interfaceTourTargetId, isInterfaceTourMode]);

  const settingsOptions = [
    {
      id: 'materials',
      title: 'Matériel agricole',
      subtitle: 'Gérez vos tracteurs, outils et équipements avec l\'IA vocale ou le formulaire guidé',
      icon: <WrenchScrewdriverIcon color={colors.semantic.success} size={28} />,
      borderColor: colors.semantic.success,
      onPress: () => onNavigate('MaterialsSettings'),
      hasVoiceAI: true,
      hasForm: true
    },
    {
      id: 'plots',
      title: 'Parcelles et planches',
      subtitle: 'Configurez vos parcelles et planches de culture avec l\'IA vocale ou manuellement',
      icon: <MapIcon color={colors.primary[600]} size={28} />,
      borderColor: colors.primary[600],
      onPress: () => onNavigate('PlotsSettings'),
      hasVoiceAI: true,
      hasForm: true
    },
    {
      id: 'conversions',
      title: 'Tables de conversion',
      subtitle: 'Définissez les conversions entre contenants et unités de mesure',
      icon: <CogIcon color={colors.semantic.warning} size={28} />,
      borderColor: colors.semantic.warning,
      onPress: () => onNavigate('ConversionsSettings'),
      hasVoiceAI: false,
      hasForm: true
    },
    {
      id: 'cultures',
      title: 'Liste de cultures',
      subtitle: 'Personnalisez votre liste de cultures selon votre profil',
      icon: <SproutIcon color={colors.semantic.success} size={28} />,
      borderColor: colors.semantic.success,
      onPress: () => onNavigate('CulturesListSettings'),
      hasVoiceAI: false,
      hasForm: true
    },
    {
      id: 'phytosanitary',
      title: 'Produits phytosanitaires',
      subtitle: 'Gérez votre liste de produits utilisés sur l\'exploitation',
      icon: <CogIcon color={colors.semantic.warning} size={28} />,
      borderColor: colors.semantic.warning,
      onPress: () => onNavigate('PhytosanitaryProductsSettings'),
      hasVoiceAI: false,
      hasForm: true
    },
    {
      id: 'tasks',
      title: 'Tâches récurrentes',
      subtitle: 'Configurez des tâches qui se répètent automatiquement',
      icon: <ClipboardDocumentListIcon color={colors.secondary.purple} size={28} />,
      borderColor: colors.secondary.purple,
      onPress: () => onNavigate('RecurringTasksSettings'),
      hasVoiceAI: false,
      hasForm: true
    }
  ];

// Calculer les statistiques réelles basées sur les données de la ferme
const stats = useMemo(() => {
  if (!activeFarm || !farmData) {
    return { materials: 0, plots: 0, conversions: 0 };
  }

  // Compter les matériels actifs
  const activeMaterials = farmData.materials?.filter(material => 
    material.is_active !== false
  ).length || 0;

  // Compter les parcelles actives (avec filtre strict)
  const activePlots = farmData.plots?.filter(plot => 
    plot.status === 'active'
  ).length || 0;

  // Utiliser les conversions chargées séparément
  const conversionsCount = userConversions.length;

  return {
    materials: activeMaterials,
    plots: activePlots,
    conversions: conversionsCount
  };
}, [activeFarm, farmData, userConversions]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Aperçu des données */}
          <View style={styles.dataOverviewSection}>
            <View style={styles.dataOverviewHeader}>
              <MapIcon color={colors.primary[600]} size={24} />
              <Text variant="h3" style={styles.dataOverviewTitle}>
                Aperçu de vos données
              </Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.materials}</Text>
                <Text style={styles.statLabel}>Matériels</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.plots}</Text>
                <Text style={styles.statLabel}>Parcelles actives</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.conversions}</Text>
                <Text style={styles.statLabel}>Conversions</Text>
              </View>
            </View>
          </View>

          {/* Options de paramètres */}
          <View
            style={styles.optionsContainer}
            onLayout={(event) => {
              optionsContainerYRef.current = event.nativeEvent.layout.y;
            }}
          >
            {settingsOptions.map((option) => {
              const targetId =
                option.id === 'materials'
                  ? 'settings.option.materials'
                  : option.id === 'plots'
                    ? 'settings.option.plots'
                    : option.id === 'conversions'
                      ? 'settings.option.conversions'
                      : option.id === 'cultures'
                        ? 'settings.option.cultures'
                        : option.id === 'phytosanitary'
                          ? 'settings.option.phytosanitary'
                          : option.id === 'tasks'
                            ? 'settings.option.recurring-tasks'
                            : undefined;

              const card = (
                <TouchableOpacity
                  style={[styles.optionCard, { borderLeftColor: option.borderColor }]}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.optionIcon}>
                      {option.icon}
                    </View>
                    
                    <View style={styles.optionContent}>
                      <Text variant="h4" style={styles.optionTitle}>
                        {option.title}
                      </Text>
                      <Text variant="caption" style={styles.optionSubtitle}>
                        {option.subtitle}
                      </Text>
                    </View>
                    
                    <UserIcon 
                      color={colors.gray[400]} 
                      size={20} 
                    />
                  </View>

                  {/* Méthodes disponibles */}
                  <View style={styles.methodsRow}>
                    {option.hasForm && (
                      <View style={styles.methodBadge}>
                        <ClipboardDocumentListIcon color={colors.primary[600]} size={16} />
                        <Text style={styles.methodBadgeText}>Formulaire guidé</Text>
                      </View>
                    )}
                    {option.hasVoiceAI && (
                      <View style={styles.methodBadge}>
                        <MicrophoneIcon color={colors.semantic.success} size={16} />
                        <Text style={styles.methodBadgeText}>IA vocale</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );

              if (!targetId) {
                return <View key={option.id}>{card}</View>;
              }

              return (
                <View
                  key={option.id}
                  onLayout={(event) => {
                    optionLayoutsRef.current[targetId] = event.nativeEvent.layout.y;
                  }}
                >
                  <InterfaceTourTarget targetId={targetId}>
                    {card}
                  </InterfaceTourTarget>
                </View>
              );
            })}
          </View>

          {/* Section Comment ça marche */}
          <View style={styles.howItWorksSection}>
            <View style={styles.howItWorksHeader}>
              <QuestionMarkCircleIcon color={colors.semantic.warning} size={24} />
              <Text variant="h3" style={styles.howItWorksTitle}>
                Comment ça marche ?
              </Text>
            </View>
            
            <View style={styles.methodsContainer}>
              <View style={styles.methodCard}>
                <ClipboardDocumentListIcon color={colors.primary[600]} size={20} />
                <Text variant="body" style={styles.methodTitle}>Formulaire guidé</Text>
                <Text variant="caption" style={styles.methodSubtitle}>
                  Interface classique avec champs à remplir étape par étape
                </Text>
              </View>
              
              <View style={styles.methodCard}>
                <MicrophoneIcon color={colors.semantic.success} size={20} />
                <Text variant="body" style={styles.methodTitle}>IA vocale</Text>
                <Text variant="caption" style={styles.methodSubtitle}>
                  Décrivez vos équipements ou parcelles à voix haute, l'IA s'occupe du reste
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  // Section Comment ça marche
  howItWorksSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  howItWorksTitle: {
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  methodTitle: {
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  methodSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Section Aperçu des données
  dataOverviewSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dataOverviewTitle: {
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...textStyles.statNumber,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Options de paramètres
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontSize: 18,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  methodBadgeText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});
