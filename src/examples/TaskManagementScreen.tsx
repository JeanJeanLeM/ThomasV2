/**
 * Exemple d'utilisation du Design System Thomas V2
 * Écran de gestion des tâches avec différents niveaux de cartes
 */

import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Screen,
  UnifiedHeader,
  Text,
  Button,
  DropdownSelector,
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  colors,
  spacing,
} from '../design-system';

// Types
type ViewMode = 'compact' | 'standard' | 'detailed';
type TaskFilter = 'all' | 'completed' | 'planned';

// Données d'exemple
const sampleTasks = [
  {
    id: '1',
    title: 'Semis de radis variété Cherry Belle',
    type: 'completed' as const,
    date: new Date('2024-11-15T08:00:00'),
    duration: 45,
    people: 2,
    crops: ['radis'],
    plots: ['Serre B'],
    category: 'Production' as const,
    notes: 'Semis réalisé en godets, germination attendue dans 3-4 jours.',
    status: 'Terminée' as const,
  },
  {
    id: '2',
    title: 'Récolte courgettes pour marché',
    type: 'planned' as const,
    date: new Date('2024-11-20T06:30:00'),
    duration: 90,
    people: 3,
    crops: ['courgette'],
    plots: ['Parcelle 1', 'Parcelle 2'],
    category: 'Marketing' as const,
    status: 'Prévue' as const,
  },
  {
    id: '3',
    title: 'Traitement préventif mildiou tomates',
    type: 'planned' as const,
    date: new Date('2024-11-18T16:00:00'),
    duration: 60,
    people: 1,
    crops: ['tomate'],
    plots: ['Serre A', 'Tunnel 1'],
    category: 'Production' as const,
    notes: 'Traitement à base de cuivre, respecter les doses homologuées.',
    status: 'Prévue' as const,
  },
];

const viewModeOptions = [
  { id: 'compact', label: 'Vue compacte', type: 'Rapide' },
  { id: 'standard', label: 'Vue standard', type: 'Équilibrée' },
  { id: 'detailed', label: 'Vue détaillée', type: 'Complète' },
];

const filterOptions = [
  { id: 'all', label: 'Toutes les tâches', type: 'Filtre' },
  { id: 'completed', label: 'Terminées', type: 'Filtre' },
  { id: 'planned', label: 'Planifiées', type: 'Filtre' },
];

export const TaskManagementScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [filter, setFilter] = useState<TaskFilter>('all');

  // Filtrage des tâches
  const filteredTasks = sampleTasks.filter(task => {
    if (filter === 'all') return true;
    return task.type === filter;
  });

  // Gestion des actions sur les tâches
  const handleTaskPress = (task: any) => {
    console.log('Ouvrir détail tâche:', task.title);
  };

  const handleTaskEdit = (task: any) => {
    console.log('Éditer tâche:', task.title);
  };

  const handleTaskDelete = (task: any) => {
    console.log('Supprimer tâche:', task.title);
  };

  const handleTaskComment = (task: any) => {
    console.log('Commenter tâche:', task.title);
  };

  const handleTaskToggle = (task: any) => {
    console.log('Changer statut tâche:', task.title);
  };

  // Rendu des cartes selon le mode de vue
  const renderTaskCard = (task: any) => {
    const commonProps = {
      key: task.id,
      task,
      onPress: handleTaskPress,
      onEdit: handleTaskEdit,
      onDelete: handleTaskDelete,
    };

    switch (viewMode) {
      case 'compact':
        return <TaskCardMinimal {...commonProps} />;
      
      case 'standard':
        return <TaskCardStandard {...commonProps} />;
      
      case 'detailed':
        return (
          <TaskCardDetailed
            {...commonProps}
            onComment={handleTaskComment}
            onToggleStatus={handleTaskToggle}
          />
        );
      
      default:
        return <TaskCardStandard {...commonProps} />;
    }
  };

  return (
    <Screen>
      {/* Header avec titre et actions */}
      <UnifiedHeader
        title="Gestion des Tâches"
        showBackButton={true}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: spacing.lg }}>
          
          {/* Contrôles de vue et filtres */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Options d'affichage
            </Text>
            
            {/* Sélecteur de mode de vue */}
            <View style={{ marginBottom: spacing.md }}>
              <DropdownSelector
                label="Mode d'affichage"
                placeholder="Choisir un mode de vue"
                items={viewModeOptions}
                selectedItems={viewModeOptions.filter(item => item.id === viewMode)}
                onSelectionChange={(items) => {
                  if (items.length > 0) {
                    setViewMode(items[0].id as ViewMode);
                  }
                }}
                multiSelect={false}
              />
            </View>

            {/* Filtre par statut */}
            <DropdownSelector
              label="Filtrer par statut"
              placeholder="Choisir un filtre"
              items={filterOptions}
              selectedItems={filterOptions.filter(item => item.id === filter)}
              onSelectionChange={(items) => {
                if (items.length > 0) {
                  setFilter(items[0].id as TaskFilter);
                }
              }}
              multiSelect={false}
            />
          </View>

          {/* Statistiques rapides */}
          <View style={{
            flexDirection: 'row',
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: colors.primary[50],
              padding: spacing.md,
              borderRadius: 8,
              alignItems: 'center',
            }}>
              <Text variant="title" color={colors.primary[700]}>
                {sampleTasks.length}
              </Text>
              <Text variant="caption" color={colors.primary[600]}>
                Total
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: colors.status.completed + '20',
              padding: spacing.md,
              borderRadius: 8,
              alignItems: 'center',
            }}>
              <Text variant="title" color={colors.status.completed}>
                {sampleTasks.filter(t => t.type === 'completed').length}
              </Text>
              <Text variant="caption" color={colors.status.completed}>
                Terminées
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: colors.status.planned + '20',
              padding: spacing.md,
              borderRadius: 8,
              alignItems: 'center',
            }}>
              <Text variant="title" color={colors.status.planned}>
                {sampleTasks.filter(t => t.type === 'planned').length}
              </Text>
              <Text variant="caption" color={colors.status.planned}>
                Planifiées
              </Text>
            </View>
          </View>

          {/* Liste des tâches */}
          <View style={{ marginBottom: spacing.lg }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Tâches ({filteredTasks.length})
            </Text>
            
            {filteredTasks.length === 0 ? (
              <View style={{
                backgroundColor: colors.gray[50],
                padding: spacing.xl,
                borderRadius: 8,
                alignItems: 'center',
              }}>
                <Text variant="body" color={colors.gray[600]} style={{ textAlign: 'center' }}>
                  Aucune tâche ne correspond aux critères sélectionnés.
                </Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {filteredTasks.map(renderTaskCard)}
              </View>
            )}
          </View>

          {/* Actions rapides */}
          <View style={{
            backgroundColor: colors.background.secondary,
            padding: spacing.lg,
            borderRadius: 12,
            marginBottom: spacing.xl,
          }}>
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>
              Actions rapides
            </Text>
            
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Planifier nouvelle tâche"
                variant="primary"
                onPress={() => console.log('Planifier tâche')}
              />
              
              <Button
                title="Voir le planning de la semaine"
                variant="secondary"
                onPress={() => console.log('Voir planning')}
              />
              
              <Button
                title="Exporter les tâches"
                variant="outline"
                onPress={() => console.log('Exporter')}
              />
            </View>
          </View>

          {/* Informations sur le mode de vue actuel */}
          <View style={{
            backgroundColor: colors.primary[50],
            padding: spacing.md,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary[500],
          }}>
            <Text variant="caption" color={colors.primary[700]} weight="semibold">
              Mode d'affichage actuel : {viewMode}
            </Text>
            <Text variant="caption" color={colors.primary[600]}>
              {viewMode === 'compact' && 'Vue optimisée pour parcourir rapidement de nombreuses tâches'}
              {viewMode === 'standard' && 'Vue équilibrée avec les informations essentielles'}
              {viewMode === 'detailed' && 'Vue complète avec toutes les informations et actions'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};
