import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types de navigation
export type TabName = 'Dashboard' | 'Statistics' | 'Taches' | 'Chat' | 'Profil';
export type ScreenName = TabName | 'Settings' | 'ProfileAndFarmSettings' | 'FarmSettings' | 'PlotsSettings' | 'MaterialsSettings' | 'ConversionsSettings' | 'CulturesListSettings' | 'PhytosanitaryProductsSettings' | 'RecurringTasksSettings' | 'FarmMembers' | 'MyInvitations' | 'FarmEdit' | 'FarmList' | 'AideEtSupport' | 'APropos' | 'Documents' | 'Commerce' | 'InvoicesList' | 'InvoiceCreate' | 'InvoiceDetails' | 'CustomersList' | 'CustomerEdit' | 'SellerInfoSettings' | 'ProductsList' | 'CommunityList' | 'CommunityDetail' | 'CommunityCreate' | 'CommunitySettings' | 'Notifications' | 'CreateNotification';

interface NavigationState {
  activeTab: TabName;
  currentScreen: ScreenName;
  chatState: 'list' | 'conversation';
  navigationHistory: ScreenName[];
}

export type NavigationParams = any;

interface NavigationContextType {
  // État de navigation
  activeTab: TabName;
  currentScreen: ScreenName;
  chatState: 'list' | 'conversation';
  navigationHistory: ScreenName[];
  /** Titre de la conversation ouverte (pour le header en vue conversation) */
  currentChatTitle: string | null;
  /** Paramètres passés lors de la navigation (ex: invoiceId, customerId) */
  navigationParams: NavigationParams;
  setNavigationParams: (params: NavigationParams | ((prev: NavigationParams) => NavigationParams)) => void;

  // Actions de navigation
  navigateToTab: (tab: TabName) => void;
  navigateToScreen: (screen: ScreenName, params?: NavigationParams) => void;
  goBack: () => void;
  setChatState: (state: 'list' | 'conversation') => void;
  setCurrentChatTitle: (title: string | null) => void;
  /** Active/désactive l'aide vocale contextuelle dans le chat */
  voiceHelpEnabled: boolean;
  setVoiceHelpEnabled: (enabled: boolean) => void;

  // Actions spécifiques
  openFarmEdit: (farmId?: number) => void;
  openFarmList: () => void;
  openSettings: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Chat');
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Chat');
  const [chatState, setChatState] = useState<'list' | 'conversation'>('list');
  const [navigationHistory, setNavigationHistory] = useState<ScreenName[]>(['Chat']);
  const [currentChatTitle, setCurrentChatTitle] = useState<string | null>(null);
  const [voiceHelpEnabled, setVoiceHelpEnabled] = useState<boolean>(true);
  const [navigationParams, setNavigationParamsState] = useState<NavigationParams>({});
  const setNavigationParams = React.useCallback((params: NavigationParams | ((prev: NavigationParams) => NavigationParams)) => {
    setNavigationParamsState(prev => typeof params === 'function' ? params(prev) : params);
  }, []);

  const navigateToTab = (tab: TabName) => {
    console.log('🧭 [NAVIGATION] Navigate to tab:', tab);
    setActiveTab(tab);
    setCurrentScreen(tab);
    addToHistory(tab);
  };

  const navigateToScreen = (screen: ScreenName, params?: NavigationParams) => {
    if (params !== undefined && Object.keys(params).length > 0) {
      console.log('🧭 [NAVIGATION] Navigate to screen:', screen, params);
    } else {
      console.log('🧭 [NAVIGATION] Navigate to screen:', screen);
    }
    setNavigationParamsState(params ?? {});
    setCurrentScreen(screen);
    addToHistory(screen);
  };

  const addToHistory = (screen: ScreenName) => {
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      // Éviter les doublons consécutifs
      if (newHistory[newHistory.length - 1] !== screen) {
        newHistory.push(screen);
      }
      // Limiter l'historique à 10 éléments
      return newHistory.slice(-10);
    });
  };

  const goBack = () => {
    console.log('🧭 [NAVIGATION] Go back, history:', navigationHistory);
    
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Retirer l'écran actuel
      const previousScreen = newHistory[newHistory.length - 1];
      
      setNavigationHistory(newHistory);
      setCurrentScreen(previousScreen);
      
      // Mettre à jour l'onglet actif si nécessaire
      // Dashboard temporairement masqué de la bottom bar
      const tabs: TabName[] = ['Statistics', 'Taches', 'Chat', 'Profil'];
      if (tabs.includes(previousScreen as TabName)) {
        setActiveTab(previousScreen as TabName);
      }
      
      console.log('🧭 [NAVIGATION] Navigated back to:', previousScreen);
    } else {
      // Fallback vers Chat si pas d'historique
      console.log('🧭 [NAVIGATION] No history, fallback to Chat');
      navigateToTab('Chat');
    }
  };

  const openFarmEdit = (farmId?: number) => {
    console.log('🏢 [NAVIGATION] Open farm edit, farmId:', farmId);
    navigateToScreen('FarmEdit');
  };

  const openFarmList = () => {
    console.log('🏢 [NAVIGATION] Open farm list');
    navigateToScreen('FarmList');
  };

  const openSettings = () => {
    console.log('⚙️ [NAVIGATION] Open settings');
    navigateToScreen('Settings');
  };

  const value: NavigationContextType = {
    activeTab,
    currentScreen,
    chatState,
    navigationHistory,
    currentChatTitle,
    navigationParams,
    setNavigationParams,
    navigateToTab,
    navigateToScreen,
    goBack,
    setChatState,
    setCurrentChatTitle,
    voiceHelpEnabled,
    setVoiceHelpEnabled,
    openFarmEdit,
    openFarmList,
    openSettings,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};











