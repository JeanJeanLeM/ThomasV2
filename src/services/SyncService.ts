/**
 * Service de synchronisation des messages en attente
 * 
 * Traite la queue locale et synchronise avec le serveur :
 * - Upload des audios vers Supabase Storage
 * - Envoi des messages texte
 * - Transcription des audios
 * - Analyse IA des messages
 */

import { OfflineQueueService, PendingMessage } from './OfflineQueueService';
import { AudioStorageService } from './AudioStorageService';
import { NetworkService } from './NetworkService';
import { ChatServiceDirect } from './ChatServiceDirect';
import { mediaService } from './MediaService';
import { TranscriptionService } from './TranscriptionService';
import { AIChatService } from './aiChatService';

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export interface SyncProgress {
  current: number;
  total: number;
  message: string;
}

export class SyncService {
  private static isSyncing = false;
  private static progressCallback: ((progress: SyncProgress) => void) | null = null;

  /**
   * Définit un callback pour suivre la progression
   */
  static setProgressCallback(callback: (progress: SyncProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Notifie la progression
   */
  private static notifyProgress(current: number, total: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback({ current, total, message });
    }
  }

  /**
   * Synchronise tous les éléments en attente
   */
  static async syncPendingItems(): Promise<SyncResult> {
    // Éviter les synchronisations concurrentes
    if (this.isSyncing) {
      console.warn('⚠️ [SYNC] Synchronisation déjà en cours');
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Synchronisation déjà en cours'],
      };
    }

    // Vérifier la connexion
    const isOnline = await NetworkService.isOnline();
    if (!isOnline) {
      console.warn('⚠️ [SYNC] Pas de connexion Internet');
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Pas de connexion Internet'],
      };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    try {
      const pendingMessages = await OfflineQueueService.getPendingOnly();
      const total = pendingMessages.length;

      console.log(`🔄 [SYNC] Démarrage synchronisation de ${total} messages`);

      if (total === 0) {
        this.isSyncing = false;
        return {
          success: true,
          processed: 0,
          failed: 0,
          errors: [],
        };
      }

      // Traiter chaque message
      for (let i = 0; i < pendingMessages.length; i++) {
        const message = pendingMessages[i];
        
        this.notifyProgress(
          i + 1,
          total,
          message.type === 'audio' 
            ? `Traitement audio ${i + 1}/${total}...`
            : `Envoi message ${i + 1}/${total}...`
        );

        try {
          // Marquer comme en cours de traitement
          await OfflineQueueService.markAsProcessing(message.id);

          const success = await this.syncMessage(message);

          if (success) {
            // Marquer comme complété et retirer de la queue
            await OfflineQueueService.markAsCompleted(message.id);
            processed++;

            // Supprimer le fichier audio local si c'était un audio
            if (message.type === 'audio' && message.audio_uri) {
              await AudioStorageService.deleteAudio(message.audio_uri);
            }
          } else {
            await OfflineQueueService.markAsFailed(
              message.id,
              'Échec de la synchronisation'
            );
            failed++;
            errors.push(`Message ${message.id}: Échec de la synchronisation`);
          }
        } catch (error: any) {
          console.error(`❌ [SYNC] Erreur traitement message ${message.id}:`, error);
          await OfflineQueueService.markAsFailed(
            message.id,
            error.message || 'Erreur inconnue'
          );
          failed++;
          errors.push(`Message ${message.id}: ${error.message || 'Erreur inconnue'}`);
        }
      }

      this.notifyProgress(total, total, 'Synchronisation terminée');

      console.log(`✅ [SYNC] Synchronisation terminée: ${processed} réussis, ${failed} échoués`);

      return {
        success: failed === 0,
        processed,
        failed,
        errors,
      };
    } catch (error: any) {
      console.error('❌ [SYNC] Erreur générale:', error);
      return {
        success: false,
        processed,
        failed,
        errors: [...errors, `Erreur générale: ${error.message}`],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronise un message individuel
   */
  static async syncMessage(message: PendingMessage): Promise<boolean> {
    try {
      if (message.type === 'text') {
        return await this.syncTextMessage(message);
      } else if (message.type === 'audio') {
        return await this.syncAudioMessage(message);
      } else {
        console.error('❌ [SYNC] Type de message inconnu:', message.type);
        return false;
      }
    } catch (error: any) {
      console.error('❌ [SYNC] Erreur sync message:', error);
      return false;
    }
  }

  /**
   * Synchronise un message texte
   */
  private static async syncTextMessage(message: PendingMessage): Promise<boolean> {
    try {
      if (!message.content) {
        throw new Error('Contenu du message manquant');
      }

      // Envoyer le message
      const chatMessage = await ChatServiceDirect.sendMessage({
        session_id: message.session_id,
        role: 'user',
        content: message.content,
      });

      console.log('✅ [SYNC] Message texte envoyé:', chatMessage.id);

      // Lancer l'analyse IA (en arrière-plan, ne pas bloquer)
      // L'analyse se fera automatiquement côté serveur ou via le flux normal
      try {
        await AIChatService.analyzeMessage(
          chatMessage.id,
          message.content || '',
          message.session_id
        );
        console.log('✅ [SYNC] Analyse IA lancée pour message texte');
      } catch (analysisError: any) {
        // Ne pas faire échouer la sync si l'analyse échoue
        console.warn('⚠️ [SYNC] Analyse IA échouée (non bloquant):', analysisError);
      }

      return true;
    } catch (error: any) {
      console.error('❌ [SYNC] Erreur sync message texte:', error);
      return false;
    }
  }

  /**
   * Synchronise un message audio
   */
  private static async syncAudioMessage(message: PendingMessage): Promise<boolean> {
    try {
      if (!message.audio_uri) {
        throw new Error('URI audio manquante');
      }

      // Vérifier que le fichier existe toujours
      const audioExists = await AudioStorageService.audioExists(message.audio_uri);
      if (!audioExists) {
        throw new Error('Fichier audio introuvable');
      }

      // Récupérer l'URI réelle depuis le stockage (nécessaire pour IndexedDB sur web)
      const actualAudioUri = await AudioStorageService.getAudioUri(message.audio_uri);
      if (!actualAudioUri) {
        throw new Error('Impossible de récupérer l\'URI audio depuis le stockage');
      }

      // Uploader l'audio vers Supabase Storage
      const uploadResult = await mediaService.uploadAudioFile(
        actualAudioUri, // Utiliser l'URI réelle récupérée
        message.farm_id,
        message.user_id,
        'chat',
        message.audio_metadata?.duration
      );

      if (!uploadResult.success || !uploadResult.fileUrl || !uploadResult.filePath) {
        throw new Error(uploadResult.error || 'Échec de l\'upload audio');
      }

      console.log('✅ [SYNC] Audio uploadé:', uploadResult.filePath);

      // Transcrire l'audio
      const transcriptionResult = await TranscriptionService.transcribeFromUrl(
        uploadResult.fileUrl,
        'fr',
        uploadResult.filePath
      );

      if (!transcriptionResult.success || !transcriptionResult.text) {
        throw new Error(
          transcriptionResult.error || 'Échec de la transcription'
        );
      }

      const transcribedText = transcriptionResult.text;
      console.log('✅ [SYNC] Audio transcrit:', transcribedText.substring(0, 50) + '...');

      // Créer le message avec le texte transcrit
      const chatMessage = await ChatServiceDirect.sendMessage({
        session_id: message.session_id,
        role: 'user',
        content: transcribedText,
        metadata: {
          audio_file_id: uploadResult.audioFileId,
          audio_url: uploadResult.fileUrl,
          transcription_duration: transcriptionResult.duration,
        },
      });

      console.log('✅ [SYNC] Message audio créé:', chatMessage.id);

      // Lancer l'analyse IA
      try {
        const analysisResult = await AIChatService.analyzeMessage(
          chatMessage.id,
          transcribedText,
          message.session_id
        );
        console.log('✅ [SYNC] Analyse IA terminée:', {
          actions: analysisResult.actions?.length || 0,
          confidence: analysisResult.confidence
        });

        // Créer un message assistant avec les résultats de l'analyse
        const actionsCount = analysisResult.actions?.length || 0;
        const aiResponseText = actionsCount > 0 
          ? `Parfait ! J'ai identifié ${actionsCount} action${actionsCount > 1 ? 's' : ''} dans votre message vocal.`
          : `J'ai bien noté votre message.`;

        // Préparer les actions avec leurs données
        const actionsWithData = (analysisResult.actions || []).map((action: any) => {
          // Récupérer extracted_data
          const extractedData = action.extracted_data || action.action_data?.extracted_data || {};
          
          // Si la date est dans action_data.date mais pas dans extracted_data.date, l'ajouter
          // (car TaskPlannedTool stocke la date directement dans action_data.date)
          if (action.action_data?.date && !extractedData.date) {
            extractedData.date = action.action_data.date;
            console.log(`📅 [SYNC] Date ajoutée depuis action_data.date: ${extractedData.date}`);
          }
          
          return {
            ...action,
            extracted_data: extractedData,
            decomposed_text: action.decomposed_text || action.action_data?.decomposed_text || action.original_text,
            original_text: action.original_text || action.action_data?.original_text,
            matched_entities: action.matched_entities || action.action_data?.context || {},
          };
        });

        // Créer le message assistant avec les actions dans metadata
        await ChatServiceDirect.sendMessage({
          session_id: message.session_id,
          role: 'assistant',
          content: aiResponseText,
          ai_confidence: analysisResult.confidence,
          metadata: {
            analysis_id: analysisResult.analysis_id,
            actions_count: actionsCount,
            actions: actionsWithData, // Inclure les actions complètes
            has_actions: actionsCount > 0,
            processing_time_ms: analysisResult.processing_time_ms
          }
        });

        console.log('✅ [SYNC] Message assistant créé avec actions');

        // Créer automatiquement les tâches/observations pour chaque action
        if (actionsWithData && actionsWithData.length > 0) {
          console.log(`🔨 [SYNC] Création automatique de ${actionsWithData.length} tâches/observations...`);
          
          for (const action of actionsWithData) {
            try {
              if (action.action_type === 'task_done' || action.action_type === 'task_planned' || action.action_type === 'harvest') {
                const taskId = await AIChatService.createTaskFromAction(
                  action,
                  message.farm_id,
                  message.user_id
                );
                console.log(`✅ [SYNC] Tâche créée: ${taskId} pour action ${action.action_type}`);
              } else if (action.action_type === 'observation') {
                await AIChatService.createObservationFromAction(
                  action,
                  message.farm_id,
                  message.user_id
                );
                console.log(`✅ [SYNC] Observation créée pour action observation`);
              }
            } catch (error: any) {
              console.warn(`⚠️ [SYNC] Impossible de créer l'action ${action.action_type}:`, error?.message || error);
              // Ne pas faire échouer toute la sync pour une action
            }
          }
        }
      } catch (analysisError: any) {
        // Ne pas faire échouer la sync si l'analyse échoue
        console.warn('⚠️ [SYNC] Analyse IA échouée (non bloquant):', analysisError);
      }

      return true;
    } catch (error: any) {
      console.error('❌ [SYNC] Erreur sync message audio:', error);
      return false;
    }
  }

  /**
   * Réessaie les messages échoués
   */
  static async retryFailedItems(): Promise<SyncResult> {
    try {
      const failedMessages = await OfflineQueueService.getFailedMessages();
      
      // Réinitialiser le statut pour permettre le retry
      for (const message of failedMessages) {
        await OfflineQueueService.retryMessage(message.id);
      }

      // Lancer la synchronisation
      return await this.syncPendingItems();
    } catch (error: any) {
      console.error('❌ [SYNC] Erreur retry failed items:', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [error.message || 'Erreur inconnue'],
      };
    }
  }

  /**
   * Vérifie si une synchronisation est en cours
   */
  static isSyncingNow(): boolean {
    return this.isSyncing;
  }
}
