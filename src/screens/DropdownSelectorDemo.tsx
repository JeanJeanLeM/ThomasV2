import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Screen, UnifiedHeader, Text, Button } from '../design-system/components';
import { DropdownSelector, DropdownItem } from '../design-system/components/DropdownSelector';
import { CreateItemModal } from '../design-system/components/modals/CreateItemModal';
import { BackIcon } from '../design-system/icons';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

interface DropdownSelectorDemoProps {
  onBack: () => void;
}

export const DropdownSelectorDemo: React.FC<DropdownSelectorDemoProps> = ({ onBack }) => {
  // États pour les différents dropdowns
  const [selectedActions, setSelectedActions] = useState<DropdownItem[]>([]);
  const [selectedPlots, setSelectedPlots] = useState<DropdownItem[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<DropdownItem[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<DropdownItem[]>([]);

  // États pour les modals de création
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalType, setCreateModalType] = useState<'action' | 'plot' | 'material' | 'crop'>('action');

  // Données d'exemple
  const [actions, setActions] = useState<DropdownItem[]>([
    { id: '1', label: 'Planter', type: 'Production', category: 'production', description: 'Mise en place des plants' },
    { id: '2', label: 'Récolter', type: 'Production', category: 'production', description: 'Collecte des fruits/légumes' },
    { id: '3', label: 'Arroser', type: 'Production', category: 'production', description: 'Irrigation des cultures' },
    { id: '4', label: 'Traiter', type: 'Production', category: 'production', description: 'Application de traitements' },
    { id: '5', label: 'Préparer commande', type: 'Marketing', category: 'marketing', description: 'Préparation pour la vente' },
    { id: '6', label: 'Livrer', type: 'Commercialisation', category: 'commercialisation', description: 'Transport vers clients' },
    { id: '7', label: 'Facturer', type: 'Administrative', category: 'administrative', description: 'Gestion administrative' },
  ]);

  const [plots, setPlots] = useState<DropdownItem[]>([
    { id: '1', label: 'Serre 1', type: 'Serre plastique', category: 'production', description: '200m² - Tomates' },
    { id: '2', label: 'Tunnel Nord', type: 'Tunnel', category: 'production', description: '150m² - Courgettes' },
    { id: '3', label: 'Plein champ A', type: 'Plein champ', category: 'production', description: '500m² - Pommes de terre' },
    { id: '4', label: 'Pépinière', type: 'Pépinière', category: 'production', description: '50m² - Semis' },
    { id: '5', label: 'Serre 2', type: 'Serre verre', category: 'production', description: '300m² - Aubergines' },
  ]);

  const [materials, setMaterials] = useState<DropdownItem[]>([
    { id: '1', label: 'Tracteur Kubota', type: 'Motorisé', category: 'motorise', description: '25CV - Polyvalent' },
    { id: '2', label: 'Bêche', type: 'Manuel', category: 'manuel', description: 'Outil de base' },
    { id: '3', label: 'Arrosoir 10L', type: 'Irrigation', category: 'irrigation', description: 'Arrosage manuel' },
    { id: '4', label: 'Serfouette', type: 'Manuel', category: 'manuel', description: 'Désherbage' },
    { id: '5', label: 'Pulvérisateur', type: 'Protection', category: 'protection', description: 'Traitements' },
  ]);

  const [crops, setCrops] = useState<DropdownItem[]>([
    { id: '1', label: 'Tomate cerise', type: 'Légume fruit', category: 'legume_fruit', description: 'Variété cocktail' },
    { id: '2', label: 'Courgette verte', type: 'Légume fruit', category: 'legume_fruit', description: 'Variété classique' },
    { id: '3', label: 'Salade batavia', type: 'Légume feuille', category: 'legume_feuille', description: 'Résistante chaleur' },
    { id: '4', label: 'Radis rose', type: 'Légume racine', category: 'legume_racine', description: 'Croissance rapide' },
    { id: '5', label: 'Basilic', type: 'Aromate', category: 'aromate', description: 'Aromate méditerranéen' },
  ]);

  const handleCreateItem = (type: 'action' | 'plot' | 'material' | 'crop') => {
    setCreateModalType(type);
    setShowCreateModal(true);
  };

  const handleSaveNewItem = (newItem: DropdownItem) => {
    switch (createModalType) {
      case 'action':
        setActions(prev => [...prev, newItem]);
        break;
      case 'plot':
        setPlots(prev => [...prev, newItem]);
        break;
      case 'material':
        setMaterials(prev => [...prev, newItem]);
        break;
      case 'crop':
        setCrops(prev => [...prev, newItem]);
        break;
    }
  };

  return (
    <Screen safeArea>
      <UnifiedHeader
        title="Dropdown Selector"
        showBackButton
        onBack={onBack}
      />

      <ScrollView className="flex-1 bg-primary-50">
        <View style={{ padding: spacing.layout.screenPadding, gap: spacing['2xl'] }}>
          
          {/* Introduction */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h2" style={{ marginBottom: spacing.md }}>
              🎯 Fonctionnalités
            </Text>
            <View style={{ gap: spacing.sm }}>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Recherche en temps réel dans le champ
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Filtrage par cartouches de catégories
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Sélection simple ou multiple
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Types alignés à droite avec couleurs
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Suppression facile des sélections
              </Text>
              <Text variant="bodySmall" color={colors.gray[600]}>
                ✅ Bouton d'ajout avec modal de création
              </Text>
            </View>
          </View>

          {/* Actions (Multi-select avec filtrage) */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🔧 Actions Agricoles
            </Text>
            <DropdownSelector
              label="Sélectionner des actions"
              placeholder="Entrer l'action (ex: planter, récolter, ar..."
              items={actions}
              selectedItems={selectedActions}
              onSelectionChange={setSelectedActions}
              multiSelect={true}
              searchable={true}
              filterable={true}
              categories={['production', 'marketing', 'commercialisation', 'administrative']}
              onAddNew={() => handleCreateItem('action')}
              addNewLabel="Ajouter une action"
              hint="Recherchez ou filtrez par catégorie"
            />
            
            {selectedActions.length > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Text variant="label" style={{ marginBottom: spacing.sm }}>
                  Actions sélectionnées :
                </Text>
                {selectedActions.map(action => (
                  <Text key={action.id} variant="bodySmall" color={colors.gray[600]}>
                    • {action.label} ({action.type})
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Parcelles (Single select) */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🏡 Parcelles
            </Text>
            <DropdownSelector
              label="Sélectionner une parcelle"
              placeholder="Choisir la parcelle..."
              items={plots}
              selectedItems={selectedPlots}
              onSelectionChange={setSelectedPlots}
              multiSelect={false}
              searchable={true}
              filterable={false}
              onAddNew={() => handleCreateItem('plot')}
              addNewLabel="Créer une nouvelle parcelle"
              hint="Sélection unique avec recherche"
            />
          </View>

          {/* Matériel (Multi-select sans filtrage) */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🛠️ Matériel
            </Text>
            <DropdownSelector
              label="Sélectionner du matériel"
              placeholder="Choisir le matériel..."
              items={materials}
              selectedItems={selectedMaterials}
              onSelectionChange={setSelectedMaterials}
              multiSelect={true}
              searchable={true}
              filterable={true}
              categories={['motorise', 'manuel', 'irrigation', 'protection']}
              onAddNew={() => handleCreateItem('material')}
              addNewLabel="Ajouter du matériel"
            />
          </View>

          {/* Cultures (Multi-select avec toutes les options) */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🌱 Cultures
            </Text>
            <DropdownSelector
              label="Sélectionner des cultures"
              placeholder="Choisir les cultures..."
              items={crops}
              selectedItems={selectedCrops}
              onSelectionChange={setSelectedCrops}
              multiSelect={true}
              searchable={true}
              filterable={true}
              categories={['legume_fruit', 'legume_feuille', 'legume_racine', 'aromate']}
              onAddNew={() => handleCreateItem('crop')}
              addNewLabel="Ajouter une culture"
              maxHeight={250}
            />
          </View>

          {/* Exemple désactivé */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              🚫 Exemple Désactivé
            </Text>
            <DropdownSelector
              label="Dropdown désactivé"
              placeholder="Non disponible..."
              items={[]}
              selectedItems={[]}
              onSelectionChange={() => {}}
              disabled={true}
              hint="Exemple d'état désactivé"
            />
          </View>

          {/* Exemple avec erreur */}
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              ❌ Exemple avec Erreur
            </Text>
            <DropdownSelector
              label="Champ obligatoire"
              placeholder="Sélection requise..."
              items={actions.slice(0, 3)}
              selectedItems={[]}
              onSelectionChange={() => {}}
              required={true}
              error="Ce champ est obligatoire"
            />
          </View>

          {/* Résumé des sélections */}
          <View className="bg-primary-50 rounded-xl p-6 border-2 border-primary-200">
            <Text variant="h3" color={colors.primary[700]} style={{ marginBottom: spacing.md }}>
              📋 Résumé des Sélections
            </Text>
            
            <View style={{ gap: spacing.md }}>
              <View>
                <Text variant="label" color={colors.primary[600]}>
                  Actions ({selectedActions.length}) :
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {selectedActions.length > 0 
                    ? selectedActions.map(a => a.label).join(', ')
                    : 'Aucune sélection'
                  }
                </Text>
              </View>
              
              <View>
                <Text variant="label" color={colors.primary[600]}>
                  Parcelle :
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {selectedPlots.length > 0 ? selectedPlots[0].label : 'Aucune sélection'}
                </Text>
              </View>
              
              <View>
                <Text variant="label" color={colors.primary[600]}>
                  Matériel ({selectedMaterials.length}) :
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {selectedMaterials.length > 0 
                    ? selectedMaterials.map(m => m.label).join(', ')
                    : 'Aucune sélection'
                  }
                </Text>
              </View>
              
              <View>
                <Text variant="label" color={colors.primary[600]}>
                  Cultures ({selectedCrops.length}) :
                </Text>
                <Text variant="bodySmall" color={colors.gray[600]}>
                  {selectedCrops.length > 0 
                    ? selectedCrops.map(c => c.label).join(', ')
                    : 'Aucune sélection'
                  }
                </Text>
              </View>
            </View>

            <Button
              title="Réinitialiser toutes les sélections"
              variant="outline"
              size="sm"
              onPress={() => {
                setSelectedActions([]);
                setSelectedPlots([]);
                setSelectedMaterials([]);
                setSelectedCrops([]);
              }}
              style={{ marginTop: spacing.lg }}
            />
          </View>

          {/* Spacer */}
          <View style={{ height: spacing['3xl'] }} />
        </View>
      </ScrollView>

      {/* Modal de création */}
      <CreateItemModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveNewItem}
        itemType={createModalType}
      />
    </Screen>
  );
};
