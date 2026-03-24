/**
 * Hook pour la Web Speech API (reconnaissance vocale en temps réel côté navigateur)
 *
 * Disponibilité : Chrome / Edge (desktop + Android). iOS Safari et Firefox non supportés.
 * Utiliser `isWebSpeechAvailable` pour conditionner l'affichage du mode Dictée.
 *
 * Comportement :
 * - Résultats interims : affichage en direct dans l'input.
 * - Résultats finaux : accumulés pour construire le transcript Web Speech brut.
 * - En mode `continuous`, la reconnaissance redémarre automatiquement jusqu'à `stop()`.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

export interface WebSpeechState {
  isListening: boolean;
  interimText: string;       // Segment en cours (non finalisé), à afficher en live
  finalizedText: string;     // Texte accumulé et finalisé (tous les segments "final")
  errorMessage: string | null;
}

export interface UseWebSpeechRecognitionOptions {
  language?: string;          // Défaut : 'fr-FR'
  onFinalSegment?: (segment: string, fullFinalized: string) => void;
  onInterim?: (interim: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: string) => void;
}

export interface UseWebSpeechRecognitionResult extends WebSpeechState {
  isWebSpeechAvailable: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  reset: () => void;
}

/**
 * Détecte la disponibilité de la Web Speech API.
 * Uniquement disponible sur web, pas sur React Native natif.
 */
export function isWebSpeechSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function useWebSpeechRecognition(
  options: UseWebSpeechRecognitionOptions = {}
): UseWebSpeechRecognitionResult {
  const { language = 'fr-FR', onFinalSegment, onInterim, onStart, onStop, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalizedText, setFinalizedText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWebSpeechAvailable] = useState(isWebSpeechSupported);

  const recognitionRef = useRef<any>(null);
  const finalizedRef = useRef('');       // Copie ref pour éviter les stale closures
  const finalByIndexRef = useRef<Map<number, string>>(new Map()); // Évite les doublons cumulés
  const stoppedManuallyRef = useRef(false);

  // Initialiser la reconnaissance
  const createRecognition = useCallback(() => {
    if (!isWebSpeechAvailable) return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎙️ [WEB-SPEECH] Reconnaissance démarrée');
      setIsListening(true);
      setErrorMessage(null);
      onStart?.();
    };

    recognition.onend = () => {
      console.log('🛑 [WEB-SPEECH] Reconnaissance terminée');
      setIsListening(false);
      setInterimText('');
      onStop?.();
    };

    recognition.onerror = (event: any) => {
      const errMsg = event.error || 'Erreur inconnue';
      console.error('❌ [WEB-SPEECH] Erreur:', errMsg);

      // 'no-speech' n'est pas une vraie erreur (silence prolongé)
      if (errMsg === 'no-speech') {
        console.log('⚠️ [WEB-SPEECH] Silence détecté (no-speech), on ignore');
        return;
      }

      setErrorMessage(errMsg);
      setIsListening(false);
      onError?.(errMsg);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let changedFinalSegment = '';
      let hasFinalChange = false;

      // Important:
      // Sur certains moteurs, un "final" peut revenir avec une phrase cumulée
      // ("j'ai", puis "j'ai récolté", puis "j'ai récolté des...").
      // On stocke donc le final par index et on reconstruit le texte global
      // pour éviter d'append des doublons.
      for (let i = 0; i < event.results.length; i++) {
        const transcript = (event.results[i][0]?.transcript || '').trim();
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          const prevAtIndex = finalByIndexRef.current.get(i) || '';
          if (prevAtIndex !== transcript) {
            finalByIndexRef.current.set(i, transcript);
            changedFinalSegment = transcript;
            hasFinalChange = true;
          }
        } else if (i >= event.resultIndex) {
          interim = interim ? `${interim} ${transcript}` : transcript;
        }
      }

      const cleanInterim = interim.trim();
      setInterimText(cleanInterim);
      onInterim?.(cleanInterim);

      if (hasFinalChange) {
        const updated = Array.from(finalByIndexRef.current.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, segment]) => segment.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (updated !== finalizedRef.current) {
          finalizedRef.current = updated;
          setFinalizedText(updated);
          onFinalSegment?.(changedFinalSegment, updated);
          console.log('✅ [WEB-SPEECH] Segment final:', changedFinalSegment);
        }
      }
    };

    return recognition;
  }, [isWebSpeechAvailable, language, onFinalSegment, onInterim, onStart, onStop, onError]);

  const start = useCallback(() => {
    if (!isWebSpeechAvailable) {
      const msg = 'Web Speech API non disponible dans ce navigateur';
      console.warn('⚠️ [WEB-SPEECH]', msg);
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }

    stoppedManuallyRef.current = false;
    finalizedRef.current = '';
    finalByIndexRef.current.clear();
    setFinalizedText('');
    setInterimText('');
    setErrorMessage(null);

    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      console.error('❌ [WEB-SPEECH] Erreur start:', err);
      setErrorMessage(err.message || 'Impossible de démarrer la reconnaissance vocale');
    }
  }, [isWebSpeechAvailable, createRecognition, onError]);

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('⚠️ [WEB-SPEECH] Erreur stop:', err);
      }
    }
  }, []);

  const abort = useCallback(() => {
    stoppedManuallyRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('⚠️ [WEB-SPEECH] Erreur abort:', err);
      }
    }
    finalizedRef.current = '';
    finalByIndexRef.current.clear();
    setFinalizedText('');
    setInterimText('');
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setErrorMessage(null);
  }, [abort]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isWebSpeechAvailable,
    isListening,
    interimText,
    finalizedText,
    errorMessage,
    start,
    stop,
    abort,
    reset,
  };
}
