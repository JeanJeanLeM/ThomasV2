/**
 * Service d'intégration Chat + Thomas Agent
 * Combine ChatServiceDirect (création chat fiable) avec ThomasAgentService (IA)
 * 
 * CORRIGE les timeouts ET intègre l'agent intelligent
 */

import { ChatServiceDirect } from './ChatServiceDirect';
import { ThomasAgentService } from './ThomasAgentService';
import { supabase } from '../utils/supabase';

export interface IntegratedChatSession {
  session: any;
  agentEnabled: boolean;
  lastAnalysis?: any;
}

export interface ChatWithAIResponse {
  userMessage: any;
  aiResponse?: any;
  actions?: any[];
  session: any;
}

export class ChatIntegrationService {
  
  /**
   * Crée un chat avec agent IA intégré - SANS TIMEOUTS !
   */
  static async createChatWithAgent(data: {
    farm_id: number;
    title: string;
    description?: string;
    enableAI?: boolean;
  }): Promise<IntegratedChatSession> {
    try {
      console.log('🤖💬 [CHAT-INTEGRATION] Creating chat with AI agent:', data.title);

      // 1. Créer chat avec fetch direct (pas de timeout)
      const session = await ChatServiceDirect.createChatSession({
        farm_id: data.farm_id,
        title: data.title,
        description: data.description,
        chat_type: data.enableAI ? 'ai_assistant' : 'general',
        is_shared: false
      });

      console.log('✅ [CHAT-INTEGRATION] Chat created:', session.id);

      // 2. Si IA activée, envoyer message de bienvenue
      if (data.enableAI !== false) {
        const welcomeMessage = await ChatServiceDirect.sendMessage({
          session_id: session.id,
          role: 'assistant',
          content: `🌾 Bonjour ! Je suis Thomas, votre assistant agricole intelligent.\n\nJe peux vous aider à :\n• 📝 Créer des observations\n• ✅ Enregistrer vos tâches\n• 📅 Planifier vos activités\n• 🌱 Gérer vos récoltes\n• ❓ Répondre à vos questions\n\nDites-moi ce que vous avez fait aujourd'hui !`,
          ai_confidence: 1.0,
          metadata: { type: 'welcome', agent_version: '2.0' }
        });

        console.log('👋 [CHAT-INTEGRATION] Welcome message sent');
      }

      const integratedSession: IntegratedChatSession = {
        session,
        agentEnabled: data.enableAI !== false,
        lastAnalysis: null
      };

      console.log('🎉 [CHAT-INTEGRATION] Integrated chat created successfully');
      return integratedSession;

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error creating integrated chat:', error);
      throw error;
    }
  }

  /**
   * Envoie message utilisateur avec analyse IA automatique
   */
  static async sendMessageWithAI(
    sessionId: string,
    userMessage: string,
    farmId: number
  ): Promise<ChatWithAIResponse> {
    try {
      console.log('💬🤖 [CHAT-INTEGRATION] Processing message with AI:', userMessage);

      // 1. Enregistrer message utilisateur avec fetch direct
      const userMsgRecord = await ChatServiceDirect.sendMessage({
        session_id: sessionId,
        role: 'user',
        content: userMessage
      });

      console.log('✅ [CHAT-INTEGRATION] User message saved:', userMsgRecord.id);

      // 2. Analyser avec Thomas Agent (notre système IA)
      console.log('🧠 [CHAT-INTEGRATION] Analyzing with Thomas Agent...');
      
      const agentResponse = await ThomasAgentService.processMessage(
        userMessage,
        {
          user_id: userMsgRecord.user_id || 'unknown',
          farm_id: farmId,
          session_id: sessionId,
          message_id: userMsgRecord.id
        }
      );

      console.log('🎯 [CHAT-INTEGRATION] Agent analysis completed:', {
        actions: agentResponse.actions?.length || 0,
        confidence: agentResponse.confidence
      });

      // 3. Enregistrer réponse IA avec fetch direct
      const aiMsgRecord = await ChatServiceDirect.sendMessage({
        session_id: sessionId,
        role: 'assistant',
        content: agentResponse.response,
        ai_confidence: agentResponse.confidence,
        metadata: {
          analysis_id: agentResponse.analysis_id,
          actions_count: agentResponse.actions?.length || 0,
          processing_time: agentResponse.processing_time_ms
        }
      });

      console.log('✅ [CHAT-INTEGRATION] AI response saved:', aiMsgRecord.id);

      // 4. Récupérer session mise à jour
      const updatedSession = await ChatServiceDirect.getChatSession(sessionId);

      const response: ChatWithAIResponse = {
        userMessage: userMsgRecord,
        aiResponse: aiMsgRecord,
        actions: agentResponse.actions || [],
        session: updatedSession
      };

      console.log('🎉 [CHAT-INTEGRATION] Message processed successfully');
      return response;

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error processing message with AI:', error);
      throw error;
    }
  }

  /**
   * Valide une action proposée par l'IA
   */
  static async validateAIAction(
    actionId: string,
    sessionId: string,
    approved: boolean,
    modifications?: any
  ): Promise<void> {
    try {
      console.log('✅❌ [CHAT-INTEGRATION] Validating AI action:', actionId, approved);

      // 1. Valider via Thomas Agent Service
      if (approved) {
        await ThomasAgentService.validateAction(actionId, modifications);
      } else {
        await ThomasAgentService.rejectAction(actionId);
      }

      // 2. Envoyer message de confirmation avec fetch direct
      const confirmationMessage = approved 
        ? `✅ Action validée et créée avec succès !${modifications ? ' (avec modifications)' : ''}`
        : '❌ Action rejetée.';

      await ChatServiceDirect.sendMessage({
        session_id: sessionId,
        role: 'assistant',
        content: confirmationMessage,
        ai_confidence: 1.0,
        metadata: { 
          type: 'action_validation', 
          action_id: actionId, 
          approved,
          has_modifications: !!modifications
        }
      });

      console.log('✅ [CHAT-INTEGRATION] Action validation completed');

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error validating AI action:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique du chat avec contexte IA
   */
  static async getChatHistory(sessionId: string): Promise<{
    messages: any[];
    aiSummary?: string;
    actionsSummary: {
      total: number;
      validated: number;
      pending: number;
      rejected: number;
    };
  }> {
    try {
      console.log('📖 [CHAT-INTEGRATION] Fetching chat history:', sessionId);

      // 1. Récupérer messages avec fetch direct
      const messages = await ChatServiceDirect.getChatMessages(sessionId);

      // 2. Analyser les actions IA dans les métadonnées
      let totalActions = 0;
      let validatedActions = 0;
      let pendingActions = 0;
      let rejectedActions = 0;

      const aiMessages = messages.filter(msg => 
        msg.role === 'assistant' && 
        msg.metadata?.analysis_id
      );

      for (const aiMsg of aiMessages) {
        if (aiMsg.metadata?.actions_count) {
          totalActions += aiMsg.metadata.actions_count;
          
          // Récupérer statut des actions (simplification)
          // En réalité, il faudrait query les analyzed_actions
          pendingActions += aiMsg.metadata.actions_count;
        }
      }

      // 3. Générer résumé IA (optionnel)
      let aiSummary = null;
      if (aiMessages.length > 0) {
        const lastAI = aiMessages[aiMessages.length - 1];
        aiSummary = `💡 Session avec ${aiMessages.length} analyses IA. Dernière analyse: ${lastAI.created_at}`;
      }

      console.log('✅ [CHAT-INTEGRATION] Chat history fetched:', {
        total_messages: messages.length,
        ai_messages: aiMessages.length,
        total_actions: totalActions
      });

      return {
        messages,
        aiSummary,
        actionsSummary: {
          total: totalActions,
          validated: validatedActions,
          pending: pendingActions,
          rejected: rejectedActions
        }
      };

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error fetching chat history:', error);
      throw error;
    }
  }

  /**
   * Active/désactive l'IA pour un chat existant
   */
  static async toggleAIForChat(sessionId: string, enableAI: boolean): Promise<void> {
    try {
      console.log('🔄 [CHAT-INTEGRATION] Toggling AI for chat:', sessionId, enableAI);

      // 1. Mettre à jour type de chat avec fetch direct
      await ChatServiceDirect.updateChatSession(sessionId, {
        chat_type: enableAI ? 'ai_assistant' : 'general'
      });

      // 2. Envoyer message de notification
      const notificationMessage = enableAI
        ? '🤖 Assistant IA Thomas activé ! Je vais maintenant analyser vos messages.'
        : '💬 Mode chat simple activé. L\'IA ne analysera plus vos messages.';

      await ChatServiceDirect.sendMessage({
        session_id: sessionId,
        role: 'system',
        content: notificationMessage,
        metadata: { type: 'ai_toggle', ai_enabled: enableAI }
      });

      console.log('✅ [CHAT-INTEGRATION] AI toggle completed');

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error toggling AI:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'utilisation IA pour un utilisateur
   */
  static async getAIUsageStats(userId: string, farmId: number): Promise<{
    totalChats: number;
    aiEnabledChats: number;
    totalMessages: number;
    aiResponses: number;
    actionsProposed: number;
    actionsValidated: number;
    avgConfidence: number;
  }> {
    try {
      console.log('📊 [CHAT-INTEGRATION] Fetching AI usage stats:', userId);

      // 1. Récupérer chats de l'utilisateur avec fetch direct
      const sessions = await ChatServiceDirect.getChatSessions(farmId);
      const userSessions = sessions.filter(s => s.user_id === userId);

      // 2. Compter les stats
      const totalChats = userSessions.length;
      const aiEnabledChats = userSessions.filter(s => s.chat_type === 'ai_assistant').length;

      // 3. Analyser les messages pour stats détaillées
      let totalMessages = 0;
      let aiResponses = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (const session of userSessions) {
        const messages = await ChatServiceDirect.getChatMessages(session.id);
        totalMessages += messages.length;
        
        const aiMsgs = messages.filter(m => m.role === 'assistant');
        aiResponses += aiMsgs.length;

        aiMsgs.forEach(msg => {
          if (msg.ai_confidence) {
            totalConfidence += msg.ai_confidence;
            confidenceCount++;
          }
        });
      }

      const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

      // 4. Récupérer stats actions depuis ThomasAgentService
      const agentStats = await ThomasAgentService.getUserStats(userId);

      const stats = {
        totalChats,
        aiEnabledChats,
        totalMessages,
        aiResponses,
        actionsProposed: agentStats?.total_actions || 0,
        actionsValidated: agentStats?.validated_actions || 0,
        avgConfidence
      };

      console.log('✅ [CHAT-INTEGRATION] AI usage stats fetched:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [CHAT-INTEGRATION] Error fetching AI usage stats:', error);
      throw error;
    }
  }

  /**
   * Écoute les nouveaux messages et déclenche l'IA automatiquement
   */
  static subscribeToAIChat(
    sessionId: string,
    farmId: number,
    onNewMessage: (message: any) => void,
    onAIResponse: (response: any) => void
  ) {
    console.log('🔊 [CHAT-INTEGRATION] Subscribing to AI chat:', sessionId);

    return ChatServiceDirect.subscribeToMessages(sessionId, async (message) => {
      try {
        console.log('📨 [CHAT-INTEGRATION] New message received:', message.role);
        
        onNewMessage(message);

        // Si c'est un message utilisateur, déclencher IA automatiquement
        if (message.role === 'user') {
          console.log('🤖 [CHAT-INTEGRATION] Auto-triggering AI analysis...');
          
          const aiResponse = await this.sendMessageWithAI(
            sessionId,
            message.content,
            farmId
          );

          onAIResponse(aiResponse);
        }

      } catch (error) {
        console.error('❌ [CHAT-INTEGRATION] Error in AI chat subscription:', error);
      }
    });
  }
}

export default ChatIntegrationService;
