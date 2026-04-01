import React, { useState, useEffect, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { Screen } from '../design-system/components';
import { colors } from '../design-system/colors';
import ChatList, { Chat } from '../components/ChatList';
import ChatConversation from '../components/ChatConversation';
import { ChatCacheService } from '../services/ChatCacheService';
import { useNavigation } from '../contexts/NavigationContext';

// Layout constants
const TABLET_SIDEBAR_WIDTH_RATIO = 0.35;

interface ChatScreenProps {
  onStateChange?: (state: 'list' | 'conversation') => void;
  onFarmSelector?: () => void;
}

export default function ChatScreen({
  onStateChange,
  onFarmSelector,
}: ChatScreenProps = {}) {
  const navigation = useNavigation();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  const setChatState = onStateChange ?? navigation.setChatState;

  // Notifier l'état et le titre pour le header unique du navigateur
  useEffect(() => {
    const currentState = selectedChat ? 'conversation' : 'list';
    setChatState(currentState);
    navigation.setCurrentChatTitle(selectedChat?.title ?? null);
  }, [selectedChat, setChatState, navigation]);

  // Quand l'utilisateur tape "retour" dans le header (navigateur), revenir à la liste
  useEffect(() => {
    if (navigation.chatState === 'list' && selectedChat) {
      setSelectedChatId(null);
      setSelectedChat(null);
    }
  }, [navigation.chatState]);

  const handleCreateChat = (title: string) => {
    console.log('Chat créé:', title);
    // La logique de création est maintenant gérée dans ChatList
  };

  const handleSelectChat = useCallback(async (chatId: string) => {
    console.log('💬 [CHAT-SCREEN] Chat selected:', chatId);
    setSelectedChatId(chatId);
    
    // ⚡ PRÉCHARGEMENT INSTANTANÉ : Charger les messages depuis le cache AVANT d'afficher
    console.log('⚡ [PRELOAD] Attempting to preload messages from cache...');
    const preloadedMessages = await ChatCacheService.getCachedMessages(chatId);
    
    if (preloadedMessages && preloadedMessages.length > 0) {
      console.log('✅ [PRELOAD] Found', preloadedMessages.length, 'cached messages, will display instantly');
    } else {
      console.log('💾 [PRELOAD] No cached messages, will load from DB');
    }
    
    // Créer l'objet chat avec les messages préchargés
    setSelectedChat({ 
      id: chatId, 
      title: '', 
      lastMessage: '', 
      timestamp: new Date(), 
      isArchived: false, 
      messageCount: 0,
      preloadedMessages: preloadedMessages || undefined // Ajouter les messages préchargés
    });
    
    // Notifier qu'on passe en mode conversation
    onStateChange?.('conversation');
  }, [onStateChange]);

  // Retour depuis onboarding: rouvrir automatiquement la conversation d'origine.
  useEffect(() => {
    if (navigation.currentScreen !== 'Chat') return;
    const requestedChatId = navigation.navigationParams?.openChatId;
    if (typeof requestedChatId !== 'string' || requestedChatId.length === 0) return;

    if (selectedChatId === requestedChatId) {
      navigation.setNavigationParams((prev) => {
        if (!prev || prev.openChatId !== requestedChatId) return prev;
        const next = { ...prev };
        delete next.openChatId;
        delete next.fromOnboardingShortcut;
        return next;
      });
      return;
    }

    let cancelled = false;
    (async () => {
      await handleSelectChat(requestedChatId);
      if (cancelled) return;
      navigation.setNavigationParams((prev) => {
        if (!prev || prev.openChatId !== requestedChatId) return prev;
        const next = { ...prev };
        delete next.openChatId;
        delete next.fromOnboardingShortcut;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigation, selectedChatId, handleSelectChat]);

  const handleUpdateChat = (chatId: string, updates: Partial<Chat>) => {
    // Mettre à jour le chat local si c'est celui sélectionné
    if (selectedChat && selectedChat.id === chatId) {
      setSelectedChat(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleArchiveChat = (chatId: string) => {
    console.log('Chat archivé:', chatId);
    
    // Si le chat archivé était sélectionné, désélectionner
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      setSelectedChat(null);
      // Notifier qu'on retourne en mode liste
      onStateChange?.('list');
    }
  };

  if (isTablet) {
    // Layout tablette : côte à côte
    return (
      <Screen backgroundColor={colors.background.primary}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Liste des chats - 1/3 de l'écran */}
          <View style={{ 
            width: screenWidth * TABLET_SIDEBAR_WIDTH_RATIO,
          }}>
            <ChatList
              selectedChatId={selectedChatId}
              onSelectChat={handleSelectChat}
              onCreateChat={handleCreateChat}
              onArchiveChat={handleArchiveChat}
            />
          </View>
          
          {/* Conversation - 2/3 de l'écran */}
          <View style={{ flex: 1 }}>
            <ChatConversation
              chat={selectedChat}
              onUpdateChat={handleUpdateChat}
          onGoBack={() => {
            console.log('🔙 [CHAT-SCREEN] onGoBack called (mobile mode) - returning to chat list');
            setSelectedChatId(null);
            setSelectedChat(null);
            // Notifier qu'on retourne en mode liste
            onStateChange?.('list');
          }}
              onFarmSelector={onFarmSelector}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Layout mobile : navigation entre les deux vues
  if (selectedChat) {
    return (
      <Screen backgroundColor={colors.background.primary}>
        <ChatConversation
          chat={selectedChat}
          onUpdateChat={handleUpdateChat}
          onGoBack={() => {
            console.log('🔙 [CHAT-SCREEN] onGoBack called - returning to chat list');
            setSelectedChatId(null);
            setSelectedChat(null);
            // Notifier qu'on retourne en mode liste
            onStateChange?.('list');
          }}
          onFarmSelector={onFarmSelector}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={colors.background.primary}>
      <ChatList
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateChat}
        onArchiveChat={handleArchiveChat}
      />
    </Screen>
  );
}
