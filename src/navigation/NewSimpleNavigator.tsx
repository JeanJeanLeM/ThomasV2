import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Text, UnifiedHeader, FarmSelectorModal } from '@/design-system/components';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../contexts/NavigationContext';
import { useFarmSelector } from '../hooks/useFarmSelector';

// Import des écrans
import DashboardScreen from '@/screens/DashboardScreen';
import StatisticsScreen from '@/screens/StatisticsScreen';
import TasksScreen from '@/screens/TasksScreen';
import ChatScreen from '@/screens/ChatScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import PlotsSettingsScreen from '@/screens/PlotsSettingsScreen';
import MaterialsSettingsScreen from '@/screens/MaterialsSettingsScreen';
import ConversionsSettingsScreen from '@/screens/ConversionsSettingsScreen';
import CulturesListSettingsScreen from '@/screens/CulturesListSettingsScreen';
import PhytosanitaryProductsSettingsScreen from '@/screens/PhytosanitaryProductsSettingsScreen';
import { FarmMembersScreen } from '@/screens/FarmMembersScreen';
import { MyInvitationsScreen } from '@/screens/MyInvitationsScreen';
import FarmEditScreen from '@/screens/FarmEditScreen';
import FarmListScreen from '@/screens/FarmListScreen';
import AideEtSupportScreen from '@/screens/AideEtSupportScreen';
import AProposScreen from '@/screens/AProposScreen';
import DocumentsScreen from '@/screens/DocumentsScreen';

import type { TabName, ScreenName } from '../contexts/NavigationContext';

interface Tab {
  name: TabName;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
}

const tabs: Tab[] = [
  // Dashboard temporairement masqué de la bottom bar (page toujours accessible)
  // { name: 'Dashboard', label: 'Dashboard', icon: 'home-outline', component: DashboardScreen },
  { name: 'Statistics', label: 'Statistiques', icon: 'bar-chart-outline', component: StatisticsScreen },
  { name: 'Taches', label: 'Tâches', icon: 'list-outline', component: TasksScreen },
  { name: 'Chat', label: 'Assistant IA', icon: 'chatbubbles-outline', component: ChatScreen },
  { name: 'Profil', label: 'Profil', icon: 'person-outline', component: ProfileScreen },
];

const NewSimpleNavigator: React.FC = () => {
  const navigation = useNavigation();
  const farmSelector = useFarmSelector();
  const [farmEditId, setFarmEditId] = React.useState<number | null>(null);

  // Réinitialiser farmEditId quand on quitte FarmEdit
  React.useEffect(() => {
    if (navigation.currentScreen !== 'FarmEdit') {
      setFarmEditId(null);
    }
  }, [navigation.currentScreen]);

  // Configuration des écrans
  const getScreenConfig = (screen: ScreenName) => {
    const configs = {
      // Écrans principaux (avec tabs)
      Dashboard: { 
        title: 'Dashboard', 
        showBack: false, 
        showFarmSelector: true, 
        showTabs: true,
        component: DashboardScreen 
      },
      Statistics: { 
        title: 'Statistiques', 
        showBack: false, 
        showFarmSelector: true, 
        showTabs: true,
        component: StatisticsScreen 
      },
      Taches: { 
        title: 'Tâches', 
        showBack: false, 
        showFarmSelector: true, 
        showTabs: true,
        component: TasksScreen 
      },
      Chat: { 
        title: 'Assistant IA', 
        showBack: false, 
        showFarmSelector: true, 
        showTabs: true,
        hideHeader: true, // Header géré par ChatConversation
        component: ChatScreen 
      },
      Profil: { 
        title: 'Profil', 
        showBack: false, 
        showFarmSelector: false, 
        showTabs: true,
        component: ProfileScreen 
      },
      
      // Écrans secondaires (sans tabs)
      Settings: { 
        title: 'Paramètres', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: SettingsScreen 
      },
      PlotsSettings: { 
        title: 'Gestion des parcelles', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: PlotsSettingsScreen 
      },
      MaterialsSettings: { 
        title: 'Gestion des matériaux', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: MaterialsSettingsScreen 
      },
      ConversionsSettings: { 
        title: 'Conversions', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: ConversionsSettingsScreen 
      },
      CulturesListSettings: { 
        title: 'Liste de cultures', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: CulturesListSettingsScreen 
      },
      PhytosanitaryProductsSettings: { 
        title: 'Produits phytosanitaires', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: PhytosanitaryProductsSettingsScreen 
      },
      FarmMembers: { 
        title: 'Membres de la ferme', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: FarmMembersScreen 
      },
      MyInvitations: { 
        title: 'Mes invitations', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: MyInvitationsScreen 
      },
      FarmEdit: { 
        title: 'Modifier les informations de la ferme', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: FarmEditScreen 
      },
      FarmList: { 
        title: 'Fermes', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: FarmListScreen 
      },
      AideEtSupport: { 
        title: 'Aide et Support', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: AideEtSupportScreen 
      },
      APropos: { 
        title: 'À propos', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: AProposScreen 
      },
      Documents: { 
        title: 'Documents', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: DocumentsScreen 
      },
    };
    
    return configs[screen] || configs.Chat;
  };

  const currentConfig = getScreenConfig(navigation.currentScreen);
  const CurrentComponent = currentConfig.component;

  // Handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleTabPress = (tabName: TabName) => {
    navigation.navigateToTab(tabName);
  };

  const handleFarmSelectorPress = () => {
    farmSelector.openFarmSelector();
  };

  const handleFarmSelect = (farm: any) => {
    farmSelector.selectFarm(farm);
  };

  const handleCreateFarm = () => {
    farmSelector.editFarm(); // Ouvre la liste des fermes
  };

  // Styles
  const containerStyle = {
    flex: 1,
    backgroundColor: colors.background?.primary || '#FFFFFF',
  };

  const contentStyle = {
    flex: 1,
  };

  const tabBarStyle = {
    flexDirection: 'row' as const,
    backgroundColor: colors.background?.primary || '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border?.primary || '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  };

  const tabItemStyle = (isActive: boolean) => ({
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    backgroundColor: isActive ? colors.primary?.[50] || '#F0FDF4' : 'transparent',
  });

  const tabIconColor = (isActive: boolean) => 
    isActive ? colors.primary?.[600] || '#16A34A' : colors.gray?.[500] || '#6B7280';

  const tabTextColor = (isActive: boolean) => 
    isActive ? colors.primary?.[600] || '#16A34A' : colors.text?.secondary || '#6B7280';

  // Afficher le header : pour Chat uniquement en vue liste ; pour les autres si non hideHeader
  const showHeader =
    (currentConfig as any).hideHeader !== true ||
    (navigation.currentScreen === 'Chat' && navigation.chatState === 'list');

  return (
    <View style={containerStyle}>
      {/* Header - Pour Chat affiché en vue liste ; pour conversation géré par ChatConversation */}
      {showHeader && (
        <UnifiedHeader
          title={currentConfig.title}
          onBack={currentConfig.showBack ? handleBack : undefined}
          onFarmSelector={currentConfig.showFarmSelector ? handleFarmSelectorPress : undefined}
          showBackButton={currentConfig.showBack}
        />
      )}

      {/* Contenu principal */}
      <View style={contentStyle}>
        {navigation.currentScreen === 'Profil' ? (
          <CurrentComponent 
            onSettingsPress={() => {
              console.log('🔧 [NAVIGATION] Settings pressed');
              navigation.navigateToScreen('Settings');
            }}
            onFarmMembersPress={() => {
              console.log('👥 [NAVIGATION] Farm members pressed');
              navigation.navigateToScreen('FarmMembers');
            }}
            onMyInvitationsPress={() => {
              console.log('📧 [NAVIGATION] My invitations pressed');
              navigation.navigateToScreen('MyInvitations');
            }}
            onFarmEditPress={() => {
              console.log('🏢 [NAVIGATION] Farm edit pressed - Opening FarmList');
              navigation.navigateToScreen('FarmList');
            }}
            onAideEtSupportPress={() => {
              console.log('❓ [NAVIGATION] Help pressed');
              navigation.navigateToScreen('AideEtSupport');
            }}
            onAProposPress={() => {
              console.log('ℹ️ [NAVIGATION] About pressed');
              navigation.navigateToScreen('APropos');
            }}
            onDocumentsPress={() => {
              console.log('📄 [NAVIGATION] Documents pressed');
              navigation.navigateToScreen('Documents');
            }}
          />
        ) : navigation.currentScreen === 'Settings' ? (
          <CurrentComponent 
            onNavigate={(screen: any) => {
              console.log('🔧 [NAVIGATION] Navigating to:', screen);
              navigation.navigateToScreen(screen);
            }}
          />
        ) : navigation.currentScreen === 'FarmList' ? (
          <FarmListScreen
            navigation={{ goBack: handleBack }}
            onFarmEdit={(farmId?: number) => {
              setFarmEditId(farmId ?? null);
              navigation.navigateToScreen('FarmEdit');
            }}
            onCreateFarm={() => {
              setFarmEditId(null);
              navigation.navigateToScreen('FarmEdit');
            }}
          />
        ) : navigation.currentScreen === 'FarmEdit' ? (
          <FarmEditScreen
            navigation={{ goBack: handleBack }}
            farmId={farmEditId}
          />
        ) : (
          <CurrentComponent 
            chatState={navigation.chatState}
            setChatState={navigation.setChatState}
            onNavigate={navigation.navigateToScreen}
            onTitleChange={(title) => {
              // Optionnel: mettre à jour le titre dynamiquement
            }}
            onBack={currentConfig.showBack ? handleBack : undefined}
          />
        )}
      </View>

      {/* Barre d'onglets */}
      {currentConfig.showTabs && (
        <View style={tabBarStyle}>
          {tabs.map((tab) => {
            const isActive = navigation.activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={tabItemStyle(isActive)}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={24}
                  color={tabIconColor(isActive)}
                />
                <Text
                  variant="caption"
                  color={tabTextColor(isActive)}
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Modal de sélection de ferme */}
      <FarmSelectorModal
        visible={farmSelector.showModal}
        onClose={farmSelector.closeFarmSelector}
        currentFarmId={farmSelector.activeFarm?.farm_id || null}
        onFarmSelect={handleFarmSelect}
        onCreateFarm={handleCreateFarm}
      />
    </View>
  );
};

export default NewSimpleNavigator;
