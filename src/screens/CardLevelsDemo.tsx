import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Screen, Text, Button } from '../design-system/components';
import {
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  ObservationCardMinimal,
  ObservationCardStandard,
  ObservationCardDetailed,
} from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

// Données d'exemple
const sampleTask = {
  id: '1',
  title: 'Comparaison de variétés de tomates cerises sous tunnel',
  type: 'completed' as const,
  date: new Date('2024-11-15T14:30:00'),
  duration: 120,
  people: 1,
  crops: ['tomate', 'variétal'],
  plots: ['tunnel', '+2'],
  category: 'Production' as const,
  notes: 'Essai variétal avec 5 indicateurs suivis et 4 modalités (1 témoin). Comparaison des rendements et de la qualité gustative.',
  status: 'Terminée' as const,
};

const sampleObservation = {
  id: '1',
  title: 'Pucerons détectés sur plants de tomates',
  date: new Date('2024-11-18T09:15:00'),
  severity: 'Moyen' as const,
  category: 'ravageurs' as const,
  crops: ['tomate', 'courgette'],
  plots: ['Serre A', 'Parcelle 3'],
  description: 'Présence de pucerons verts sur les jeunes pousses. Concentration principalement sur les plants de tomates cerises.',
  weather: {
    temperature: 22,
    humidity: 75,
    conditions: 'Ensoleillé',
  },
  photos: 3,
  actions: [
    'Traitement biologique avec auxiliaires',
    'Surveillance renforcée',
    'Contrôle de l\'humidité'
  ],
  status: 'En cours' as const,
};

type CardLevel = 'minimal' | 'standard' | 'detailed';

interface CardLevelsDemoProps {
  onBack?: () => void;
}

export const CardLevelsDemo: React.FC<CardLevelsDemoProps> = ({ onBack }) => {
  const [selectedLevel, setSelectedLevel] = useState<CardLevel>('minimal');

  const handleTaskAction = (action: string, task: any) => {
    console.log(`Action "${action}" sur la tâche:`, task.title);
  };

  const handleObservationAction = (action: string, observation: any) => {
    console.log(`Action "${action}" sur l'observation:`, observation.title);
  };

  const renderTaskCard = () => {
    const commonProps = {
      task: sampleTask,
      onPress: (task: any) => handleTaskAction('press', task),
      onEdit: (task: any) => handleTaskAction('edit', task),
      onDelete: (task: any) => handleTaskAction('delete', task),
    };

    switch (selectedLevel) {
      case 'minimal':
        return <TaskCardMinimal {...commonProps} />;
      case 'standard':
        return <TaskCardStandard {...commonProps} />;
      case 'detailed':
        return (
          <TaskCardDetailed
            {...commonProps}
            onComment={(task: any) => handleTaskAction('comment', task)}
            onToggleStatus={(task: any) => handleTaskAction('toggleStatus', task)}
          />
        );
      default:
        return null;
    }
  };

  const renderObservationCard = () => {
    const commonProps = {
      observation: sampleObservation,
      onPress: (obs: any) => handleObservationAction('press', obs),
      onEdit: (obs: any) => handleObservationAction('edit', obs),
      onDelete: (obs: any) => handleObservationAction('delete', obs),
      onViewPhotos: (obs: any) => handleObservationAction('viewPhotos', obs),
    };

    switch (selectedLevel) {
      case 'minimal':
        return <ObservationCardMinimal {...commonProps} />;
      case 'standard':
        return <ObservationCardStandard {...commonProps} />;
      case 'detailed':
        return (
          <ObservationCardDetailed
            {...commonProps}
            onResolve={(obs: any) => handleObservationAction('resolve', obs)}
          />
        );
      default:
        return null;
    }
  };

  const getLevelDescription = () => {
    switch (selectedLevel) {
      case 'minimal':
        return 'Niveau 1 - Minimal : Titre + 1-2 informations essentielles + bouton supprimer';
      case 'standard':
        return 'Niveau 2 - Standard : Informations principales avec cartouches et actions de base';
      case 'detailed':
        return 'Niveau 3 - Détaillé : Toutes les informations, descriptions complètes et actions étendues';
      default:
        return '';
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <View style={{ marginBottom: spacing.xl }}>
            {onBack && (
              <Button
                title="← Retour"
                variant="secondary"
                size="small"
                onPress={onBack}
                style={{ alignSelf: 'flex-start', marginBottom: spacing.md }}
              />
            )}
            <Text variant="title" style={{ marginBottom: spacing.sm }}>
              Niveaux de Cartes
            </Text>
            <Text variant="body" color={colors.gray[600]} style={{ marginBottom: spacing.lg }}>
              Trois niveaux de détail pour s'adapter aux différents contextes d'utilisation.
            </Text>

            {/* Sélecteur de niveau */}
            <View style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}>
              <Button
                title="Minimal"
                variant={selectedLevel === 'minimal' ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setSelectedLevel('minimal')}
              />
              <Button
                title="Standard"
                variant={selectedLevel === 'standard' ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setSelectedLevel('standard')}
              />
              <Button
                title="Détaillé"
                variant={selectedLevel === 'detailed' ? 'primary' : 'secondary'}
                size="small"
                onPress={() => setSelectedLevel('detailed')}
              />
            </View>

            {/* Description du niveau */}
            <View style={{
              backgroundColor: colors.primary[50],
              padding: spacing.md,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary[500],
            }}>
              <Text variant="bodySmall" color={colors.primary[700]}>
                {getLevelDescription()}
              </Text>
            </View>
          </View>

          {/* Cartes de tâches */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Carte de Tâche - Niveau {selectedLevel === 'minimal' ? '1' : selectedLevel === 'standard' ? '2' : '3'}
            </Text>
            {renderTaskCard()}
          </View>

          {/* Cartes d'observations */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Carte d'Observation - Niveau {selectedLevel === 'minimal' ? '1' : selectedLevel === 'standard' ? '2' : '3'}
            </Text>
            {renderObservationCard()}
          </View>

          {/* Informations sur les niveaux */}
          <View style={{
            backgroundColor: colors.gray[50],
            padding: spacing.lg,
            borderRadius: 12,
            marginBottom: spacing.xl,
          }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Guide des Niveaux
            </Text>

            <View style={{ gap: spacing.md }}>
              <View>
                <Text variant="body" weight="semibold" color={colors.primary[700]}>
                  Niveau 1 - Minimal
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Titre sur une ligne
                  • 1-2 informations essentielles (date, durée/sévérité)
                  • Bouton supprimer uniquement
                  • Hauteur réduite, idéal pour les listes denses
                </Text>
              </View>

              <View>
                <Text variant="body" weight="semibold" color={colors.secondary.blue}>
                  Niveau 2 - Standard
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Titre sur deux lignes
                  • Cartouches principales (cultures, catégorie, etc.)
                  • Actions de base (éditer, supprimer)
                  • Équilibre entre information et compacité
                </Text>
              </View>

              <View>
                <Text variant="body" weight="semibold" color={colors.secondary.orange}>
                  Niveau 3 - Détaillé
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Toutes les informations disponibles
                  • Descriptions complètes et notes
                  • Actions étendues (commenter, résoudre, etc.)
                  • Heure précise et conditions météo
                  • Idéal pour la consultation détaillée
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};
