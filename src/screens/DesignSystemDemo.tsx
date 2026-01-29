import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import {
  Screen,
  UnifiedHeader,
  Navigation,
  Button,
  Input,
  Card,
  Modal,
  Text,
  TaskCardMinimal,
  TaskCardStandard,
  TaskCardDetailed,
  ObservationCardMinimal,
  ObservationCardStandard,
  ObservationCardDetailed,
  DropdownSelector,
} from '../design-system/components';
import {
  CalendarIcon,
  ChatIcon,
  StatsIcon,
  ExperimentsIcon,
  ProfileIcon,
  BackIcon,
  SettingsIcon,
  NotificationIcon,
  AddIcon,
} from '../design-system/icons';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

interface DesignSystemDemoProps {
  onBack: () => void;
}

export const DesignSystemDemo: React.FC<DesignSystemDemoProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('calendrier');
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedDropdownItems, setSelectedDropdownItems] = useState([]);

  // Données d'exemple pour les cartes
  const sampleTask = {
    id: '1',
    title: 'Plantation tomates cerises sous tunnel',
    type: 'completed' as const,
    date: new Date('2024-11-15T14:30:00'),
    duration: 120,
    people: 1,
    crops: ['tomate', 'variétal'],
    plots: ['tunnel', '+2'],
    category: 'Production' as const,
    notes: 'Essai variétal avec 5 indicateurs suivis et 4 modalités (1 témoin).',
    status: 'Terminée' as const,
  };

  const sampleObservation = {
    id: '1',
    title: 'Pucerons détectés sur aubergines',
    date: new Date('2024-11-18T09:15:00'),
    severity: 'Moyen' as const,
    category: 'ravageurs' as const,
    crops: ['aubergine'],
    plots: ['Tunnel Sud'],
    description: 'Présence de pucerons verts sur les jeunes pousses.',
    weather: {
      temperature: 22,
      humidity: 75,
    },
    photos: 2,
    actions: ['Traitement biologique', 'Surveillance renforcée'],
    status: 'En cours' as const,
  };

  const dropdownItems = [
    { id: 'tomate', label: 'Tomate', type: 'Production' },
    { id: 'aubergine', label: 'Aubergine', type: 'Production' },
    { id: 'courgette', label: 'Courgette', type: 'Marketing' },
  ];

  // Navigation tabs (from ThomasV2 architecture)
  const navigationTabs = [
    {
      id: 'calendrier',
      title: 'Agenda',
      icon: <CalendarIcon />,
      badge: 3,
    },
    {
      id: 'statistiques',
      title: 'Stats',
      icon: <StatsIcon />,
    },
    {
      id: 'chat',
      title: 'Thomas',
      icon: <ChatIcon />,
      badge: 1,
    },
    {
      id: 'essais',
      title: 'Essais',
      icon: <ExperimentsIcon />,
      badge: 2,
    },
    {
      id: 'profil',
      title: 'Profil',
      icon: <ProfileIcon />,
    },
  ];

  return (
    <Screen safeArea backgroundColor={colors.background.secondary}>
      {/* Header */}
      <UnifiedHeader
        title="Design System Thomas V2"
        showBackButton
        onBack={onBack}
      />

      {/* Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: spacing.layout.screenPadding, gap: spacing.lg }}>
          
          {/* Typography Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Typographie</Text>
            <View style={{ gap: spacing.sm }}>
              <Text variant="title">Titre Principal</Text>
              <Text variant="subtitle">Titre Secondaire</Text>
              <Text variant="body">Texte de corps principal pour les descriptions et contenus.</Text>
              <Text variant="taskTitle">Titre de Tâche Agricole</Text>
              <Text variant="plotName">Nom de Parcelle (Serre 1)</Text>
              <Text variant="cropName">Nom de Culture (Tomates cerises)</Text>
              <Text variant="caption">Texte de légende ou information secondaire</Text>
            </View>
          </Card>

          {/* Colors Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Palette de Couleurs</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <View style={{ 
                width: 60, 
                height: 60, 
                backgroundColor: colors.primary[600], 
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text variant="caption" color={colors.text.inverse}>Primary</Text>
              </View>
              <View style={{ 
                width: 60, 
                height: 60, 
                backgroundColor: colors.secondary.blue, 
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text variant="caption" color={colors.text.inverse}>Blue</Text>
              </View>
              <View style={{ 
                width: 60, 
                height: 60, 
                backgroundColor: colors.secondary.orange, 
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text variant="caption" color={colors.text.inverse}>Orange</Text>
              </View>
              <View style={{ 
                width: 60, 
                height: 60, 
                backgroundColor: colors.secondary.red, 
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text variant="caption" color={colors.text.inverse}>Red</Text>
              </View>
              <View style={{ 
                width: 60, 
                height: 60, 
                backgroundColor: colors.secondary.purple, 
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text variant="caption" color={colors.text.inverse}>Purple</Text>
              </View>
            </View>
          </Card>

          {/* Buttons Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Boutons</Text>
            <View style={{ gap: spacing.md }}>
              <Button title="Bouton Principal" variant="primary" />
              <Button title="Bouton Secondaire" variant="secondary" />
              <Button title="Bouton Contour" variant="outline" />
              <Button title="Bouton Fantôme" variant="ghost" />
              <Button title="Bouton Danger" variant="danger" />
              <Button 
                title="Avec Icône" 
                variant="primary" 
                leftIcon={<AddIcon color={colors.text.inverse} />}
              />
              <Button title="Chargement..." variant="primary" loading />
              <Button title="Désactivé" variant="primary" disabled />
            </View>
          </Card>

          {/* Inputs Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Champs de Saisie</Text>
            <View style={{ gap: spacing.md }}>
              <Input
                label="Nom de la parcelle"
                placeholder="Ex: Serre 1, Tunnel Nord..."
                value={inputValue}
                onChangeText={setInputValue}
                required
              />
              <Input
                label="Mot de passe"
                placeholder="Votre mot de passe"
                secureTextEntry
                hint="Au moins 8 caractères"
              />
              <Input
                label="Email"
                placeholder="votre@email.fr"
                error="Format d'email invalide"
              />
              <Input
                label="Champ désactivé"
                placeholder="Non modifiable"
                disabled
                value="Valeur fixe"
              />
            </View>
          </Card>

          {/* Dropdown Selector Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Dropdown Selector</Text>
            <DropdownSelector
              label="Sélectionner des cultures"
              placeholder="Choisir une ou plusieurs cultures"
              items={dropdownItems}
              selectedItems={selectedDropdownItems}
              onSelectionChange={setSelectedDropdownItems}
              multiSelect={true}
              onAddNew={() => console.log('Ajouter nouvelle culture')}
            />
          </Card>

          {/* Task Cards Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Cartes de Tâches - 3 Niveaux</Text>
            
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.md }}>
              Niveau 1 - Minimal
            </Text>
            <TaskCardMinimal
              task={sampleTask}
              onPress={(task) => console.log('Tâche pressée:', task.title)}
              onDelete={(task) => console.log('Supprimer tâche:', task.title)}
            />

            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>
              Niveau 2 - Standard
            </Text>
            <TaskCardStandard
              task={sampleTask}
              onPress={(task) => console.log('Tâche pressée:', task.title)}
              onEdit={(task) => console.log('Éditer tâche:', task.title)}
              onDelete={(task) => console.log('Supprimer tâche:', task.title)}
            />

            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>
              Niveau 3 - Détaillé
            </Text>
            <TaskCardDetailed
              task={sampleTask}
              onPress={(task) => console.log('Tâche pressée:', task.title)}
              onEdit={(task) => console.log('Éditer tâche:', task.title)}
              onComment={(task) => console.log('Commenter tâche:', task.title)}
              onDelete={(task) => console.log('Supprimer tâche:', task.title)}
              onToggleStatus={(task) => console.log('Changer statut:', task.title)}
            />
          </Card>

          {/* Observation Cards Section */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Cartes d'Observations - 3 Niveaux</Text>
            
            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.md }}>
              Niveau 1 - Minimal
            </Text>
            <ObservationCardMinimal
              observation={sampleObservation}
              onPress={(obs) => console.log('Observation pressée:', obs.title)}
              onDelete={(obs) => console.log('Supprimer observation:', obs.title)}
            />

            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>
              Niveau 2 - Standard
            </Text>
            <ObservationCardStandard
              observation={sampleObservation}
              onPress={(obs) => console.log('Observation pressée:', obs.title)}
              onEdit={(obs) => console.log('Éditer observation:', obs.title)}
              onDelete={(obs) => console.log('Supprimer observation:', obs.title)}
              onViewPhotos={(obs) => console.log('Voir photos:', obs.title)}
            />

            <Text variant="body" weight="semibold" style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>
              Niveau 3 - Détaillé
            </Text>
            <ObservationCardDetailed
              observation={sampleObservation}
              onPress={(obs) => console.log('Observation pressée:', obs.title)}
              onEdit={(obs) => console.log('Éditer observation:', obs.title)}
              onDelete={(obs) => console.log('Supprimer observation:', obs.title)}
              onViewPhotos={(obs) => console.log('Voir photos:', obs.title)}
              onResolve={(obs) => console.log('Résoudre observation:', obs.title)}
            />
          </Card>

          {/* Modal Demo */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Modal</Text>
            <Button
              title="Ouvrir Modal"
              variant="outline"
              onPress={() => setModalVisible(true)}
            />
          </Card>

          {/* Navigation vers autres démos */}
          <Card variant="elevated" padding="lg">
            <Text variant="subtitle" style={{ marginBottom: spacing.md }}>Démos Avancées</Text>
            <View style={{ gap: spacing.sm }}>
              <Text variant="body" color={colors.gray[600]} style={{ marginBottom: spacing.md }}>
                Explorez les fonctionnalités avancées du design system :
              </Text>
              <Button
                title="📊 Voir Démo Niveaux de Cartes"
                variant="secondary"
                onPress={() => {
                  // Cette fonction sera appelée depuis App.tsx
                  console.log('Navigation vers CardLevelsDemo');
                }}
              />
              <Button
                title="🔽 Voir Démo Dropdown Selector"
                variant="secondary"
                onPress={() => {
                  // Cette fonction sera appelée depuis App.tsx
                  console.log('Navigation vers DropdownSelectorDemo');
                }}
              />
              <Button
                title="📅 Voir Démo Cartes Calendrier"
                variant="secondary"
                onPress={() => {
                  // Cette fonction sera appelée depuis App.tsx
                  console.log('Navigation vers CalendarCardsDemo');
                }}
              />
            </View>
          </Card>

          {/* Spacer for navigation */}
          <View style={{ height: spacing['6xl'] }} />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <Navigation
        tabs={navigationTabs}
        activeTab={activeTab}
        onTabPress={setActiveTab}
      />

      {/* Demo Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Exemple de Modal"
        primaryAction={{
          title: "Confirmer",
          onPress: () => {
            console.log('Confirmed');
            setModalVisible(false);
          },
        }}
        secondaryAction={{
          title: "Annuler",
          onPress: () => setModalVisible(false),
        }}
      >
        <Text variant="body">
          Ceci est un exemple de modal avec titre, contenu et actions.
          Le design suit les spécifications Thomas V2 pour l'agriculture française.
        </Text>
      </Modal>
    </Screen>
  );
};
