import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert, LayoutAnimation, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, ChatTypeModal } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { ChatCardMinimal, ChatData } from '../design-system/components/cards/ChatCardMinimal';
import { ChatServiceDirect as ChatService, ChatSession } from '../services/ChatServiceDirect';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { ChatCacheService } from '../services/ChatCacheService';

// Adapter ChatSession vers ChatData pour compatibilité UI
function adaptChatSessionToChatData(session: ChatSession): ChatData {
  return {
    id: session.id,
    title: session.title,
    lastMessage: session.last_message_content || 'Nouveau chat',
    timestamp: new Date(session.last_message_at || session.created_at),
    isArchived: !!session.archived_at,
    messageCount: session.message_count
  };
}

export type Chat = ChatData;

const ONBOARDING_HELP_SHORTCUT_SCREEN = 'ONBOARDING_TUTORIAL';
const ONBOARDING_INTRO_CONTINUE_SHORTCUT_SCREEN = 'ONBOARDING_INTRO_CONTINUE';
const ONBOARDING_CHAT_TITLE = 'Onboarding & aide rapide';

function getUserFirstName(
  userMetadata: Record<string, unknown> | undefined,
  email: string | undefined
): string {
  if (userMetadata) {
    const firstName = userMetadata.first_name;
    if (typeof firstName === 'string' && firstName.trim().length > 0) {
      return firstName.trim();
    }

    const fullName = userMetadata.full_name;
    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim().split(' ')[0];
    }
  }

  if (email && email.includes('@')) {
    return email.split('@')[0];
  }

  return '';
}

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (title: string, isShared?: boolean) => void;
  onArchiveChat: (chatId: string) => void;
}

export default function ChatList({
  selectedChatId,
  onSelectChat,
  onCreateChat,
  onArchiveChat
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChatTypeModal, setShowChatTypeModal] = useState(false);
  const [isArchivingInProgress, setIsArchivingInProgress] = useState(false);
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const creatingDefaultChatRef = useRef(false);

  const sendOnboardingAssistantShortcutMessage = async ({
    sessionId,
    text,
    shortcutScreen,
    shortcutLabel,
    stepType,
  }: {
    sessionId: string;
    text: string;
    shortcutScreen: string;
    shortcutLabel: string;
    stepType: string;
  }) => {
    await ChatService.sendMessage({
      session_id: sessionId,
      role: 'assistant',
      content: text,
      ai_confidence: 1,
      metadata: {
        type: stepType,
        has_actions: false,
        is_help_request: true,
        help_shortcut: {
          screen: shortcutScreen,
          label: shortcutLabel,
        },
        onboarding_simulation: true,
      },
    });
  };

  const createOnboardingChatWithWelcome = async ({
    title,
    isShared,
  }: {
    title: string;
    isShared: boolean;
  }): Promise<ChatSession> => {
    if (!activeFarm?.farm_id) {
      throw new Error('Aucune ferme sélectionnée');
    }

    const firstName = getUserFirstName(
      user?.user_metadata as Record<string, unknown> | undefined,
      user?.email
    );
    const welcomeName = firstName ? ` ${firstName}` : '';
    const farmName = activeFarm.farm_name || 'votre ferme';

    const session = await ChatService.createChatSession({
      farm_id: activeFarm.farm_id,
      title,
      chat_type: 'general',
      is_shared: isShared,
    });

    await ChatService.sendMessage({
      session_id: session.id,
      role: 'assistant',
      content:
        `👋 Bonjour${welcomeName} !\n\n` +
        `Je suis Thomas, votre assistant pour ${farmName}.\n` +
        `Nouveau dans cette ferme ?\n` +
        `Utilisez le raccourci ci-dessous pour lancer l'onboarding en un clic.`,
      ai_confidence: 1,
      metadata: {
        type: 'welcome_onboarding',
        has_actions: false,
        is_help_request: true,
        help_shortcut: {
          screen: ONBOARDING_HELP_SHORTCUT_SCREEN,
          label: 'Onboarding',
        },
        onboarding_message_key: `${user?.id || 'unknown'}:${activeFarm.farm_id}:${Date.now()}`,
      },
    });

    await sendOnboardingAssistantShortcutMessage({
      sessionId: session.id,
      text: 'Ensuite, appuyez sur Continuer pour voir des exemples de messages.',
      shortcutScreen: ONBOARDING_INTRO_CONTINUE_SHORTCUT_SCREEN,
      shortcutLabel: 'Continuer',
      stepType: 'onboarding_intro_continue_prompt',
    });

    return session;
  };

  const ensureDefaultChatSession = async (
    sessions: ChatSession[]
  ): Promise<{ sessions: ChatSession[]; createdSessionId?: string }> => {
    if (showArchived || sessions.length > 0 || !activeFarm?.farm_id) {
      return { sessions };
    }

    if (creatingDefaultChatRef.current) {
      console.log('⏳ [DEFAULT-CHAT] Creation already in progress, skipping');
      return { sessions };
    }

    creatingDefaultChatRef.current = true;

    try {
      const session = await createOnboardingChatWithWelcome({
        title: 'Bienvenue sur Thomas',
        isShared: true,
      });

      console.log('✅ [DEFAULT-CHAT] Created default chat with onboarding shortcut:', session.id);
      return { sessions: [session], createdSessionId: session.id };
    } catch (error) {
      console.error('❌ [DEFAULT-CHAT] Failed to create default chat:', error);
      return { sessions };
    } finally {
      creatingDefaultChatRef.current = false;
    }
  };

  // Charger les chats depuis la base de données (avec cache intelligent)
  const loadChats = async () => {
    console.log('📋 ChatList.loadChats - Start');
    console.log('🏪 Active farm for loading:', activeFarm);

    if (!activeFarm?.farm_id) {
      console.log('⚠️ No active farm, skipping load');
      return;
    }

    // ========== STRATÉGIE CACHE INTELLIGENTE ==========
    // 1. Essayer de charger depuis le cache d'abord (instantané)
    // 2. Afficher les chats cachés immédiatement
    // 3. Charger les chats frais en arrière-plan
    // 4. Mettre à jour avec les chats frais
    // 5. Sauvegarder le nouveau cache
    // ==================================================
    
    try {
      // Étape 1: Essayer le cache pour affichage instantané
      // Note: Pour l'instant, on skip le cache pour les archivées car le cache ne les stocke pas séparément
      const cachedSessions = !showArchived ? await ChatCacheService.getCachedChatList(activeFarm.farm_id) : null;
      
      if (cachedSessions && cachedSessions.length > 0 && !showArchived) {
        console.log('⚡ [CACHE-HIT] Found', cachedSessions.length, 'cached ACTIVE chat sessions, displaying instantly');
        const adaptedCachedChats = cachedSessions.map(adaptChatSessionToChatData);
        setChats(adaptedCachedChats);
        setLoading(false); // Arrêter le loading immédiatement
      } else {
        console.log('💾 [CACHE-MISS] No cache found or showing archived, will load from DB');
        setLoading(true);
      }
      
      // Étape 2: Charger les chats frais depuis la DB (en arrière-plan si cache)
      console.log('🌐 [DB-LOAD] Loading fresh chat sessions from database... (showArchived:', showArchived, ')');
      const freshSessions = await ChatService.getChatSessions(activeFarm.farm_id, showArchived);

      let sessionsToDisplay = freshSessions;
      let createdSessionId: string | undefined;

      if (!showArchived && freshSessions.length === 0) {
        console.log('🆕 [DEFAULT-CHAT] No active session found, creating default onboarding chat');
        const ensured = await ensureDefaultChatSession(freshSessions);
        sessionsToDisplay = ensured.sessions;
        createdSessionId = ensured.createdSessionId;
      }

      console.log('✅ [DB-LOAD] Loaded', sessionsToDisplay.length, 'fresh sessions');

      const adaptedFreshChats = sessionsToDisplay.map(adaptChatSessionToChatData);
      setChats(adaptedFreshChats);
      
      // Sauvegarder en cache pour la prochaine fois (seulement les actives)
      if (!showArchived) {
        await ChatCacheService.cacheChatList(activeFarm.farm_id, sessionsToDisplay);
        console.log('💾 [CACHE-SAVE] Saved', sessionsToDisplay.length, 'ACTIVE sessions to cache');
      } else {
        console.log('📭 [CACHE-SKIP] Not caching ARCHIVED sessions');
      }

      if (createdSessionId) {
        console.log('🚀 [DEFAULT-CHAT] Opening newly created default chat:', createdSessionId);
        onSelectChat(createdSessionId);
      }
      
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      
      // En cas d'erreur réseau, utiliser le cache si disponible (mode offline)
      // Note: Le cache ne contient que les conversations actives
      if (!showArchived) {
        const cachedSessions = await ChatCacheService.getCachedChatList(activeFarm.farm_id);
        if (cachedSessions && cachedSessions.length > 0) {
          console.log('🔄 [FALLBACK] Using cached ACTIVE sessions due to error');
          const adaptedCachedChats = cachedSessions.map(adaptChatSessionToChatData);
          setChats(adaptedCachedChats);
        } else {
          Alert.alert('Erreur', `Impossible de charger les conversations: ${error.message || error}`);
        }
      } else {
        Alert.alert('Erreur', `Impossible de charger les conversations archivées: ${error.message || error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les chats au montage, quand la ferme change, ou quand le filtre change
  useEffect(() => {
    loadChats();
  }, [activeFarm?.farm_id, showArchived]); // Recharger quand on change de filtre

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    if (!activeFarm?.farm_id) return;

    const subscription = ChatService.subscribeToChatSessions(
      activeFarm.farm_id,
      (updatedSession) => {
        // IGNORER les updates pendant qu'un archivage est en cours pour éviter les conflits
        if (isArchivingInProgress) {
          console.log('🚫 [SUBSCRIPTION] Ignoring update during archive operation:', updatedSession.id);
          return;
        }
        
        const adaptedChat = adaptChatSessionToChatData(updatedSession);
        console.log('📨 [SUBSCRIPTION] Processing chat update:', adaptedChat.id, 'isArchived:', adaptedChat.isArchived, 'showArchived:', showArchived);
        
        // FILTRER selon le filtre actuel
        const shouldBeInList = showArchived ? adaptedChat.isArchived : !adaptedChat.isArchived;
        
        setChats(prev => {
          const existing = prev.findIndex(c => c.id === adaptedChat.id);
          
          if (!shouldBeInList) {
            // Ce chat ne devrait PAS être dans la liste actuelle
            if (existing >= 0) {
              // Le retirer s'il y était
              console.log('🗑️ [SUBSCRIPTION] Removing chat (filter mismatch)');
              return prev.filter(c => c.id !== adaptedChat.id);
            }
            console.log('⏭️ [SUBSCRIPTION] Skipping chat (filter mismatch)');
            return prev;
          }
          
          // Ce chat DEVRAIT être dans la liste
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = adaptedChat;
            console.log('📝 [SUBSCRIPTION] Updated existing chat');
            return updated;
          } else {
            console.log('➕ [SUBSCRIPTION] Added new chat');
            return [adaptedChat, ...prev];
          }
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [activeFarm?.farm_id, isArchivingInProgress, showArchived]); // Resubscribe quand le filtre change


  // Gérer l'archivage/désarchivage avec animation smooth optimiste
  const handleArchiveChat = async (chatId: string, onSuccess?: () => void, onError?: () => void) => {
    try {
      console.log('🔄 [CHAT-LIST] Starting archive operation for:', chatId);
      
      // BLOQUER les subscriptions pendant l'archivage
      setIsArchivingInProgress(true);
      
      const chat = chats.find(c => c.id === chatId);
      if (!chat) {
        console.error('❌ [CHAT-LIST] Chat not found:', chatId);
        setIsArchivingInProgress(false);
        onError?.();
        return;
      }

      // OPTIMISTIC UPDATE - Retirer immédiatement de la liste locale avec animation smooth
      console.log('⚡ [OPTIMISTIC] Removing chat from local state for smooth animation');
      
      // Configuration d'animation smooth pour le repositionnement des cartes restantes
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext({
          duration: 300,
          create: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
          update: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.scaleXY,
          },
          delete: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
        });
      }
      
      const updatedChats = chats.filter(c => c.id !== chatId);
      setChats(updatedChats);
      
      // Notifier le parent immédiatement pour l'UI
      onArchiveChat(chatId);

      // API EN ARRIÈRE-PLAN
      console.log('🔄 [BACKGROUND] Starting real archive API call');
      if (chat.isArchived) {
        await ChatService.unarchiveChatSession(chatId);
        console.log('✅ [CHAT-LIST] Chat unarchived successfully');
      } else {
        await ChatService.archiveChatSession(chatId);
        console.log('✅ [CHAT-LIST] Chat archived successfully');
      }
      
      // Invalider le cache de la liste car modification
      if (activeFarm?.farm_id) {
        await ChatCacheService.invalidateChatListCache(activeFarm.farm_id);
        console.log('🔄 [CACHE] Invalidated chat list cache after archive');
      }
      
      // PAS DE RELOAD AUTOMATIQUE - L'état local est déjà correct
      console.log('✅ [OPTIMISTIC] Skipping reload - local state already updated optimistically');
      
      // RÉACTIVER les subscriptions après un délai
      setTimeout(() => {
        console.log('🔊 [SUBSCRIPTION] Re-enabling subscriptions after archive');
        setIsArchivingInProgress(false);
      }, 1000); // 1 seconde pour être sûr que l'API a fini
      
      // Notifier le succès
      onSuccess?.();
    } catch (error) {
      console.error('❌ [CHAT-LIST] Error archiving chat:', error);
      Alert.alert('Erreur', 'Impossible d\'archiver la conversation');
      
      // ROLLBACK - Remettre le chat dans la liste en cas d'échec
      console.log('🔄 [ROLLBACK] Restoring chat to local state due to API failure');
      await loadChats(); // Recharger depuis la DB pour être sûr
      
      // RÉACTIVER les subscriptions en cas d'erreur
      setIsArchivingInProgress(false);
      
      // Notifier l'échec
      onError?.();
    }
  };

  // Afficher le modal de sélection de type de chat
  const handleShowChatTypeModal = () => {
    setShowChatTypeModal(true);
  };

  // Créer un chat privé avec navigation OPTIMISTE (0ms d'attente)
  const handleCreatePrivateChat = async () => {
    console.log('🚀 [OPTIMISTIC] Creating private chat - INSTANT navigation');
    
    // 1. FERMER MODAL + CRÉER CHAT TEMPORAIRE IMMÉDIATEMENT (0ms)
    setShowChatTypeModal(false);
    
    if (!activeFarm?.farm_id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    // 2. NAVIGATION INSTANTANÉE vers un chat temporaire
    const tempChatId = `temp-${Date.now()}`;
    const tempTitle = `Chat privé - ${new Date().toLocaleDateString()}`;
    
    console.log('⚡ [OPTIMISTIC] Opening temporary chat instantly:', tempChatId);
    
    // Créer un chat temporaire dans la liste
    const tempChat: Chat = {
      id: tempChatId,
      title: tempTitle,
      lastMessage: '',
      timestamp: new Date(),
      isArchived: false,
      messageCount: 0
    };
    
    // Ajouter immédiatement à la liste ET ouvrir
    setChats(prev => [tempChat, ...prev]);
    onSelectChat(tempChatId);
    onCreateChat(tempTitle);
    
    console.log('✅ [OPTIMISTIC] User sees chat interface immediately - 0ms delay!');
    
    // 3. CRÉATION RÉELLE EN ARRIÈRE-PLAN (pendant que l'utilisateur voit déjà le chat)
    try {
      console.log('🔄 [BACKGROUND] Starting real chat creation...');
      
      const session = await ChatService.createChatSession({
        farm_id: activeFarm.farm_id,
        title: tempTitle,
        chat_type: 'general',
        is_shared: false
      });
      
      console.log('✅ [BACKGROUND] Real chat created:', session.id);
      
      // 4. REMPLACEMENT TRANSPARENT (l'utilisateur ne voit rien)
      console.log('🔄 [BACKGROUND] Replacing temporary chat with real chat...');
      
      // Remplacer dans la liste
      const realChatData = adaptChatSessionToChatData(session);
      setChats(prev => prev.map(chat => 
        chat.id === tempChatId ? realChatData : chat
      ));
      
      // Mettre à jour la sélection avec le vrai ID
      onSelectChat(session.id);
      
      // Invalider le cache de la liste car nouveau chat créé
      await ChatCacheService.invalidateChatListCache(activeFarm.farm_id);
      console.log('🔄 [CACHE] Invalidated chat list cache after creation');
      
      console.log('✅ [OPTIMISTIC] Seamless transition completed!');
      
    } catch (error) {
      console.error('❌ [BACKGROUND] Error creating real chat:', error);
      
      // En cas d'erreur, supprimer le chat temporaire
      setChats(prev => prev.filter(chat => chat.id !== tempChatId));
      Alert.alert('Erreur', `Impossible de créer la conversation: ${error.message || error}`);
    }
  };

  // Créer un chat partagé avec navigation OPTIMISTE (0ms d'attente)
  const handleCreateSharedChat = async () => {
    console.log('🚀 [OPTIMISTIC] Creating shared chat - INSTANT navigation');
    
    // 1. FERMER MODAL + CRÉER CHAT TEMPORAIRE IMMÉDIATEMENT (0ms)
    setShowChatTypeModal(false);
    
    if (!activeFarm?.farm_id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    // 2. NAVIGATION INSTANTANÉE vers un chat temporaire
    const tempChatId = `temp-shared-${Date.now()}`;
    const tempTitle = `Chat partagé - ${new Date().toLocaleDateString()}`;
    
    console.log('⚡ [OPTIMISTIC] Opening temporary shared chat instantly:', tempChatId);
    
    // Créer un chat temporaire dans la liste
    const tempChat: Chat = {
      id: tempChatId,
      title: tempTitle,
      lastMessage: '',
      timestamp: new Date(),
      isArchived: false,
      messageCount: 0
    };
    
    // Ajouter immédiatement à la liste ET ouvrir
    setChats(prev => [tempChat, ...prev]);
    onSelectChat(tempChatId);
    onCreateChat(tempTitle);
    
    console.log('✅ [OPTIMISTIC] User sees shared chat interface immediately - 0ms delay!');
    
    // 3. CRÉATION RÉELLE EN ARRIÈRE-PLAN
    try {
      console.log('🔄 [BACKGROUND] Starting real shared chat creation...');
      
      const session = await ChatService.createChatSession({
        farm_id: activeFarm.farm_id,
        title: tempTitle,
        chat_type: 'general',
        is_shared: true
      });
      
      console.log('✅ [BACKGROUND] Real shared chat created:', session.id);
      
      // 4. REMPLACEMENT TRANSPARENT
      console.log('🔄 [BACKGROUND] Replacing temporary shared chat with real chat...');
      
      const realChatData = adaptChatSessionToChatData(session);
      setChats(prev => prev.map(chat => 
        chat.id === tempChatId ? realChatData : chat
      ));
      
      onSelectChat(session.id);
      
      // Invalider le cache de la liste car nouveau chat partagé créé
      await ChatCacheService.invalidateChatListCache(activeFarm.farm_id);
      console.log('🔄 [CACHE] Invalidated chat list cache after shared chat creation');
      
      console.log('✅ [OPTIMISTIC] Seamless shared chat transition completed!');
      
    } catch (error) {
      console.error('❌ [BACKGROUND] Error creating real shared chat:', error);
      
      // En cas d'erreur, supprimer le chat temporaire
      setChats(prev => prev.filter(chat => chat.id !== tempChatId));
      Alert.alert('Erreur', `Impossible de créer la conversation partagée: ${error.message || error}`);
    }
  };

  // Créer un chat onboarding partagé avec message d'aide en un clic
  const handleCreateOnboardingChat = async () => {
    console.log('🚀 [OPTIMISTIC] Creating onboarding chat - INSTANT navigation');

    setShowChatTypeModal(false);

    if (!activeFarm?.farm_id) {
      Alert.alert('Erreur', 'Aucune ferme sélectionnée');
      return;
    }

    const tempChatId = `temp-onboarding-${Date.now()}`;
    const tempTitle = ONBOARDING_CHAT_TITLE;

    console.log('⚡ [OPTIMISTIC] Opening temporary onboarding chat instantly:', tempChatId);

    const tempChat: Chat = {
      id: tempChatId,
      title: tempTitle,
      lastMessage: '',
      timestamp: new Date(),
      isArchived: false,
      messageCount: 0,
    };

    setChats(prev => [tempChat, ...prev]);
    onSelectChat(tempChatId);
    onCreateChat(tempTitle, true);

    try {
      console.log('🔄 [BACKGROUND] Starting real onboarding chat creation...');

      const session = await createOnboardingChatWithWelcome({
        title: tempTitle,
        isShared: true,
      });

      console.log('✅ [BACKGROUND] Real onboarding chat created:', session.id);

      const realChatData = adaptChatSessionToChatData(session);
      setChats(prev => prev.map(chat =>
        chat.id === tempChatId ? realChatData : chat
      ));

      onSelectChat(session.id);

      await ChatCacheService.invalidateChatListCache(activeFarm.farm_id);
      console.log('🔄 [CACHE] Invalidated chat list cache after onboarding chat creation');
    } catch (error) {
      console.error('❌ [BACKGROUND] Error creating onboarding chat:', error);
      setChats(prev => prev.filter(chat => chat.id !== tempChatId));
      Alert.alert('Erreur', `Impossible de créer le chat onboarding: ${error.message || error}`);
    }
  };

  // Gérer l'édition du titre avec optimisme
  const handleTitleEdit = async (chatId: string, newTitle: string, onSuccess?: () => void, onError?: () => void) => {
    try {
      console.log('✏️ [CHAT-LIST] Starting title edit for:', chatId, '→', newTitle);
      
      // OPTIMISTIC UPDATE - Mettre à jour immédiatement dans la liste locale
      console.log('⚡ [OPTIMISTIC] Updating title locally for instant feedback');
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      ));
      
      // API EN ARRIÈRE-PLAN
      console.log('🔄 [BACKGROUND] Starting real title update API call');
      await ChatService.updateChatTitle(chatId, newTitle);
      console.log('✅ [BACKGROUND] Title updated successfully');
      
      // Notifier le succès
      onSuccess?.();
    } catch (error) {
      console.error('❌ [CHAT-LIST] Error updating title:', error);
      
      // ROLLBACK - Recharger depuis la DB pour récupérer l'ancien titre
      console.log('🔄 [ROLLBACK] Restoring original title due to API failure');
      await loadChats();
      
      // Notifier l'échec
      onError?.();
    }
  };

  // Filtrer et trier les chats
  // Note: Le filtre archived/active est déjà géré par le service, on ne garde que la recherche
  const filteredChats = chats
    .filter(chat => {
      const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // Trier par dernière utilisation (timestamp) - le plus récent en premier
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });


  return (
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Sub-Header Niveau 2 - Titre + Actions */}
      <View style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.primary,
      }}>
        {/* Titre et bouton + - Style sub-header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '600',
            color: colors.text.primary,
          }}>
            Chats
          </Text>
          <TouchableOpacity
            onPress={handleShowChatTypeModal}
            style={{
              backgroundColor: colors.background.secondary,
              width: 32,
              height: 32,
              borderRadius: 6,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 1,
              elevation: 1,
              borderWidth: 1,
              borderColor: colors.border.primary,
            }}
          >
            <Ionicons name="add" size={16} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche compacte */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.background.secondary,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border.primary,
        }}>
          <Ionicons name="search" size={14} color={colors.gray[400]} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 6,
              fontSize: 14,
              color: colors.text.primary,
            }}
            placeholder="Rechercher..."
            placeholderTextColor={colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Toggle Archives compact */}
        <TouchableOpacity
          onPress={() => setShowArchived(!showArchived)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing.sm,
            paddingVertical: 4,
          }}
        >
          <Ionicons name="archive-outline" size={14} color={colors.gray[500]} />
          <Text style={{ 
            marginLeft: 4, 
            fontSize: 13, 
            color: colors.gray[500],
            fontWeight: '500' 
          }}>
            {showArchived ? 'Actives' : 'Archivées'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des conversations */}
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {loading ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xl,
          }}>
            <Ionicons name="refresh" size={48} color={colors.gray[400]} />
            <Text style={{ 
              textAlign: 'center', 
              marginTop: spacing.md,
              fontSize: 16,
              fontWeight: '500',
              color: colors.gray[500]
            }}>
              Chargement des conversations...
            </Text>
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xl,
          }}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.gray[300]} />
            <Text style={{ 
              textAlign: 'center', 
              marginTop: spacing.md,
              fontSize: 16,
              fontWeight: '500',
              color: colors.gray[500]
            }}>
              {searchQuery ? 'Aucune conversation trouvée' : 
               showArchived ? 'Aucune conversation archivée' : 'Aucune conversation'}
            </Text>
            {!searchQuery && !showArchived && (
              <TouchableOpacity
                onPress={handleShowChatTypeModal}
                style={{
                  marginTop: spacing.md,
                  backgroundColor: colors.semantic.success,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{
                  color: colors.text.inverse,
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Créer une conversation
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ 
            paddingHorizontal: spacing.md,
            // Transition smooth pour web
            ...(Platform.OS === 'web' && {
              transition: 'all 0.3s ease-in-out',
            })
          }}>
            {filteredChats.map((chat) => (
              <ChatCardMinimal
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                onPress={(chat) => onSelectChat(chat.id)}
                onArchive={(chat, onSuccess, onError) => handleArchiveChat(chat.id, onSuccess, onError)}
                onTitleEdit={(chatId, newTitle, onSuccess, onError) => handleTitleEdit(chatId, newTitle, onSuccess, onError)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de sélection du type de chat */}
      <ChatTypeModal
        visible={showChatTypeModal}
        onClose={() => setShowChatTypeModal(false)}
        onCreatePrivateChat={handleCreatePrivateChat}
        onCreateSharedChat={handleCreateSharedChat}
        onCreateOnboardingChat={handleCreateOnboardingChat}
      />
    </View>
  );
}
