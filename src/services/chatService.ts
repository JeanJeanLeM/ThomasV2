import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from './DirectSupabaseService';

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

export class ChatService {
  
  /**
   * Test de connectivité Supabase
   */
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 Testing Supabase connection...');

      // Test simple via API directe (bypass client JS)
      const { error } = await DirectSupabaseService.directSelect(
        'farms',
        'id',
        undefined,
        true
      );

      if (error) {
        console.error('❌ Supabase connection test failed (Direct API):', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Supabase connection test successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Récupère toutes les sessions de chat pour une ferme et un utilisateur
   */
  static async getChatSessions(farmId: number): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions_with_info')
        .select('*')
        .eq('farm_id', farmId)
        .is('archived_at', null)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      return sessions.map(session => ({
        ...session,
        participants: session.participants || []
      }));
      
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      throw error;
    }
  }

  /**
   * Récupère une session de chat spécifique
   */
  static async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const { data: session, error } = await supabase
        .from('chat_sessions_with_info')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!session) return null;

      return {
        ...session,
        participants: session.participants || []
      };
      
    } catch (error) {
      console.error('Error fetching chat session:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle session de chat
   */
  static async createChatSession(data: CreateChatSessionData): Promise<ChatSession> {
    try {
      console.log('🎯 ChatService.createChatSession - Start', data);

      // Vérifier l'utilisateur authentifié
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Auth error:', userError);
        throw new Error(`Erreur d'authentification: ${userError.message}`);
      }
      if (!user) {
        console.error('❌ No authenticated user');
        throw new Error('Utilisateur non authentifié');
      }

      console.log('✅ Authenticated user:', user.id);

      // Créer la session de chat
      const sessionData = {
        farm_id: data.farm_id,
        user_id: user.id, // Ajout du user_id manquant
        title: data.title,
        description: data.description,
        chat_type: data.chat_type || 'general',
        is_shared: data.is_shared || false,
        status: 'active'
      };

      console.log('📝 Inserting session data:', sessionData);

      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('✅ Session created:', session);

      // Si c'est un chat partagé avec des participants spécifiés
      if (data.is_shared && data.participant_user_ids && data.participant_user_ids.length > 0) {
        console.log('👥 Adding participants:', data.participant_user_ids);
        
        const participants = data.participant_user_ids.map(userId => ({
          chat_session_id: session.id,
          user_id: userId,
          role: 'member' as const
        }));

        const { error: participantsError } = await supabase
          .from('chat_participants')
          .insert(participants);

        if (participantsError) {
          console.error('❌ Error adding participants:', participantsError);
          // Ne pas échouer la création du chat si l'ajout des participants échoue
        } else {
          console.log('✅ Participants added successfully');
        }
      }

      // Récupérer la session complète
      console.log('🔍 Fetching full session...');
      const fullSession = await this.getChatSession(session.id);
      if (!fullSession) {
        console.error('❌ Failed to retrieve created session');
        throw new Error('Failed to retrieve created session');
      }

      console.log('✅ ChatService.createChatSession - Success', fullSession);
      return fullSession;
      
    } catch (error) {
      console.error('❌ ChatService.createChatSession - Error:', error);
      throw error;
    }
  }

  /**
   * Met à jour une session de chat
   */
  static async updateChatSession(
    sessionId: string, 
    updates: Partial<Pick<ChatSession, 'title' | 'description' | 'status'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error updating chat session:', error);
      throw error;
    }
  }

  /**
   * Archive une session de chat
   */
  static async archiveChatSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error archiving chat session:', error);
      throw error;
    }
  }

  /**
   * Désarchive une session de chat
   */
  static async unarchiveChatSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error unarchiving chat session:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'une session de chat
   */
  static async getChatMessages(sessionId: string, limit = 100): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return messages || [];
      
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  /**
   * Envoie un message dans une session de chat
   */
  static async sendMessage(data: CreateMessageData): Promise<ChatMessage> {
    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: data.session_id,
          role: data.role,
          content: data.content,
          ai_confidence: data.ai_confidence,
          metadata: data.metadata || {},
          reply_to_id: data.reply_to_id
        })
        .select()
        .single();

      if (error) throw error;

      return message;
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Ajoute un participant à un chat partagé
   */
  static async addParticipant(sessionId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .upsert({
          chat_session_id: sessionId,
          user_id: userId,
          role: role,
          is_active: true
        });

      if (error) throw error;
      
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Retire un participant d'un chat partagé
   */
  static async removeParticipant(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_active: false })
        .eq('chat_session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Met à jour la date de dernière lecture pour un utilisateur
   */
  static async markAsRead(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
      
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Récupère les chats archivés
   */
  static async getArchivedChats(farmId: number): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions_with_info')
        .select('*')
        .eq('farm_id', farmId)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) throw error;

      return sessions.map(session => ({
        ...session,
        participants: session.participants || []
      }));
      
    } catch (error) {
      console.error('Error fetching archived chats:', error);
      throw error;
    }
  }

  /**
   * Écoute les nouveaux messages en temps réel
   */
  static subscribeToMessages(sessionId: string, onMessage: (message: ChatMessage) => void) {
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
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();
  }

  /**
   * Écoute les mises à jour des sessions de chat en temps réel
   */
  static subscribeToChatSessions(farmId: number, onUpdate: (session: ChatSession) => void) {
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
