import { DirectSupabaseService } from './DirectSupabaseService';

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  error?: string;
}

/**
 * Service de transcription audio via Whisper API
 */
export class TranscriptionService {
  
  /**
   * Transcrire un fichier audio depuis une URL Supabase ou un chemin Storage
   * Utilise l'Edge Function pour la sécurité (ne pas exposer la clé OpenAI côté client)
   * 
   * @param audioUrl URL publique de l'audio
   * @param language Langue de l'audio (défaut: 'fr')
   * @param filePath Chemin Storage (prioritaire sur audioUrl)
   * @param productNames Noms de produits phytosanitaires pour améliorer la transcription Whisper
   */
  static async transcribeFromUrl(
    audioUrl: string,
    language: string = 'fr',
    filePath?: string,
    productNames?: string[]
  ): Promise<TranscriptionResult> {
    try {
      console.log('🎙️ [TRANSCRIPTION] Démarrage transcription');
      console.log('📁 [TRANSCRIPTION] filePath:', filePath || 'NON FOURNI');
      console.log('🔗 [TRANSCRIPTION] audioUrl:', audioUrl || 'NON FOURNI');
      console.log('🌍 [TRANSCRIPTION] language:', language);
      const startTime = Date.now();

      // Préparer les paramètres pour l'Edge Function
      const params: any = filePath
        ? { filePath, language } // Utiliser le chemin Storage (recommandé)
        : { audioUrl, language }; // Fallback sur l'URL publique
      
      // Ajouter les noms de produits si fournis (pour améliorer la transcription Whisper)
      if (productNames && productNames.length > 0) {
        params.productNames = productNames;
        console.log('🌿 [TRANSCRIPTION] Noms de produits ajoutés:', productNames.length);
      }

      console.log('📤 [TRANSCRIPTION] Paramètres envoyés à l\'Edge Function:', {
        hasFilePath: !!filePath,
        hasAudioUrl: !!audioUrl,
        language,
        hasProductNames: !!productNames && productNames.length > 0,
        productNamesCount: productNames?.length || 0,
      });

      // Appeler l'Edge Function de transcription
      const response = await DirectSupabaseService.directEdgeFunction(
        'transcribe-audio',
        params
      );

      const duration = Date.now() - startTime;
      console.log('⏱️ [TRANSCRIPTION] Durée appel Edge Function:', duration, 'ms');

      if (response.error) {
        console.error('❌ [TRANSCRIPTION] Erreur Edge Function:', {
          message: response.error?.message,
          code: response.error?.code,
          fullError: response.error,
        });
        return {
          success: false,
          error: response.error?.message || 'Erreur de transcription',
        };
      }

      if (!response.data) {
        console.error('❌ [TRANSCRIPTION] Pas de données dans la réponse');
        return {
          success: false,
          error: 'Aucune donnée reçue de l\'Edge Function',
        };
      }

      // La réponse de l'Edge Function est dans response.data
      const transcriptionData = response.data;
      console.log('📦 [TRANSCRIPTION] Réponse Edge Function:', {
        success: transcriptionData.success,
        hasText: !!transcriptionData.text,
        textLength: transcriptionData.text?.length || 0,
        error: transcriptionData.error,
      });

      if (!transcriptionData.success) {
        console.error('❌ [TRANSCRIPTION] Échec dans les données:', transcriptionData.error);
        return {
          success: false,
          error: transcriptionData.error || 'Erreur de transcription',
        };
      }

      if (!transcriptionData.text) {
        console.warn('⚠️ [TRANSCRIPTION] Transcription réussie mais texte vide');
        return {
          success: false,
          error: 'Transcription vide - l\'audio pourrait être silencieux ou inaudible',
        };
      }

      console.log('✅ [TRANSCRIPTION] Réussie en', duration, 'ms');
      console.log('📝 [TRANSCRIPTION] Texte (premiers 100 caractères):', transcriptionData.text.substring(0, 100));
      console.log('📊 [TRANSCRIPTION] Longueur texte:', transcriptionData.text.length, 'caractères');

      return {
        success: true,
        text: transcriptionData.text,
        language: transcriptionData.language || language,
        duration,
      };

    } catch (error: any) {
      console.error('❌ [TRANSCRIPTION] Exception:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return {
        success: false,
        error: error.message || 'Erreur lors de la transcription',
      };
    }
  }

  /**
   * Transcrire un fichier audio local
   * (Upload puis transcription)
   */
  static async transcribeAudioFile(
    audioUri: string,
    language: string = 'fr'
  ): Promise<TranscriptionResult> {
    try {
      console.log('🎙️ [TRANSCRIPTION] Transcription depuis fichier local:', audioUri);

      // Pour l'instant, on pourrait uploader le fichier puis transcrire
      // Mais comme on upload déjà l'audio dans ChatConversation,
      // on utilisera transcribeFromUrl directement
      
      return {
        success: false,
        error: 'Utilisez transcribeFromUrl après avoir uploadé le fichier',
      };

    } catch (error: any) {
      console.error('❌ [TRANSCRIPTION] Erreur:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la transcription',
      };
    }
  }

  /**
   * Vérifier si un texte nécessite une correction/amélioration
   */
  static shouldImproveText(text: string): boolean {
    // Critères pour améliorer le texte transcrit :
    // - Trop court (possiblement incomplet)
    // - Contient beaucoup d'erreurs apparentes
    const length = text.trim().length;
    return length < 5 || length > 1000;
  }

  /**
   * Estimer le coût de transcription
   * Whisper API: $0.006 / minute
   */
  static estimateCost(durationSeconds: number): number {
    const durationMinutes = durationSeconds / 60;
    return durationMinutes * 0.006;
  }
}

export const transcriptionService = new TranscriptionService();
