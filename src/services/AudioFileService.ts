import { DirectSupabaseService } from './DirectSupabaseService';

export interface AudioFileData {
  id?: string;
  farm_id: number;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  duration_seconds?: number;
  transcription?: string;
  transcription_language?: string;
  transcription_confidence?: number;
  chat_message_id?: string;
  is_active?: boolean;
}

export interface CreateAudioFileResult {
  success: boolean;
  audioFileId?: string;
  error?: string;
}

/**
 * Service pour gérer les fichiers audio dans la base de données
 */
export class AudioFileService {
  
  /**
   * Créer un enregistrement de fichier audio dans la table audio_files
   */
  static async createAudioFile(
    data: AudioFileData
  ): Promise<CreateAudioFileResult> {
    try {
      console.log('💾 [AUDIO-FILE] Création enregistrement audio:', {
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size,
        mime_type: data.mime_type,
      });

      const audioFileData = {
        farm_id: data.farm_id,
        user_id: data.user_id,
        file_name: data.file_name,
        file_path: data.file_path,
        file_size: data.file_size,
        mime_type: data.mime_type,
        duration_seconds: data.duration_seconds || null,
        transcription: data.transcription || null,
        transcription_language: data.transcription_language || 'fr',
        transcription_confidence: data.transcription_confidence || null,
        chat_message_id: data.chat_message_id || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      };

      const result = await DirectSupabaseService.directInsert(
        'audio_files',
        audioFileData
      );

      if (result.error || !result.data || !result.data.id) {
        console.error('❌ [AUDIO-FILE] Erreur insertion:', result.error);
        throw new Error(result.error?.message || 'Impossible de créer l\'enregistrement audio');
      }

      console.log('✅ [AUDIO-FILE] Enregistrement audio créé:', result.data.id);

      return {
        success: true,
        audioFileId: result.data.id,
      };

    } catch (error: any) {
      console.error('❌ [AUDIO-FILE] Erreur création enregistrement:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de l\'enregistrement audio',
      };
    }
  }

  /**
   * Mettre à jour un fichier audio (par exemple, ajouter la transcription)
   */
  static async updateAudioFile(
    audioFileId: string,
    updates: Partial<AudioFileData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 [AUDIO-FILE] Mise à jour enregistrement audio:', audioFileId);

      const updateData: any = {};
      
      if (updates.transcription !== undefined) {
        updateData.transcription = updates.transcription;
      }
      if (updates.transcription_language !== undefined) {
        updateData.transcription_language = updates.transcription_language;
      }
      if (updates.transcription_confidence !== undefined) {
        updateData.transcription_confidence = updates.transcription_confidence;
      }
      if (updates.duration_seconds !== undefined) {
        updateData.duration_seconds = updates.duration_seconds;
      }
      if (updates.chat_message_id !== undefined) {
        updateData.chat_message_id = updates.chat_message_id;
      }
      if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
      }

      await DirectSupabaseService.directUpdate(
        'audio_files',
        updateData,
        [{ column: 'id', value: audioFileId }]
      );

      console.log('✅ [AUDIO-FILE] Enregistrement audio mis à jour');

      return { success: true };

    } catch (error: any) {
      console.error('❌ [AUDIO-FILE] Erreur mise à jour:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour de l\'enregistrement audio',
      };
    }
  }

  /**
   * Récupérer un fichier audio par son ID
   */
  static async getAudioFile(audioFileId: string): Promise<AudioFileData | null> {
    try {
      const result = await DirectSupabaseService.directSelect(
        'audio_files',
        [{ column: 'id', value: audioFileId }],
        { limit: 1 }
      );

      if (!result || result.length === 0) {
        return null;
      }

      return result[0] as AudioFileData;

    } catch (error: any) {
      console.error('❌ [AUDIO-FILE] Erreur récupération:', error);
      return null;
    }
  }

  /**
   * Supprimer un fichier audio (soft delete)
   */
  static async deleteAudioFile(audioFileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await DirectSupabaseService.directUpdate(
        'audio_files',
        { is_active: false },
        [{ column: 'id', value: audioFileId }]
      );

      console.log('✅ [AUDIO-FILE] Fichier audio supprimé (soft delete)');

      return { success: true };

    } catch (error: any) {
      console.error('❌ [AUDIO-FILE] Erreur suppression:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du fichier audio',
      };
    }
  }
}

export const audioFileService = new AudioFileService();
