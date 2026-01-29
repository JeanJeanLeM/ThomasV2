import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Text, UnifiedHeader, FarmSelectorModal } from '@/design-system/components';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useFarm } from '@/contexts/FarmContext';

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
import { FarmMembersScreen } from '@/screens/FarmMembersScreen';
import { MyInvitationsScreen } from '@/screens/MyInvitationsScreen';
import FarmEditScreen from '@/screens/FarmEditScreen';
import FarmListScreen from '@/screens/FarmListScreen';
import AideEtSupportScreen from '@/screens/AideEtSupportScreen';
import AProposScreen from '@/screens/AProposScreen';
import DocumentsScreen from '@/screens/DocumentsScreen';

type TabName = 'Dashboard' | 'Statistics' | 'Taches' | 'Chat' | 'Profil';
type ScreenName = TabName | 'Settings' | 'PlotsSettings' | 'MaterialsSettings' | 'ConversionsSettings' | 'FarmMembers' | 'MyInvitations' | 'FarmEdit' | 'FarmList' | 'AideEtSupport' | 'APropos' | 'Documents';

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

const SimpleNavigator: React.FC = () => {
  const { farms, activeFarm, setActiveFarm } = useFarm();
  const [activeTab, setActiveTab] = useState<TabName>('Chat'); // Chat comme écran d'accueil
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Chat');
  const [chatState, setChatState] = useState<'list' | 'conversation'>('list');
  const [showFarmSelectorModal, setShowFarmSelectorModal] = useState(false);
  const [overrideTitle, setOverrideTitle] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<ScreenName[]>(['Chat']);
  const [farmEditId, setFarmEditId] = useState<number | null>(null); // ID de la ferme à modifier, null pour création

  // Le contexte FarmContext gère automatiquement la sélection de la ferme active

  const getActiveComponent = () => {
    switch (currentScreen) {
      case 'Settings':
        return SettingsScreen;
      case 'PlotsSettings':
        return PlotsSettingsScreen;
      case 'MaterialsSettings':
        return MaterialsSettingsScreen;
      case 'ConversionsSettings':
        return ConversionsSettingsScreen;
      case 'FarmMembers':
        return FarmMembersScreen;
      case 'MyInvitations':
        return MyInvitationsScreen;
      case 'FarmEdit':
        return FarmEditScreen;
      case 'FarmList':
        return FarmListScreen;
      case 'AideEtSupport':
        return AideEtSupportScreen;
      case 'APropos':
        return AProposScreen;
      case 'Documents':
        return DocumentsScreen;
      default:
        return tabs.find(tab => tab.name === currentScreen)?.component || ChatScreen;
    }
  };

  const ActiveComponent = getActiveComponent();
  const activeTabData = tabs.find(tab => tab.name === activeTab);
  
  const getScreenTitle = () => {
    if (overrideTitle) {
      return overrideTitle;
    }
    switch (currentScreen) {
      case 'Settings':
        return 'Paramètres';
      case 'PlotsSettings':
        return 'Parcelles';
      case 'MaterialsSettings':
        return 'Matériel';
      case 'ConversionsSettings':
        return 'Conversions';
      case 'FarmMembers':
        return 'Gestion des membres';
      case 'MyInvitations':
        return 'Mes invitations';
      case 'FarmEdit':
        return 'Modifier la ferme';
      case 'FarmList':
        return 'Mes Fermes';
      case 'AideEtSupport':
        return 'Aide et support';
      case 'APropos':
        return 'À propos';
      case 'Documents':
        return 'Mes Documents';
      default:
        if (currentScreen === 'Chat' && chatState === 'list') {
          return 'Chats';
        }
        return activeTabData?.label || 'Thomas V2';
    }
  };

  const handleBack = () => {
    // Gestion du retour depuis les écrans de paramètres
    if (['Settings', 'PlotsSettings', 'MaterialsSettings', 'ConversionsSettings', 'FarmMembers', 'MyInvitations', 'FarmEdit', 'FarmList', 'AideEtSupport', 'APropos', 'Documents'].includes(currentScreen)) {
      // Réinitialiser un éventuel titre custom
      if (overrideTitle) {
        setOverrideTitle(null);
      }
      if (currentScreen === 'Settings') {
        // Depuis Settings, retour vers Profile
        setCurrentScreen('Profil');
      } else if (currentScreen === 'FarmEdit') {
        // Pour FarmEdit, retourner à l'écran précédent dans l'historique
        const previousScreen = navigationHistory[navigationHistory.length - 1] || 'Profil';
        setNavigationHistory(prev => prev.slice(0, -1));
        setFarmEditId(null); // Réinitialiser l'ID
        setCurrentScreen(previousScreen);
      } else if (currentScreen === 'FarmMembers' || currentScreen === 'MyInvitations' || currentScreen === 'FarmList' || currentScreen === 'AideEtSupport' || currentScreen === 'APropos' || currentScreen === 'Documents') {
        // Depuis les autres écrans, retour vers Profile
        setCurrentScreen('Profil');
      } else {
        // Depuis sous-écrans de paramètres, retour vers Settings
        setCurrentScreen('Settings');
      }
    } else if (currentScreen !== 'Chat') {
      // Pour les autres écrans, retour au Chat
      setActiveTab('Chat');
      setCurrentScreen('Chat');
    }
  };

  const handleFarmSelector = () => {
    console.log('🏢 [SIMPLE-NAVIGATOR] Farm selector pressed - opening modal');
    setShowFarmSelectorModal(true);
  };

  const handleFarmSelect = (farm: any) => {
    console.log('🚀 [DEBUG] SimpleNavigator - Ferme sélectionnée:', farm.farm_name);
    // Le contexte est déjà mis à jour dans FarmSelectorModal via changeActiveFarm
  };

  const handleCreateFarm = () => {
    // Navigation vers l'écran de création de ferme
    setCurrentScreen('FarmEdit');
  };

  const handleSettingsNavigation = (screen: 'PlotsSettings' | 'MaterialsSettings' | 'ConversionsSettings') => {
    setCurrentScreen(screen);
  };

  const handleSettingsPress = () => {
    setCurrentScreen('Settings');
  };

  const handleFarmMembersPress = () => {
    setCurrentScreen('FarmMembers');
  };

  const handleMyInvitationsPress = () => {
    setCurrentScreen('MyInvitations');
  };

  const handleFarmListPress = () => {
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen('FarmList');
  };

  const handleFarmEditPress = () => {
    setFarmEditId(null); // Mode création par défaut depuis le profil
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen('FarmEdit');
  };

  const handleAideEtSupportPress = () => {
    setCurrentScreen('AideEtSupport');
  };

  const handleAProposPress = () => {
    setCurrentScreen('APropos');
  };

  const handleDocumentsPress = () => {
    setCurrentScreen('Documents');
  };

  const handleChatStateChange = (state: 'list' | 'conversation') => {
    setChatState(state);
  };

  // Debug: Log du currentScreen pour identifier le problème des doubles headers
  console.log('🔍 [SimpleNavigator] currentScreen:', currentScreen);
  const shouldShowHeader = !['FarmEdit', 'FarmList'].includes(currentScreen) && 
                          !(currentScreen === 'Chat' && chatState === 'conversation');
  console.log('🔍 [SimpleNavigator] shouldShowHeader:', shouldShowHeader);

  // Écrans liés au profil qui ne doivent PAS avoir de farm selector
  const profileRelatedScreens = ['Profil', 'Settings', 'PlotsSettings', 'MaterialsSettings', 'ConversionsSettings', 'FarmMembers', 'MyInvitations', 'AideEtSupport', 'APropos', 'Documents'];
  const shouldShowFarmSelector = !profileRelatedScreens.includes(currentScreen);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header unifié - masqué sur ChatConversation, FarmEdit, FarmList */}
      {shouldShowHeader && (
        <UnifiedHeader
          title={currentScreen === 'Chat' ? activeFarm?.farm_name || 'Thomas V2' : getScreenTitle()}
          onBack={currentScreen !== 'Chat' ? handleBack : undefined}
          onFarmSelector={shouldShowFarmSelector ? handleFarmSelector : undefined}
          showBackButton={currentScreen !== 'Chat'}
        />
      )}

      {/* Contenu principal */}
      <View style={{ flex: 1 }}>
        {currentScreen === 'Profil' ? (
          <ProfileScreen 
            onSettingsPress={handleSettingsPress} 
            onFarmMembersPress={handleFarmMembersPress}
            onMyInvitationsPress={handleMyInvitationsPress}
            onFarmEditPress={handleFarmListPress}
            onAideEtSupportPress={handleAideEtSupportPress}
            onAProposPress={handleAProposPress}
            onDocumentsPress={handleDocumentsPress}
          />
        ) : currentScreen === 'Documents' ? (
          <DocumentsScreen 
            onBack={handleBack}
            onFarmSelector={handleFarmSelector}
          />
        ) : currentScreen === 'PlotsSettings' ? (
          <PlotsSettingsScreen
            onTitleChange={setOverrideTitle}
          />
        ) : currentScreen === 'MaterialsSettings' ? (
          <MaterialsSettingsScreen
            onTitleChange={setOverrideTitle}
          />
        ) : currentScreen === 'Settings' ? (
          <SettingsScreen onNavigate={handleSettingsNavigation} />
        ) : currentScreen === 'FarmMembers' ? (
          <FarmMembersScreen
            navigation={{ goBack: handleBack }}
          />
        ) : currentScreen === 'MyInvitations' ? (
          <MyInvitationsScreen 
            onBack={handleBack}
          />
        ) : currentScreen === 'FarmList' ? (
          <FarmListScreen 
            navigation={{ goBack: handleBack }}
            onFarmEdit={(farmId?: number) => {
              setFarmEditId(farmId ?? null);
              setNavigationHistory(prev => [...prev, currentScreen]);
              setCurrentScreen('FarmEdit');
            }}
            onCreateFarm={() => {
              setFarmEditId(null); // Mode création
              setNavigationHistory(prev => [...prev, currentScreen]);
              setCurrentScreen('FarmEdit');
            }}
          />
        ) : currentScreen === 'FarmEdit' ? (
          <FarmEditScreen 
            navigation={{ goBack: handleBack }}
            farmId={farmEditId}
          />
        ) : currentScreen === 'Chat' ? (
          <ChatScreen 
            onStateChange={handleChatStateChange}
            onFarmSelector={handleFarmSelector}
          />
        ) : (
          <ActiveComponent />
        )}
      </View>

      {/* Navigation bottom - masquée quand un formulaire est ouvert ou sur certains écrans */}
      {!overrideTitle && !['FarmEdit', 'FarmList'].includes(currentScreen) && (
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.background.primary,
          borderTopWidth: 1,
          borderTopColor: colors.gray[200],
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.xs,
          ...Platform.select({
            web: {
              boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 8,
            },
          }),
        }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                setActiveTab(tab.name);
                setCurrentScreen(tab.name);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.xs,
              }}
            >
              <Ionicons
                name={tab.icon as any}
                color={isActive ? colors.primary[600] : colors.gray[500]}
                size={24}
              />
              <Text
                variant="caption"
                style={{
                  color: isActive ? colors.primary[600] : colors.gray[500],
                  marginTop: spacing.xs / 2,
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      )}

      {/* Modale de sélection de ferme */}
      <FarmSelectorModal
        visible={showFarmSelectorModal}
        onClose={() => setShowFarmSelectorModal(false)}
        currentFarmId={activeFarm?.farm_id || null}
        onFarmSelect={handleFarmSelect}
        onCreateFarm={handleCreateFarm}
      />
    </View>
  );
};

export default SimpleNavigator;
