/**
 * ChatService avec fetch() direct - SOLUTION AUX TIMEOUTS
 * 
 * Version corrigée du ChatService qui utilise fetch() direct
 * au lieu du client Supabase JS qui timeout
 * 
 * Utilise la même approche que SimpleInitService qui FONCTIONNE !
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import { supabase } from '../utils/supabase';

export interface ChatSession {
  id: string;
  farm_id: number;
  user_id: string;
  chat_type: string;
  title: string;
  description?: string;
  status: string;
  is_shared: boolean;
  message_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  last_message_content?: string;
  participant_count?: number;
  participants?: ChatParticipant[];
}

export interface ChatParticipant {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ai_confidence?: number;
  metadata?: Record<string, any>;
  created_at: string;
  edited_at?: string;
  reply_to_id?: string;
}

export interface CreateChatSessionData {
  farm_id: number;
  title: string;
  description?: string;
  chat_type?: string;
  is_shared?: boolean;
  participant_user_ids?: string[]; // Pour les chats partagés
}

export interface CreateMessageData {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ai_confidence?: number;
  metadata?: Record<string, any>;
  reply_to_id?: string;
}

export class ChatServiceDirect {
  
  /**
   * Test de connectivité avec fetch direct
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 [CHAT-DIRECT] Testing connection...');
      
      // Test simple avec fetch direct
      const result = await DirectSupabaseService.directSelect('farms', 'count', undefined, true);
      
      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Connection test failed:', result.error);
        return { success: false, error: result.error.message };
      }
      
      console.log('✅ [CHAT-DIRECT] Connection test successful');
      return { success: true };
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Connection test error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Récupère toutes les sessions de chat pour une ferme - AVEC FETCH DIRECT
   */
  static async getChatSessions(farmId: number, includeArchived: boolean = false): Promise<ChatSession[]> {
    try {
      console.log('📂 [CHAT-DIRECT] Fetching chat sessions for farm:', farmId, 'includeArchived:', includeArchived);

      // Construire les filtres selon si on veut les archivées ou non
      const filters: Array<{ column: string; value: any; operator?: string }> = [
        { column: 'farm_id', value: farmId }
      ];
      
      // Si on ne veut PAS les archivées, filtrer archived_at = null
      // Si on veut SEULEMENT les archivées, filtrer archived_at IS NOT NULL
      if (includeArchived === false) {
        filters.push({ column: 'archived_at', value: null });
        console.log('🔍 [CHAT-DIRECT] Filtering for ACTIVE chats (archived_at IS NULL)');
      } else if (includeArchived === true) {
        // Pour avoir SEULEMENT les archivées, utiliser IS NOT NULL
        filters.push({ column: 'archived_at', value: 'NOT_NULL' });
        console.log('🔍 [CHAT-DIRECT] Filtering for ARCHIVED chats (archived_at IS NOT NULL)');
      }

      const result = await DirectSupabaseService.directSelect(
        'chat_sessions_with_info',
        '*',
        filters
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error fetching chat sessions:', result.error);
        throw new Error(result.error.message);
      }

      const sessions = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      
      // Log détaillé selon le type de sessions chargées
      if (includeArchived === true) {
        console.log(`✅ [CHAT-DIRECT] Found ${sessions.length} ARCHIVED chat sessions`);
        if (sessions.length > 0) {
          console.log('📋 [CHAT-DIRECT] Archived sessions:', sessions.map(s => ({ id: s.id, title: s.title, archived_at: s.archived_at })));
        }
      } else {
        console.log(`✅ [CHAT-DIRECT] Found ${sessions.length} ACTIVE chat sessions`);
        if (sessions.length > 0) {
          console.log('📋 [CHAT-DIRECT] Active sessions:', sessions.map(s => ({ id: s.id, title: s.title, archived_at: s.archived_at })));
        }
      }
      
      return sessions.map(session => ({
        ...session,
        participants: session.participants || []
      }));
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception fetching chat sessions:', error);
      throw error;
    }
  }

  /**
   * Récupère une session de chat spécifique - AVEC FETCH DIRECT
   */
  static async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      console.log('🔍 [CHAT-DIRECT] Fetching chat session:', sessionId);

      const result = await DirectSupabaseService.directSelect(
        'chat_sessions_with_info',
        '*',
        [{ column: 'id', value: sessionId }],
        true
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error fetching chat session:', result.error);
        throw new Error(result.error.message);
      }

      if (!result.data) {
        console.log('⚠️ [CHAT-DIRECT] Chat session not found:', sessionId);
        return null;
      }

      console.log('✅ [CHAT-DIRECT] Chat session found:', sessionId);
      return {
        ...result.data,
        participants: result.data.participants || []
      };
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception fetching chat session:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle session de chat - AVEC FETCH DIRECT !
   * CORRIGE LES TIMEOUTS DU CLIENT SUPABASE JS
   */
  static async createChatSession(data: CreateChatSessionData): Promise<ChatSession> {
    try {
      console.log('🎯 [CHAT-DIRECT] Creating chat session - START', data);

      // 1. Récupérer l'utilisateur via le token directement (pas via l'API JS qui timeout)
      const authToken = await DirectSupabaseService.getAuthToken();
      if (!authToken) {
        console.error('❌ [CHAT-DIRECT] No auth token found');
        throw new Error('Token d\'authentification manquant');
      }
      
      // Décoder le JWT pour récupérer l'user_id
      let userId: string;
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        userId = payload.sub;
        
        if (!userId) {
          console.error('❌ [CHAT-DIRECT] No user ID in token payload');
          throw new Error('ID utilisateur introuvable dans le token');
        }

        console.log('✅ [CHAT-DIRECT] Authenticated user:', userId);
      } catch (jwtError) {
        console.error('❌ [CHAT-DIRECT] JWT decode error:', jwtError);
        throw new Error(`Erreur de décodage du token: ${jwtError.message}`);
      }

      // 2. Créer la session de chat avec FETCH DIRECT
      const sessionData = {
        farm_id: data.farm_id,
        user_id: userId,
        title: data.title,
        description: data.description,
        chat_type: data.chat_type || 'general',
        is_shared: data.is_shared || false,
        status: 'active'
      };

      console.log('📝 [CHAT-DIRECT] Inserting session data:', sessionData);

      // UTILISE FETCH DIRECT au lieu du client Supabase JS
      console.log('🔄 [CHAT-DIRECT] Calling DirectSupabaseService.directInsert...');
      const sessionResult = await DirectSupabaseService.directInsert(
        'chat_sessions',
        sessionData,
        '*'
      );
      console.log('🔄 [CHAT-DIRECT] DirectSupabaseService.directInsert result:', sessionResult);

      if (sessionResult.error) {
        console.error('❌ [CHAT-DIRECT] Session creation error:', sessionResult.error);
        throw new Error(`Impossible de créer la session de chat: ${sessionResult.error.message}`);
      }

      const session = sessionResult.data;
      console.log('✅ [CHAT-DIRECT] Session created:', session);

      // 3. Si c'est un chat partagé avec des participants spécifiés
      if (data.is_shared && data.participant_user_ids && data.participant_user_ids.length > 0) {
        console.log('👥 [CHAT-DIRECT] Adding participants:', data.participant_user_ids);
        
        // Ajouter chaque participant avec FETCH DIRECT
        for (const userId of data.participant_user_ids) {
          const participantData = {
            chat_session_id: session.id,
            user_id: userId,
            role: 'member'
          };

          const participantResult = await DirectSupabaseService.directInsert(
            'chat_participants',
            participantData
          );

          if (participantResult.error) {
            console.error('❌ [CHAT-DIRECT] Error adding participant:', participantResult.error);
            // Ne pas échouer la création du chat si l'ajout des participants échoue
          } else {
            console.log('✅ [CHAT-DIRECT] Participant added:', userId);
          }
        }
      }

      // 4. Récupérer la session complète
      console.log('🔍 [CHAT-DIRECT] Fetching full session...');
      const fullSession = await this.getChatSession(session.id);
      if (!fullSession) {
        console.error('❌ [CHAT-DIRECT] Failed to retrieve created session');
        throw new Error('Failed to retrieve created session');
      }

      console.log('✅ [CHAT-DIRECT] Chat session created successfully!', fullSession);
      return fullSession;
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception creating chat session:', error);
      throw error;
    }
  }

  /**
   * Met à jour une session de chat - AVEC FETCH DIRECT
   */
  static async updateChatSession(
    sessionId: string, 
    updates: Partial<Pick<ChatSession, 'title' | 'description' | 'status'>>
  ): Promise<void> {
    try {
      console.log('🔄 [CHAT-DIRECT] Updating chat session:', sessionId, updates);

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const result = await DirectSupabaseService.directUpdate(
        'chat_sessions',
        updateData,
        [{ column: 'id', value: sessionId }]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error updating chat session:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Chat session updated successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception updating chat session:', error);
      throw error;
    }
  }

  /**
   * Met à jour le titre d'une session de chat - AVEC FETCH DIRECT
   */
  static async updateChatTitle(sessionId: string, newTitle: string): Promise<void> {
    try {
      console.log('✏️ [CHAT-DIRECT] Updating chat title:', sessionId, '→', newTitle);

      const updateData = {
        title: newTitle,
        updated_at: new Date().toISOString()
      };

      const result = await DirectSupabaseService.directUpdate(
        'chat_sessions',
        updateData,
        [{ column: 'id', value: sessionId }]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error updating chat title:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Chat title updated successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception updating chat title:', error);
      throw error;
    }
  }

  /**
   * Archive une session de chat - AVEC FETCH DIRECT
   */
  static async archiveChatSession(sessionId: string): Promise<void> {
    try {
      console.log('📦 [CHAT-DIRECT] Archiving chat session:', sessionId);

      const result = await DirectSupabaseService.directUpdate(
        'chat_sessions',
        {
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        [{ column: 'id', value: sessionId }]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error archiving chat session:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Chat session archived successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception archiving chat session:', error);
      throw error;
    }
  }

  /**
   * Désarchive une session de chat - AVEC FETCH DIRECT
   */
  static async unarchiveChatSession(sessionId: string): Promise<void> {
    try {
      console.log('📤 [CHAT-DIRECT] Unarchiving chat session:', sessionId);

      const result = await DirectSupabaseService.directUpdate(
        'chat_sessions',
        {
          archived_at: null,
          updated_at: new Date().toISOString()
        },
        [{ column: 'id', value: sessionId }]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error unarchiving chat session:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Chat session unarchived successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception unarchiving chat session:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'une session de chat - AVEC FETCH DIRECT
   * @param sessionId - ID de la session
   * @param limit - Nombre de messages à charger (défaut: 20)
   * @param before - Charger les messages avant cette date (pour pagination)
   */
  static async getChatMessages(
    sessionId: string, 
    limit = 20,
    before?: string
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    try {
      console.log('💬 [CHAT-DIRECT] Fetching chat messages:', sessionId, 'limit:', limit, 'before:', before);

      // Construire l'URL avec tri et limit
      const authToken = await DirectSupabaseService.getAuthToken();
      let url = `${DirectSupabaseService.getBaseUrl()}/rest/v1/chat_messages?select=*&session_id=eq.${sessionId}&order=created_at.desc&limit=${limit + 1}`;
      
      // Si on pagine, charger les messages AVANT une date spécifique
      if (before) {
        url += `&created_at=lt.${encodeURIComponent(before)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': DirectSupabaseService.getAnonKey(),
          'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${DirectSupabaseService.getAnonKey()}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [CHAT-DIRECT] Error fetching chat messages:', errorData);
        throw new Error(errorData.message || 'Erreur lors du chargement');
      }

      const data = await response.json();
      const messages = Array.isArray(data) ? data : [];
      
      // Vérifier s'il y a plus de messages
      const hasMore = messages.length > limit;
      
      // Prendre seulement le nombre demandé et inverser pour ordre chronologique
      const limitedMessages = messages.slice(0, limit).reverse();

      console.log(`✅ [CHAT-DIRECT] Found ${limitedMessages.length} messages, hasMore: ${hasMore}`);
      return { messages: limitedMessages, hasMore };
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception fetching chat messages:', error);
      throw error;
    }
  }

  /**
   * Envoie un message dans une session de chat - AVEC FETCH DIRECT
   */
  static async sendMessage(data: CreateMessageData): Promise<ChatMessage> {
    try {
      console.log('📤 [CHAT-DIRECT] Sending message:', data);

      const messageData = {
        session_id: data.session_id,
        role: data.role,
        content: data.content,
        ai_confidence: data.ai_confidence,
        metadata: data.metadata || {},
        reply_to_id: data.reply_to_id
      };

      const result = await DirectSupabaseService.directInsert(
        'chat_messages',
        messageData,
        '*'
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error sending message:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Message sent successfully');
      return result.data;
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception sending message:', error);
      throw error;
    }
  }

  /**
   * Ajoute un participant à un chat partagé - AVEC FETCH DIRECT
   */
  static async addParticipant(sessionId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
    try {
      console.log('👤 [CHAT-DIRECT] Adding participant:', sessionId, userId, role);

      const participantData = {
        chat_session_id: sessionId,
        user_id: userId,
        role: role,
        is_active: true
      };

      // Pour upsert avec fetch direct, on fait d'abord un check puis insert ou update
      const existingResult = await DirectSupabaseService.directSelect(
        'chat_participants',
        'id',
        [
          { column: 'chat_session_id', value: sessionId },
          { column: 'user_id', value: userId }
        ],
        true
      );

      if (existingResult.data) {
        // Update existing
        const result = await DirectSupabaseService.directUpdate(
          'chat_participants',
          participantData,
          [
            { column: 'chat_session_id', value: sessionId },
            { column: 'user_id', value: userId }
          ]
        );

        if (result.error) {
          throw new Error(result.error.message);
        }
      } else {
        // Insert new
        const result = await DirectSupabaseService.directInsert(
          'chat_participants',
          participantData
        );

        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      console.log('✅ [CHAT-DIRECT] Participant added successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception adding participant:', error);
      throw error;
    }
  }

  /**
   * Retire un participant d'un chat partagé - AVEC FETCH DIRECT
   */
  static async removeParticipant(sessionId: string, userId: string): Promise<void> {
    try {
      console.log('👤❌ [CHAT-DIRECT] Removing participant:', sessionId, userId);

      const result = await DirectSupabaseService.directUpdate(
        'chat_participants',
        { is_active: false },
        [
          { column: 'chat_session_id', value: sessionId },
          { column: 'user_id', value: userId }
        ]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error removing participant:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Participant removed successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception removing participant:', error);
      throw error;
    }
  }

  /**
   * Met à jour la date de dernière lecture pour un utilisateur - AVEC FETCH DIRECT
   */
  static async markAsRead(sessionId: string, userId: string): Promise<void> {
    try {
      console.log('👁️ [CHAT-DIRECT] Marking as read:', sessionId, userId);

      const result = await DirectSupabaseService.directUpdate(
        'chat_participants',
        { last_read_at: new Date().toISOString() },
        [
          { column: 'chat_session_id', value: sessionId },
          { column: 'user_id', value: userId }
        ]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error marking as read:', result.error);
        throw new Error(result.error.message);
      }

      console.log('✅ [CHAT-DIRECT] Marked as read successfully');
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception marking as read:', error);
      throw error;
    }
  }

  /**
   * Récupère les chats archivés - AVEC FETCH DIRECT
   */
  static async getArchivedChats(farmId: number): Promise<ChatSession[]> {
    try {
      console.log('📦 [CHAT-DIRECT] Fetching archived chats for farm:', farmId);

      // Note: Pour "NOT NULL", on peut faire une requête différente
      // Comme fetch direct ne supporte pas facilement "not is null", 
      // on fera le filtrage côté client ou on utilise une vue SQL
      
      const result = await DirectSupabaseService.directSelect(
        'chat_sessions_with_info',
        '*',
        [{ column: 'farm_id', value: farmId }]
      );

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] Error fetching archived chats:', result.error);
        throw new Error(result.error.message);
      }

      const sessions = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);
      
      // Filtrer côté client pour avoir seulement les archivés
      const archivedSessions = sessions
        .filter(session => session.archived_at !== null)
        .sort((a, b) => new Date(b.archived_at).getTime() - new Date(a.archived_at).getTime())
        .map(session => ({
          ...session,
          participants: session.participants || []
        }));

      console.log(`✅ [CHAT-DIRECT] Found ${archivedSessions.length} archived chats`);
      return archivedSessions;
      
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception fetching archived chats:', error);
      throw error;
    }
  }

  /**
   * Appel IA avec fetch direct - CORRIGE LES TIMEOUTS
   */
  static async analyzeMessageDirect(
    messageId: string,
    userMessage: string,
    chatSessionId: string,
    farmId?: number
  ): Promise<any> {
    try {
      console.log('🤖 [CHAT-DIRECT] Analyzing message with direct fetch:', userMessage);
      console.log(`🔀 [CHAT-DIRECT] Farm ID: ${farmId} (pour routing méthode)`);

      const result = await DirectSupabaseService.directEdgeFunction('analyze-message', {
        message_id: messageId,
        user_message: userMessage,
        chat_session_id: chatSessionId,
        farm_id: farmId,
        agent_method: 'auto' // Let analyze-message detect method from farm_agent_config
      });

      if (result.error) {
        console.error('❌ [CHAT-DIRECT] AI Analysis failed:', result.error);
        throw new Error(`Erreur analyse IA: ${result.error.message}`);
      }

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Erreur inconnue de l\'IA');
      }

      console.log('✅ [CHAT-DIRECT] AI Analysis completed successfully');
      return result.data;
    } catch (error) {
      console.error('❌ [CHAT-DIRECT] Exception during AI analysis:', error);
      throw error;
    }
  }

  /**
   * Écoute les nouveaux messages en temps réel
   * NOTE: Pour le realtime, on garde le client Supabase car fetch ne supporte pas les websockets
   */
  static subscribeToMessages(sessionId: string, onMessage: (message: ChatMessage) => void) {
    console.log('🔊 [CHAT-DIRECT] Subscribing to messages (using Supabase realtime):', sessionId);
    
    return supabase
      .channel(`chat-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📨 [CHAT-DIRECT] New message received:', payload.new);
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();
  }

  /**
   * Écoute les mises à jour des sessions de chat en temps réel
   * NOTE: Pour le realtime, on garde le client Supabase car fetch ne supporte pas les websockets
   */
  static subscribeToChatSessions(farmId: number, onUpdate: (session: ChatSession) => void) {
    console.log('🔊 [CHAT-DIRECT] Subscribing to chat sessions (using Supabase realtime):', farmId);
    
    return supabase
      .channel(`chat-sessions-${farmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `farm_id=eq.${farmId}`
        },
        async (payload) => {
          console.log('📨 [CHAT-DIRECT] Chat session updated:', payload.new);
          if (payload.new && 'id' in payload.new && payload.new.id) {
            const session = await this.getChatSession(payload.new.id as string);
            if (session) {
              onUpdate(session);
            }
          }
        }
      )
      .subscribe();
  }
}
