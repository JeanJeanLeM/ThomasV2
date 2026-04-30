import React from 'react';
import { View, TouchableOpacity, Platform, Switch } from 'react-native';
import { Text, UnifiedHeader, FarmSelectorModal } from '@/design-system/components';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../contexts/NavigationContext';
import { useFarmSelector } from '../hooks/useFarmSelector';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import OnboardingService from '../services/OnboardingService';
import InterfaceTourModal from '../components/interface-tour/InterfaceTourModal';
import InterfaceTourTarget from '../components/interface-tour/InterfaceTourTarget';
import InterfaceTourService from '../services/InterfaceTourService';
import DemoFarmService from '../services/DemoFarmService';
import { ChatServiceDirect } from '../services/ChatServiceDirect';
import { INTERFACE_TOUR_STEPS, type InterfaceTourAction } from '../constants/interfaceTour';
import { InterfaceTourTargetsProvider } from '../contexts/InterfaceTourTargetsContext';

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
import RecurringTasksSettingsScreen from '@/screens/RecurringTasksSettingsScreen';
import { FarmMembersScreen } from '@/screens/FarmMembersScreen';
import { MyInvitationsScreen } from '@/screens/MyInvitationsScreen';
import FarmEditScreen from '@/screens/FarmEditScreen';
import FarmListScreen from '@/screens/FarmListScreen';
import AideEtSupportScreen from '@/screens/AideEtSupportScreen';
import AProposScreen from '@/screens/AProposScreen';
import DocumentsScreen from '@/screens/DocumentsScreen';
import FarmSettingsScreen from '@/screens/FarmSettingsScreen';
import ProfileAndFarmSettingsScreen from '@/screens/ProfileAndFarmSettingsScreen';
import InvoicesListScreen from '@/screens/InvoicesListScreen';
import InvoiceCreateScreen from '@/screens/InvoiceCreateScreen';
import InvoiceDetailsScreen from '@/screens/InvoiceDetailsScreen';
import CustomersListScreen from '@/screens/CustomersListScreen';
import CustomerEditScreen from '@/screens/CustomerEditScreen';
import SellerInfoSettingsScreen from '@/screens/SellerInfoSettingsScreen';
import CommerceScreen from '@/screens/CommerceScreen';
import ProductsListScreen from '@/screens/ProductsListScreen';
import CommunityListScreen from '@/screens/CommunityListScreen';
import CommunityDetailScreen from '@/screens/CommunityDetailScreen';
import CommunityCreateScreen from '@/screens/CommunityCreateScreen';
import CommunitySettingsScreen from '@/screens/CommunitySettingsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import CreateNotificationScreen from '@/screens/CreateNotificationScreen';

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

function getTabTargetId(tab: TabName): 'tab.statistics' | 'tab.taches' | 'tab.chat' | 'tab.profil' {
  if (tab === 'Statistics') return 'tab.statistics';
  if (tab === 'Taches') return 'tab.taches';
  if (tab === 'Profil') return 'tab.profil';
  return 'tab.chat';
}

const NewSimpleNavigator: React.FC = () => {
  const navigation = useNavigation();
  const farmSelector = useFarmSelector();
  const { activeFarm, farms, changeActiveFarm } = useFarm();
  const { user } = useAuth();
  const [farmEditId, setFarmEditId] = React.useState<number | null>(null);
  const [agentMethod, setAgentMethod] = React.useState<'simple' | 'pipeline' | null>(null);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showInterfaceTour, setShowInterfaceTour] = React.useState(false);
  const [interfaceTourStepIndex, setInterfaceTourStepIndex] = React.useState(0);
  const [isInterfaceTourMode, setIsInterfaceTourMode] = React.useState(false);
  const onboardingReturnRef = React.useRef<{ fromChat: boolean; returnChatId?: string } | null>(null);
  const interfaceTourReturnRef = React.useRef<{ fromChat: boolean; returnChatId?: string } | null>(null);

  const restoreFarmAfterInterfaceTour = React.useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    const state = await InterfaceTourService.getState(userId);
    if (!state.restoreFarmId) return;

    const farmToRestore = farms.find((farm) => farm.farm_id === state.restoreFarmId);
    if (farmToRestore) {
      await changeActiveFarm(farmToRestore);
    }
  }, [changeActiveFarm, farms, user?.id]);

  const startInterfaceTour = React.useCallback(async (resumeStepIndex?: number) => {
    const userId = user?.id;
    if (!userId) return;

    const state = await InterfaceTourService.getState(userId);
    if (state.inProgress && showInterfaceTour) {
      return;
    }

    const restoreFarmId = state.restoreFarmId ?? activeFarm?.farm_id ?? null;
    await InterfaceTourService.startTour(userId, restoreFarmId);
    const stepToOpen = Number.isFinite(resumeStepIndex)
      ? Math.max(0, Math.min(INTERFACE_TOUR_STEPS.length - 1, resumeStepIndex as number))
      : state.stepIndex || 0;

    const demoFarm = await DemoFarmService.ensureDemoMembership(userId);
    if (demoFarm) {
      await changeActiveFarm(demoFarm);
    }

    navigation.setChatState('list');
    navigation.navigateToTab('Chat');
    setIsInterfaceTourMode(true);
    setInterfaceTourStepIndex(stepToOpen);
    setShowInterfaceTour(true);
    navigation.setNavigationParams((prev) => ({ ...prev, interfaceTourMode: true }));
  }, [activeFarm?.farm_id, changeActiveFarm, navigation, showInterfaceTour, user?.id]);

  const maybeLaunchChatOnboarding = React.useCallback(async () => {
    if (!user?.id) return;
    const chatSeen = await OnboardingService.hasSeenOnboarding(user.id);
    if (!chatSeen) setShowOnboarding(true);
  }, [user?.id]);

  // Priorite de lancement: tour interface -> onboarding chat.
  React.useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    (async () => {
      const interfaceSeen = await InterfaceTourService.hasSeenTour(userId);
      if (cancelled) return;
      if (!interfaceSeen) {
        const state = await InterfaceTourService.getState(userId);
        if (cancelled) return;
        await startInterfaceTour(state.inProgress ? state.stepIndex : 0);
        return;
      }

      const chatSeen = await OnboardingService.hasSeenOnboarding(userId);
      if (!cancelled && !chatSeen) setShowOnboarding(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [startInterfaceTour, user?.id]);

  const handleCloseOnboarding = React.useCallback(() => {
    setShowOnboarding(false);
    if (user?.id) {
      OnboardingService.markOnboardingSeen(user.id);
    }

    const returnTarget = onboardingReturnRef.current;
    onboardingReturnRef.current = null;

    if (returnTarget?.fromChat) {
      navigation.navigateToTab('Chat');
      if (returnTarget.returnChatId) {
        navigation.setNavigationParams({
          openChatId: returnTarget.returnChatId,
          fromOnboardingShortcut: true,
        });
      } else {
        navigation.setNavigationParams({});
      }
    }
  }, [navigation, user?.id]);

  const handleStartTutorial = React.useCallback(() => {
    onboardingReturnRef.current = null;
    setShowOnboarding(true);
  }, []);

  const handleStartInterfaceTour = React.useCallback(() => {
    interfaceTourReturnRef.current = null;
    startInterfaceTour(0);
  }, [startInterfaceTour]);

  const handleCloseInterfaceTour = React.useCallback(async () => {
    const userId = user?.id;
    setShowInterfaceTour(false);
    setIsInterfaceTourMode(false);
    navigation.setNavigationParams((prev) => ({ ...prev, interfaceTourMode: false }));
    if (userId) {
      await InterfaceTourService.completeTour(userId);
    }
    await restoreFarmAfterInterfaceTour();

    const returnTarget = interfaceTourReturnRef.current;
    interfaceTourReturnRef.current = null;

    if (returnTarget?.fromChat) {
      navigation.navigateToTab('Chat');
      if (returnTarget.returnChatId) {
        navigation.setNavigationParams({
          openChatId: returnTarget.returnChatId,
          fromOnboardingShortcut: true,
        });
      }
    }

  }, [navigation, restoreFarmAfterInterfaceTour, user?.id]);

  const handleCompleteInterfaceTour = React.useCallback(async () => {
    const userId = user?.id;
    setShowInterfaceTour(false);
    setIsInterfaceTourMode(false);
    navigation.setNavigationParams((prev) => ({ ...prev, interfaceTourMode: false }));
    if (userId) {
      await InterfaceTourService.completeTour(userId);
    }
    await restoreFarmAfterInterfaceTour();
    await maybeLaunchChatOnboarding();
  }, [maybeLaunchChatOnboarding, navigation, restoreFarmAfterInterfaceTour, user?.id]);

  const handleInterfaceStepChange = React.useCallback(
    async (stepIndex: number, action: InterfaceTourAction) => {
      setInterfaceTourStepIndex(stepIndex);
      const step = INTERFACE_TOUR_STEPS[stepIndex];
      const applyTourParams = () => {
        navigation.setNavigationParams((prev) => ({
          ...prev,
          interfaceTourMode: true,
          interfaceTourStepId: step?.id,
          interfaceTourTargetId: step?.targetId,
        }));
      };

      applyTourParams();
      if (user?.id) {
        await InterfaceTourService.updateStep(user.id, stepIndex);
      }

      if (!action || action.type === 'none') return;

      if (action.type === 'tab') {
        navigation.navigateToTab(action.tab);
        applyTourParams();
        return;
      }

      if (action.type === 'screen') {
        if (action.tab) navigation.navigateToTab(action.tab);
        navigation.navigateToScreen(action.screen as ScreenName, action.params);
        applyTourParams();
        return;
      }

      if (action.type === 'chat_demo') {
        navigation.navigateToTab('Chat');
        if (!activeFarm?.farm_id) return;
        const sessions = await ChatServiceDirect.getChatSessions(activeFarm.farm_id, false);
        const demoSession = sessions.find(
          (session) =>
            ['Onboarding & aide rapide', 'Bienvenue sur Thomas'].includes(session.title) ||
            session.title.toLowerCase().includes('onboarding')
        );
        if (demoSession) {
          navigation.setNavigationParams((prev) => ({
            ...prev,
            openChatId: demoSession.id,
            fromOnboardingShortcut: true,
          }));
        }
        applyTourParams();
      }

      if (action.type === 'open_chat') {
        navigation.navigateToTab('Chat');
        if (!activeFarm?.farm_id) return;
        const sessions = await ChatServiceDirect.getChatSessions(activeFarm.farm_id, false);
        const sorted = [...sessions].sort((a, b) => {
          const ta = new Date(a.last_message_at || a.created_at).getTime();
          const tb = new Date(b.last_message_at || b.created_at).getTime();
          return tb - ta;
        });
        if (sorted.length > 0) {
          navigation.setNavigationParams((prev) => ({
            ...prev,
            openChatId: sorted[0].id,
          }));
        }
        applyTourParams();
      }

      if (action.type === 'chat_back') {
        navigation.setChatState('list');
        applyTourParams();
      }

    },
    [activeFarm?.farm_id, navigation, user?.id]
  );

  // Ouvre le tutoriel en un clic depuis un raccourci de chat.
  React.useEffect(() => {
    if (navigation.navigationParams?.['openTutorial'] !== true) return;

    const params = navigation.navigationParams as Record<string, unknown>;
    const returnPayload: { fromChat: boolean; returnChatId?: string } = {
      fromChat: params['triggeredFromChat'] === true,
    };
    if (typeof params['returnChatId'] === 'string') {
      returnPayload.returnChatId = params['returnChatId'];
    }
    onboardingReturnRef.current = returnPayload;

    setShowOnboarding(true);

    navigation.setNavigationParams((prev) => {
      if (!prev || prev['openTutorial'] !== true) return prev;
      const next = { ...prev };
      delete next['openTutorial'];
      delete next['triggeredFromChat'];
      delete next['returnChatId'];
      return next;
    });
  }, [
    navigation.navigationParams,
    navigation.setNavigationParams,
  ]);

  React.useEffect(() => {
    if (navigation.navigationParams?.['openInterfaceTour'] !== true) return;

    const params = navigation.navigationParams as Record<string, unknown>;
    const returnPayload: { fromChat: boolean; returnChatId?: string } = {
      fromChat: params['triggeredFromChat'] === true,
    };
    if (typeof params['returnChatId'] === 'string') {
      returnPayload.returnChatId = params['returnChatId'];
    }
    interfaceTourReturnRef.current = returnPayload;

    startInterfaceTour(0);

    navigation.setNavigationParams((prev) => {
      if (!prev || prev['openInterfaceTour'] !== true) return prev;
      const next = { ...prev };
      delete next['openInterfaceTour'];
      delete next['triggeredFromChat'];
      delete next['returnChatId'];
      return next;
    });
  }, [navigation.navigationParams, navigation.setNavigationParams, startInterfaceTour]);

  // Réinitialiser farmEditId quand on quitte FarmEdit
  React.useEffect(() => {
    if (navigation.currentScreen !== 'FarmEdit') {
      setFarmEditId(null);
    }
  }, [navigation.currentScreen]);

  // Charger la méthode agent depuis DB quand on est sur l'écran Chat.
  // Si aucune ligne n'existe encore pour cette ferme, on la crée immédiatement
  // avec 'pipeline' pour éviter que le DB trigger ou un appel API ultérieur
  // ne la crée avec l'ancien défaut 'simple'.
  React.useEffect(() => {
    const loadAgentMethod = async () => {
      if (navigation.activeTab === 'Chat' && activeFarm?.farm_id) {
        try {
          const { data, error } = await supabase
            .from('farm_agent_config')
            .select('agent_method')
            .eq('farm_id', activeFarm.farm_id)
            .single();

          if (!error && data) {
            setAgentMethod(data.agent_method);
            console.log('🔀 [HEADER] Agent method chargée:', data.agent_method);
          } else {
            // Pas de config → créer la ligne avec 'pipeline' + mettre à jour le badge
            console.log('🔀 [HEADER] Pas de config agent, création avec pipeline...');
            await supabase
              .from('farm_agent_config')
              .upsert(
                {
                  farm_id: activeFarm.farm_id,
                  agent_method: 'pipeline',
                  config_reason: 'Configuration par défaut - première utilisation (pipeline)',
                },
                { onConflict: 'farm_id', ignoreDuplicates: true }
              );
            setAgentMethod('pipeline');
          }
        } catch (err) {
          console.error('❌ [HEADER] Erreur chargement agent method:', err);
          setAgentMethod('pipeline');
        }
      } else {
        setAgentMethod(null);
      }
    };

    loadAgentMethod();
  }, [navigation.activeTab, activeFarm?.farm_id]);

  // Configuration des écrans
  const getScreenConfig = (screen: ScreenName): any => {
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
      ProfileAndFarmSettings: {
        title: 'Profil et ferme',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: ProfileAndFarmSettingsScreen
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
      RecurringTasksSettings: { 
        title: 'Tâches récurrentes', 
        showBack: true, 
        showFarmSelector: false, 
        showTabs: false,
        component: RecurringTasksSettingsScreen 
      },
      FarmMembers: { 
        title: 'Membres de la ferme', 
        showBack: true, 
        showFarmSelector: true, 
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
        component: AideEtSupportScreen,
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
      FarmSettings: {
        title: 'Assistant IA',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: FarmSettingsScreen
      },
      InvoicesList: {
        title: 'Factures',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: InvoicesListScreen
      },
      InvoiceCreate: {
        title: navigation.navigationParams?.invoiceId ? 'Modifier facture' : 'Créer facture',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: InvoiceCreateScreen
      },
      InvoiceDetails: {
        title: 'Détail facture',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: InvoiceDetailsScreen
      },
      CustomersList: {
        title: 'Clients & Fournisseurs',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CustomersListScreen
      },
      CustomerEdit: {
        title: 'Client',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CustomerEditScreen
      },
      SellerInfoSettings: {
        title: 'Vos informations',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: SellerInfoSettingsScreen
      },
      Commerce: {
        title: 'Ventes & Achats',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CommerceScreen
      },
      ProductsList: {
        title: 'Produits & Prix',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: ProductsListScreen
      },
      CommunityList: {
        title: 'Communauté',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CommunityListScreen
      },
      CommunityDetail: {
        title: 'Détail communauté',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CommunityDetailScreen
      },
      CommunityCreate: {
        title: 'Créer une communauté',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CommunityCreateScreen
      },
      CommunitySettings: {
        title: 'Paramètres communauté',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: CommunitySettingsScreen
      },
      Notifications: {
        title: 'Notifications',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        component: NotificationsScreen
      },
      CreateNotification: {
        title: 'Nouvelle notification',
        showBack: true,
        showFarmSelector: false,
        showTabs: false,
        hideHeader: true,
        component: CreateNotificationScreen
      },
    };
    
    return configs[screen] || configs.Chat;
  };

  const currentConfig: any = getScreenConfig(navigation.currentScreen);
  const CurrentComponent = currentConfig.component;

  // Handlers
  const handleBack = () => {
    navigation.goBack();
  };

  const handleTabPress = (tabName: TabName) => {
    navigation.navigateToTab(tabName);
  };

  const handleFarmSelectorPress = () => {
    if (isInterfaceTourMode) {
      return;
    }
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

  // Afficher le header : pour Chat toujours (liste ou conversation) ; pour les autres si non hideHeader
  const isChatConversation =
    navigation.currentScreen === 'Chat' && navigation.chatState === 'conversation';
  const showHeader =
    (currentConfig as any).hideHeader !== true ||
    navigation.currentScreen === 'Chat';
  const headerTitle =
    isChatConversation
      ? (navigation.currentChatTitle || 'Conversation')
      : currentConfig.title;
  const headerShowBack = currentConfig.showBack || isChatConversation;
  const headerOnBack =
    isChatConversation
      ? () => navigation.setChatState('list')
      : (currentConfig.showBack ? handleBack : undefined);
  const headerRightSlot = isChatConversation ? (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background?.secondary || '#F9FAFB',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border?.primary || '#E5E7EB',
      paddingHorizontal: 6,
      paddingVertical: 2,
    }}>
      <Ionicons
        name={navigation.voiceHelpEnabled ? 'help-circle' : 'help-circle-outline'}
        size={14}
        color={navigation.voiceHelpEnabled ? colors.primary?.[600] || '#16A34A' : colors.gray?.[500] || '#6B7280'}
      />
      <Switch
        value={navigation.voiceHelpEnabled}
        onValueChange={navigation.setVoiceHelpEnabled}
        trackColor={{
          false: colors.gray?.[300] || '#D1D5DB',
          true: colors.primary?.[300] || '#86EFAC',
        }}
        thumbColor={navigation.voiceHelpEnabled ? colors.primary?.[600] || '#16A34A' : '#f4f3f4'}
      />
    </View>
  ) : undefined;

  return (
    <InterfaceTourTargetsProvider>
      <View style={containerStyle}>
      {/* Header unique : pour Chat avec flèche retour en vue conversation */}
      {showHeader && (
        <UnifiedHeader
          title={headerTitle}
          onBack={headerOnBack}
          onFarmSelector={currentConfig.showFarmSelector ? handleFarmSelectorPress : undefined}
          showBackButton={headerShowBack}
          // UX: ne pas afficher le mode d'analyse dans l'onglet discussion/chat.
          agentMethod={navigation.activeTab === 'Chat' ? null : agentMethod}
          {...(headerRightSlot ? { rightSlot: headerRightSlot } : {})}
          sideContentWidth={isChatConversation ? 84 : 48}
        />
      )}

      {/* Contenu principal */}
      <View style={contentStyle}>
        {navigation.currentScreen === 'Profil' ? (
          <CurrentComponent 
            onProfileAndFarmPress={() => {
              console.log('👤 [NAVIGATION] Profile and farm pressed');
              navigation.navigateToScreen('ProfileAndFarmSettings');
            }}
            onSettingsPress={() => {
              console.log('🔧 [NAVIGATION] Settings pressed');
              navigation.navigateToScreen('Settings');
            }}
            onAgentSettingsPress={() => {
              console.log('🤖 [NAVIGATION] Agent Settings pressed');
              navigation.navigateToScreen('FarmSettings');
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
            onCommercePress={() => {
              console.log('🛒 [NAVIGATION] Commerce pressed');
              navigation.navigateToScreen('Commerce');
            }}
            onNotificationsPress={() => {
              console.log('🔔 [NAVIGATION] Notifications pressed');
              navigation.navigateToScreen('Notifications');
            }}
            openEditProfileFromNav={navigation.navigationParams?.openEditProfile === true}
            onClearOpenEditProfile={() => navigation.setNavigationParams(prev => ({ ...prev, openEditProfile: false }))}
          />
        ) : navigation.currentScreen === 'ProfileAndFarmSettings' ? (
          <ProfileAndFarmSettingsScreen
            navigation={{ goBack: handleBack }}
            onEditProfile={() => navigation.navigateToScreen('Profil', { openEditProfile: true })}
            onFarmEdit={() => navigation.navigateToScreen('FarmList')}
            onFarmMembers={() => navigation.navigateToScreen('FarmMembers')}
            onMyInvitations={() => navigation.navigateToScreen('MyInvitations')}
            onCommunity={() => navigation.navigateToScreen('CommunityList')}
          />
        ) : navigation.currentScreen === 'Settings' ? (
          <CurrentComponent 
            onNavigate={(screen: any) => {
              console.log('🔧 [NAVIGATION] Navigating to:', screen);
              navigation.navigateToScreen(screen);
            }}
          />
        ) : navigation.currentScreen === 'Commerce' ? (
          <CommerceScreen
            onNavigate={(screen: any) => {
              console.log('🛒 [NAVIGATION] Commerce navigating to:', screen);
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
        ) : navigation.currentScreen === 'InvoiceDetails' ? (
          <InvoiceDetailsScreen
            navigation={{ goBack: handleBack }}
            invoiceId={(navigation.navigationParams?.invoiceId as string) ?? ''}
            onNavigate={navigation.navigateToScreen}
          />
        ) : navigation.currentScreen === 'CustomerEdit' ? (
          <CustomerEditScreen
            navigation={{ goBack: handleBack }}
            customerId={(navigation.navigationParams?.customerId as string) ?? undefined}
            mode={(navigation.navigationParams?.mode as 'customer' | 'supplier') ?? 'customer'}
            onNavigate={navigation.navigateToScreen}
          />
        ) : navigation.currentScreen === 'InvoicesList' ? (
          <InvoicesListScreen
            navigation={{ goBack: handleBack }}
            onNavigate={navigation.navigateToScreen}
          />
        ) : navigation.currentScreen === 'InvoiceCreate' ? (
          <InvoiceCreateScreen
            navigation={{ goBack: handleBack }}
            onNavigate={navigation.navigateToScreen}
            invoiceId={(navigation.navigationParams?.invoiceId as string) ?? undefined}
          />
        ) : navigation.currentScreen === 'CustomersList' ? (
          <CustomersListScreen
            navigation={{ goBack: handleBack }}
            onNavigate={navigation.navigateToScreen}
          />
        ) : navigation.currentScreen === 'SellerInfoSettings' ? (
          <SellerInfoSettingsScreen
            navigation={{ goBack: handleBack }}
          />
        ) : navigation.currentScreen === 'ProductsList' ? (
          <ProductsListScreen
            navigation={{ goBack: handleBack }}
          />
        ) : navigation.currentScreen === 'CommunityList' ? (
          <CommunityListScreen
            navigation={{ goBack: handleBack }}
            onNavigate={(screen, params) => navigation.navigateToScreen(screen as ScreenName, params)}
          />
        ) : navigation.currentScreen === 'CommunityDetail' ? (
          <CommunityDetailScreen
            navigation={{ goBack: handleBack }}
            communityId={(navigation.navigationParams?.communityId as string) ?? ''}
            onNavigate={(screen, params) => navigation.navigateToScreen(screen as ScreenName, params)}
          />
        ) : navigation.currentScreen === 'CommunityCreate' ? (
          <CommunityCreateScreen
            navigation={{ goBack: handleBack }}
            onNavigate={(screen, params) => navigation.navigateToScreen(screen as ScreenName, params)}
          />
        ) : navigation.currentScreen === 'CommunitySettings' ? (
          <CommunitySettingsScreen
            navigation={{ goBack: handleBack }}
            communityId={(navigation.navigationParams?.communityId as string) ?? ''}
            onNavigate={(screen, params) => navigation.navigateToScreen(screen as ScreenName, params)}
          />
        ) : navigation.currentScreen === 'AideEtSupport' ? (
          <AideEtSupportScreen
            onStartTutorial={handleStartTutorial}
            onStartInterfaceTour={handleStartInterfaceTour}
          />
        ) : navigation.currentScreen === 'Notifications' ? (
          <NotificationsScreen
            onNavigate={(screen, data) => {
              if (screen === 'CreateNotification') {
                navigation.navigateToScreen('CreateNotification');
              } else if (screen === 'EditNotification') {
                navigation.navigateToScreen('CreateNotification', { editNotification: data?.notification });
              }
            }}
          />
        ) : navigation.currentScreen === 'CreateNotification' ? (
          <CreateNotificationScreen
            onNavigate={() => navigation.goBack()}
            {...(
              navigation.navigationParams?.editNotification
                ? { editData: { notification: navigation.navigationParams.editNotification as any } }
                : {}
            )}
          />
        ) : (
          <CurrentComponent
            chatState={navigation.chatState}
            setChatState={navigation.setChatState}
            onStateChange={navigation.setChatState}
            onNavigate={navigation.navigateToScreen}
            onTitleChange={(title: string) => {
              navigation.setCurrentChatTitle(title);
            }}
            onBack={currentConfig.showBack ? handleBack : undefined}
            readOnlyMode={isInterfaceTourMode}
          />
        )}
      </View>

      {/* Barre d'onglets */}
      {currentConfig.showTabs && (
        <InterfaceTourTarget targetId="tab.bar" style={tabBarStyle}>
          {tabs.map((tab) => {
            const isActive = navigation.activeTab === tab.name;
            return (
              <InterfaceTourTarget key={tab.name} targetId={getTabTargetId(tab.name)} style={{ flex: 1 }}>
                <TouchableOpacity
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
              </InterfaceTourTarget>
            );
          })}
        </InterfaceTourTarget>
      )}

      {/* Modal de sélection de ferme */}
      <FarmSelectorModal
        visible={farmSelector.showModal}
        onClose={farmSelector.closeFarmSelector}
        currentFarmId={farmSelector.activeFarm?.farm_id || null}
        onFarmSelect={handleFarmSelect}
        onCreateFarm={handleCreateFarm}
      />

      {/* Modal d'onboarding (premier lancement + relance depuis FAQ) */}
      <InterfaceTourModal
        visible={showInterfaceTour}
        initialStepIndex={interfaceTourStepIndex}
        onStepChange={handleInterfaceStepChange}
        onClose={handleCloseInterfaceTour}
        onComplete={handleCompleteInterfaceTour}
      />

      {/* Modal d'onboarding chat (premier lancement + relance depuis FAQ) */}
      <OnboardingModal
        visible={showOnboarding}
        onClose={handleCloseOnboarding}
      />
      </View>
    </InterfaceTourTargetsProvider>
  );
};

export default NewSimpleNavigator;
