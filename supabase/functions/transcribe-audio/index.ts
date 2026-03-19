import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { agricultureGlossary, normalizeGlossaryTerms } from '../../../shared/agricultureGlossary.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎙️ [TRANSCRIBE] Démarrage transcription audio');

    const { audioUrl, filePath, language = 'fr', productNames, vocabularyTerms } = await req.json();

    if (!audioUrl && !filePath) {
      throw new Error('audioUrl ou filePath est requis');
    }

    // Créer le client Supabase pour accéder à Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante dans l\'Edge Function');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let audioBlob: Blob;
    let mimeType: string = 'audio/webm';

    if (filePath) {
      // Utiliser le chemin pour télécharger depuis Storage
      console.log('📥 [TRANSCRIBE] Téléchargement audio depuis Storage:', filePath);
      
      const { data, error } = await supabase.storage
        .from('photos')
        .download(filePath);

      if (error || !data) {
        console.error('❌ [TRANSCRIBE] Erreur téléchargement Storage:', error);
        throw new Error(`Impossible de télécharger l'audio depuis Storage: ${error?.message || 'Erreur inconnue'}`);
      }

      // Vérifier que le blob est valide
      if (!(data instanceof Blob)) {
        console.error('❌ [TRANSCRIBE] Données téléchargées ne sont pas un Blob:', typeof data);
        throw new Error('Format de données invalide depuis Storage');
      }

      audioBlob = data;
      console.log('✅ [TRANSCRIBE] Audio téléchargé depuis Storage:', {
        size: audioBlob.size,
        type: audioBlob.type,
        filePath: filePath
      });
      
      // Vérifier que le fichier n'est pas vide
      if (audioBlob.size === 0) {
        throw new Error('Le fichier audio téléchargé est vide');
      }
      
      // Vérifier les magic bytes pour valider le format du fichier
      const firstBytes = new Uint8Array(await audioBlob.slice(0, 12).arrayBuffer());
      const hexSignature = Array.from(firstBytes.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      
      console.log('🔍 [TRANSCRIBE] Magic bytes du fichier:', hexSignature);
      
      // Détecter AMR-NB (audio/3gpp) qui n'est PAS supporté par Whisper
      // AMR-NB commence par "#!AMR" (23 21 41 4D 52)
      if (hexSignature.startsWith('2321414D')) {
        console.error('❌ [TRANSCRIBE] Fichier détecté comme AMR-NB (audio/3gpp) - NON SUPPORTÉ par Whisper');
        throw new Error('Format audio AMR-NB (3gpp) non supporté. Veuillez réenregistrer avec AAC/M4A.');
      }
      
      // Déterminer le type MIME depuis l'extension du fichier (priorité sur le type du blob)
      if (filePath.endsWith('.webm')) {
        mimeType = 'audio/webm';
      } else if (filePath.endsWith('.m4a') || filePath.endsWith('.mp4')) {
        // Vérifier si c'est vraiment un fichier MP4/M4A (magic bytes: 00 00 00 XX 66 74 79 70)
        if (hexSignature.startsWith('000000') || hexSignature.includes('66747970')) {
          mimeType = 'audio/mp4'; // Whisper préfère audio/mp4 pour les fichiers m4a
          console.log('✅ [TRANSCRIBE] Fichier MP4/M4A valide détecté');
        } else {
          console.warn('⚠️ [TRANSCRIBE] Magic bytes ne correspondent pas à MP4/M4A, utilisation du type par défaut');
          mimeType = 'audio/mp4';
        }
      } else if (filePath.endsWith('.wav')) {
        // WAV: 52 49 46 46 (RIFF)
        if (hexSignature.startsWith('52494646')) {
          mimeType = 'audio/wav';
          console.log('✅ [TRANSCRIBE] Fichier WAV valide détecté');
        } else {
          mimeType = 'audio/wav';
        }
      } else if (filePath.endsWith('.mp3')) {
        // MP3: FF FB ou FF F3 ou 49 44 33 (ID3)
        if (hexSignature.startsWith('FFFB') || hexSignature.startsWith('FFF3') || hexSignature.startsWith('494433')) {
          mimeType = 'audio/mpeg';
          console.log('✅ [TRANSCRIBE] Fichier MP3 valide détecté');
        } else {
          mimeType = 'audio/mpeg';
        }
      } else {
        // Utiliser le type du blob si l'extension n'est pas reconnue
        mimeType = audioBlob.type || 'audio/mp4';
      }
      
      console.log('📝 [TRANSCRIBE] Type MIME déterminé:', mimeType, '(depuis extension:', filePath.split('.').pop(), ')');
    } else {
      // Fallback: télécharger depuis l'URL publique
      console.log('📥 [TRANSCRIBE] Téléchargement audio depuis URL:', audioUrl);

      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Impossible de télécharger l'audio: ${audioResponse.statusText}`);
      }

      audioBlob = await audioResponse.blob();
      mimeType = audioBlob.type || 'audio/webm';
      console.log('✅ [TRANSCRIBE] Audio téléchargé depuis URL:', audioBlob.size, 'bytes', mimeType);
    }

    // Vérifier la taille (limite Whisper: 25 MB)
    if (audioBlob.size > 25 * 1024 * 1024) {
      throw new Error('Le fichier audio est trop volumineux (max 25 MB)');
    }

    // Déterminer le nom de fichier selon l'extension du fichier source
    // Whisper API supporte: mp3, mp4, mpeg, mpga, m4a, wav, webm
    // IMPORTANT: Le nom de fichier doit correspondre à l'extension réelle du fichier
    let audioFileName = 'audio.m4a';
    
    // Utiliser l'extension du fichier source si disponible
    if (filePath) {
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (extension && ['webm', 'm4a', 'mp4', 'wav', 'mp3', 'mpeg', 'mpga', 'oga', 'ogg', 'flac'].includes(extension)) {
        audioFileName = `audio.${extension}`;
      }
    }
    
    // Fallback selon le type MIME si pas d'extension
    if (audioFileName === 'audio.m4a') {
      if (mimeType.includes('webm')) {
        audioFileName = 'audio.webm';
      } else if (mimeType.includes('wav')) {
        audioFileName = 'audio.wav';
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        audioFileName = 'audio.mp3';
      }
      // Pour m4a/mp4, garder .m4a (Whisper accepte les deux)
    }
    
    console.log('📝 [TRANSCRIBE] Préparation FormData pour Whisper:', {
      fileName: audioFileName,
      mimeType: mimeType,
      blobSize: audioBlob.size,
      blobType: audioBlob.type
    });

    // Créer un nouveau Blob avec le bon type MIME pour Whisper
    // Cela garantit que le type MIME est correctement défini
    const audioFileBlob = new Blob([audioBlob], { type: mimeType });
    
    console.log('📦 [TRANSCRIBE] Blob créé pour Whisper:', {
      size: audioFileBlob.size,
      type: audioFileBlob.type
    });

    // Préparer la requête Whisper API
    const formData = new FormData();
    
    // Whisper API accepte un Blob avec le bon nom de fichier
    // On utilise le blob directement avec le nom de fichier dans FormData
    // Le type MIME est déjà défini dans le blob
    formData.append('file', audioFileBlob, audioFileName);
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');
    
    const normalizedProducts = Array.isArray(productNames)
      ? normalizeGlossaryTerms(productNames).slice(0, 50)
      : [];

    const normalizedVocabulary = normalizeGlossaryTerms([
      ...agricultureGlossary,
      ...(Array.isArray(vocabularyTerms) ? vocabularyTerms : []),
    ]);
    const limitedVocabulary = normalizedVocabulary.slice(0, 80);

    const promptSegments: string[] = [];
    if (limitedVocabulary.length > 0) {
      promptSegments.push(`Termes agricoles et techniques: ${limitedVocabulary.join(', ')}`);
    }
    if (normalizedProducts.length > 0) {
      promptSegments.push(`Produits phytosanitaires: ${normalizedProducts.join(', ')}`);
    }

    if (promptSegments.length > 0) {
      const combinedPrompt = promptSegments.join('. ');
      const finalPrompt = combinedPrompt.length <= 1000
        ? combinedPrompt
        : `${combinedPrompt.substring(0, 997)}...`;
      formData.append('prompt', finalPrompt);
      console.log('✅ [TRANSCRIBE] Prompt Whisper ajouté', {
        vocabularyCount: limitedVocabulary.length,
        productsCount: normalizedProducts.length,
        promptLength: finalPrompt.length,
      });
    }
    
    console.log('✅ [TRANSCRIBE] FormData préparé:', {
      fileName: audioFileName,
      mimeType: mimeType,
      blobSize: audioFileBlob.size
    });

    console.log('🧠 [TRANSCRIBE] Appel Whisper API...');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY non configurée');
    }

    const transcriptionResponse = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      }
    );

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('❌ [TRANSCRIBE] Erreur Whisper API:', errorText);
      throw new Error(`Erreur Whisper API: ${transcriptionResponse.status} - ${errorText}`);
    }

    const result = await transcriptionResponse.json();
    console.log('✅ [TRANSCRIBE] Transcription réussie:', result.text?.substring(0, 100));

    return new Response(
      JSON.stringify({
        success: true,
        text: result.text,
        language: result.language || language,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ [TRANSCRIBE] Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur lors de la transcription',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
