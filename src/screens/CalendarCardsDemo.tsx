import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Screen, UnifiedHeader, Text } from '../design-system/components';
import { TaskCard, TaskData } from '../design-system/components/cards/TaskCard';
import { ObservationCard, ObservationData } from '../design-system/components/cards/ObservationCard';
import { TaskEditModal } from '../design-system/components/modals/TaskEditModal';
import { BackIcon, AddIcon } from '../design-system/icons';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

interface CalendarCardsDemoProps {
  onBack: () => void;
}

export const CalendarCardsDemo: React.FC<CalendarCardsDemoProps> = ({ onBack }) => {
  const [tasks, setTasks] = useState<TaskData[]>([
    {
      id: '1',
      title: 'récolter tomate',
      type: 'completed',
      date: new Date('2025-11-18'),
      duration: 60,
      people: 1,
      crops: ['tomate'],
      plots: ['Serre 1'],
      category: 'Production',
      status: 'Terminée',
    },
    {
      id: '2',
      title: 'Plantation courgettes',
      type: 'planned',
      date: new Date('2025-11-20'),
      duration: 120,
      people: 2,
      crops: ['courgette'],
      plots: ['Tunnel Nord', 'Planche 3'],
      category: 'Production',
      status: 'Prévue',
    },
    {
      id: '3',
      title: 'Préparation commande marché',
      type: 'planned',
      date: new Date('2025-11-19'),
      duration: 45,
      people: 1,
      category: 'Marketing',
      status: 'Prévue',
    },
  ]);

  const [observations, setObservations] = useState<ObservationData[]>([
    {
      id: '1',
      title: 'Pucerons détectés sur aubergines',
      description: 'Présence importante de pucerons verts sur les feuilles des aubergines, principalement sur les jeunes pousses.',
      date: new Date('2025-11-18T14:30:00'),
      severity: 'Moyen',
      category: 'ravageurs',
      crops: ['aubergine'],
      plots: ['Tunnel Sud'],
      weather: {
        temperature: 22,
        humidity: 68,
        conditions: 'Ensoleillé',
      },
      photos: 3,
      actions: ['Traitement savon noir', 'Surveillance quotidienne', 'Introduction auxiliaires'],
      status: 'Nouvelle',
    },
    {
      id: '2',
      title: 'Mildiou sur tomates',
      description: 'Taches brunes sur les feuilles, début de contamination.',
      date: new Date('2025-11-17T09:15:00'),
      severity: 'Élevé',
      category: 'maladies',
      crops: ['tomate'],
      plots: ['Serre 1', 'Serre 2'],
      weather: {
        temperature: 18,
        humidity: 85,
        conditions: 'Pluvieux',
      },
      photos: 5,
      actions: ['Traitement cuivre', 'Améliorer aération', 'Réduire arrosage'],
      status: 'En cours',
    },
    {
      id: '3',
      title: 'Croissance excellente des radis',
      description: 'Développement rapide et homogène de la parcelle de radis.',
      date: new Date('2025-11-16T11:00:00'),
      severity: 'Faible',
      category: 'croissance_anormale',
      crops: ['radis'],
      plots: ['Plein champ A'],
      weather: {
        temperature: 15,
        humidity: 60,
        conditions: 'Nuageux',
      },
      photos: 2,
      actions: ['Continuer suivi', 'Prévoir récolte dans 10 jours'],
      status: 'Suivie',
    },
  ]);

  const [editingTask, setEditingTask] = useState<TaskData | undefined>();
  const [editingObservation, setEditingObservation] = useState<ObservationData | undefined>();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);

  const handleTaskEdit = (task: TaskData) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleObservationEdit = (observation: ObservationData) => {
    setEditingObservation(observation);
    setShowObservationModal(true);
  };

  const handleTaskSave = (updatedTask: TaskData) => {
    setTasks(prev => {
      const index = prev.findIndex(t => t.id === updatedTask.id);
      if (index >= 0) {
        const newTasks = [...prev];
        newTasks[index] = updatedTask;
        return newTasks;
      } else {
        return [...prev, updatedTask];
      }
    });
    setShowTaskModal(false);
    setEditingTask(undefined);
  };

  const handleObservationSave = (updatedObservation: ObservationData) => {
    setObservations(prev => {
      const index = prev.findIndex(o => o.id === updatedObservation.id);
      if (index >= 0) {
        const newObservations = [...prev];
        newObservations[index] = updatedObservation;
        return newObservations;
      } else {
        return [...prev, updatedObservation];
      }
    });
    setShowObservationModal(false);
    setEditingObservation(undefined);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleObservationDelete = (observationId: string) => {
    setObservations(prev => prev.filter(o => o.id !== observationId));
  };

  const handleNewTask = () => {
    setEditingTask(undefined);
    setShowTaskModal(true);
  };

  const handleNewObservation = () => {
    setEditingObservation(undefined);
    setShowObservationModal(true);
  };

  return (
    <Screen safeArea>
      <UnifiedHeader
        title="Cartes Calendrier"
        showBackButton
        onBack={onBack}
      />

      <ScrollView className="flex-1 bg-primary-50">
        <View style={{ padding: spacing.layout.screenPadding }}>
          
          {/* Section Tâches */}
          <View style={{ marginBottom: spacing['2xl'] }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing.lg 
            }}>
              <Text variant="h2">Tâches Agricoles</Text>
              <View style={{
                backgroundColor: colors.primary[100],
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
              }}>
                <Text variant="caption" color={colors.primary[700]} weight="semibold">
                  {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => console.log('Task pressed:', task.title)}
                onEdit={handleTaskEdit}
                onComment={(task) => console.log('Comment on:', task.title)}
                onDelete={() => handleTaskDelete(task.id)}
              />
            ))}
          </View>

          {/* Section Observations */}
          <View style={{ marginBottom: spacing['2xl'] }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing.lg 
            }}>
              <Text variant="h2">Observations</Text>
              <View style={{
                backgroundColor: colors.secondary.orange + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
              }}>
                <Text variant="caption" color={colors.secondary.orange} weight="semibold">
                  {observations.length} observation{observations.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {observations.map((observation) => (
              <ObservationCard
                key={observation.id}
                observation={observation}
                onPress={() => console.log('Observation pressed:', observation.title)}
                onEdit={handleObservationEdit}
                onViewPhotos={(obs) => console.log('View photos:', obs.title)}
              />
            ))}
          </View>

          {/* Boutons d'ajout */}
          <View style={{ 
            flexDirection: 'row', 
            gap: spacing.md,
            marginBottom: spacing['3xl']
          }}>
            <View style={{ flex: 1 }}>
              <Text variant="button" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>
                Ajouter une tâche
              </Text>
              <TouchableOpacity
                onPress={handleNewTask}
                className="bg-primary-600 p-4 rounded-xl items-center"
              >
                <AddIcon color={colors.text.inverse} size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1 }}>
              <Text variant="button" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>
                Ajouter une observation
              </Text>
              <TouchableOpacity
                onPress={handleNewObservation}
                className="bg-secondary-orange p-4 rounded-xl items-center"
              >
                <AddIcon color={colors.text.inverse} size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Informations sur les cartes */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🎯 Fonctionnalités des Cartes
            </Text>
            
            <View style={{ gap: spacing.md }}>
              <View>
                <Text variant="label" color={colors.primary[600]}>
                  ✅ Cartes Tâches
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Différenciation visuelle effectuées/planifiées
                  • Cartouches d'information (cultures, personnes, durée)
                  • Actions rapides (édition, commentaire, suppression)
                  • Formulaire de modification complet
                </Text>
              </View>
              
              <View>
                <Text variant="label" color={colors.secondary.orange}>
                  👁️ Cartes Observations
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Sévérité avec code couleur
                  • Catégorisation (ravageurs, maladies, etc.)
                  • Conditions météo intégrées
                  • Actions recommandées
                  • Gestion des photos
                </Text>
              </View>
              
              <View>
                <Text variant="label" color={colors.secondary.blue}>
                  📝 Formulaires Intelligents
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  • Validation en temps réel
                  • Champs adaptatifs selon le type
                  • Sauvegarde et suppression sécurisées
                  • Interface optimisée mobile
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals d'édition */}
      <TaskEditModal
        visible={showTaskModal}
        task={editingTask}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(undefined);
        }}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
      />

      {/* ObservationEditModal removed - using ActionEditModal in production */}
    </Screen>
  );
};
