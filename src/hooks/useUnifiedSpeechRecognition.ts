/**
 * Hook unifié pour la reconnaissance vocale en temps réel.
 *
 * - Sur web : délègue à useWebSpeechRecognition (Chrome/Edge via Web Speech API).
 * - Sur natif (iOS/Android) : utilise ExpoSpeechRecognitionModule.
 *
 * Même interface de retour dans les deux cas, pour que les appelants
 * n'aient pas à différencier la plateforme.
 *
 * Contrainte : le mode Dictée sur natif nécessite un development build
 * (npx expo run:ios / npx expo run:android), pas Expo Go.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  useWebSpeechRecognition,
  UseWebSpeechRecognitionOptions,
  UseWebSpeechRecognitionResult,
} from './useWebSpeechRecognition';

export interface UseUnifiedSpeechRecognitionResult extends UseWebSpeechRecognitionResult {
  /** true si la dictée est disponible sur la plateforme courante */
  isDictationAvailable: boolean;
}

export function useUnifiedSpeechRecognition(
  options: UseWebSpeechRecognitionOptions = {}
): UseUnifiedSpeechRecognitionResult {
  const { language = 'fr-FR', onFinalSegment, onInterim, onStart, onStop, onError } = options;

  // ─── CHEMIN WEB ──────────────────────────────────────────────────────────────
  // On appelle toujours le hook web (les hooks React ne peuvent pas être
  // conditionnels). Sur natif, ses valeurs sont ignorées au profit du chemin natif.
  const webSpeech = useWebSpeechRecognition(options);

  // ─── CHEMIN NATIF ─────────────────────────────────────────────────────────────
  const [nativeIsListening, setNativeIsListening] = useState(false);
  const [nativeInterim, setNativeInterim] = useState('');
  const [nativeFinalized, setNativeFinalized] = useState('');
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  const nativeFinalizedRef = useRef('');
  const lastFinalSegmentRef = useRef('');
  const isNative = Platform.OS !== 'web';

  // Vérifie la disponibilité du module au montage (natif seulement)
  useEffect(() => {
    if (!isNative) return;
    try {
      // Import dynamique pour éviter les erreurs sur web où le module natif n'existe pas
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setNativeAvailable(available);
    } catch {
      setNativeAvailable(false);
    }
  }, [isNative]);

  // Enregistre les listeners d'événements natifs
  useEffect(() => {
    if (!isNative) return;

    let ExpoSpeechRecognitionModule: any;
    try {
      ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
    } catch {
      return;
    }

    const subStart = ExpoSpeechRecognitionModule.addListener('start', () => {
      console.log('🎙️ [NATIVE-SPEECH] Reconnaissance démarrée');
      setNativeIsListening(true);
      setNativeError(null);
      onStart?.();
    });

    const subEnd = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('🛑 [NATIVE-SPEECH] Reconnaissance terminée');
      setNativeIsListening(false);
      setNativeInterim('');
      onStop?.();
    });

    const subError = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event: { error: string; message: string }) => {
        const errCode = event.error || 'unknown';
        console.error('❌ [NATIVE-SPEECH] Erreur:', errCode, event.message);
        if (errCode === 'no-speech' || errCode === 'speech-timeout') {
          console.log('⚠️ [NATIVE-SPEECH] Silence détecté, on ignore');
          return;
        }
        setNativeError(errCode);
        setNativeIsListening(false);
        onError?.(errCode);
      }
    );

    const subResult = ExpoSpeechRecognitionModule.addListener(
      'result',
      (event: { isFinal: boolean; results: Array<{ transcript: string; confidence: number }> }) => {
        const transcript = (event.results?.[0]?.transcript ?? '').trim();

        if (event.isFinal) {
          if (!transcript) return;
          // Certains moteurs renvoient parfois le même final plusieurs fois.
          if (transcript === lastFinalSegmentRef.current) return;
          lastFinalSegmentRef.current = transcript;

          const separator = nativeFinalizedRef.current.length > 0 ? ' ' : '';
          const updated = nativeFinalizedRef.current + separator + transcript;
          nativeFinalizedRef.current = updated;
          setNativeFinalized(updated);
          setNativeInterim('');
          onInterim?.('');
          onFinalSegment?.(transcript, updated);
          console.log('✅ [NATIVE-SPEECH] Segment final:', transcript);
        } else {
          setNativeInterim(transcript);
          onInterim?.(transcript);
        }
      }
    );

    return () => {
      subStart.remove();
      subEnd.remove();
      subError.remove();
      subResult.remove();
    };
  }, [isNative, onStart, onStop, onError, onInterim, onFinalSegment]);

  const nativeStart = useCallback(async () => {
    if (!isNative) return;
    let ExpoSpeechRecognitionModule: any;
    try {
      ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
    } catch {
      return;
    }

    // Réinitialiser l'état
    nativeFinalizedRef.current = '';
    lastFinalSegmentRef.current = '';
    setNativeFinalized('');
    setNativeInterim('');
    setNativeError(null);

    // Vérifier la disponibilité runtime (service OS activé + module prêt)
    const availableNow = !!ExpoSpeechRecognitionModule.isRecognitionAvailable?.();
    if (!availableNow) {
      const msg =
        Platform.OS === 'android'
          ? 'Service de reconnaissance indisponible sur l’appareil (activez Google Speech Services).'
          : 'Dictée indisponible (activez Siri et Dictée dans les réglages iOS).';
      console.error('❌ [NATIVE-SPEECH]', msg);
      setNativeError(msg);
      onError?.(msg);
      return;
    }

    // Demander les permissions si nécessaire
    let perms: any;
    if (Platform.OS === 'ios' && ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync) {
      // Sur iOS, on privilégie le micro + on-device recognition pour éviter
      // les problèmes fréquents de permission "Speech Recognition".
      perms = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    } else {
      perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    }
    if (!perms.granted) {
      const msg = 'Permission microphone refusée';
      console.error('❌ [NATIVE-SPEECH]', msg);
      setNativeError(msg);
      onError?.(msg);
      return;
    }

    try {
      const androidVersion =
        Platform.OS === 'android'
          ? (typeof Platform.Version === 'number'
              ? Platform.Version
              : parseInt(String(Platform.Version), 10))
          : 0;
      const supportsContinuous = Platform.OS !== 'android' || androidVersion >= 33;
      const supportsOnDevice = !!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.();

      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        // Android <= 12 ne gère pas continuous proprement avec ce module.
        continuous: supportsContinuous,
        // Sur iOS, on force on-device si possible pour rendre la dictée plus fiable.
        requiresOnDeviceRecognition: Platform.OS === 'ios' ? supportsOnDevice : undefined,
        iosTaskHint: Platform.OS === 'ios' ? 'dictation' : undefined,
      });
    } catch (err: any) {
      console.error('❌ [NATIVE-SPEECH] Erreur start:', err);
      const msg = err?.message || 'Impossible de démarrer la dictée';
      setNativeError(msg);
      onError?.(msg);
    }
  }, [isNative, language, onError]);

  const nativeStop = useCallback(() => {
    if (!isNative) return;
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.warn('⚠️ [NATIVE-SPEECH] Erreur stop:', err);
    }
  }, [isNative]);

  const nativeAbort = useCallback(() => {
    if (!isNative) return;
    try {
      const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
      ExpoSpeechRecognitionModule.abort();
    } catch (err) {
      console.warn('⚠️ [NATIVE-SPEECH] Erreur abort:', err);
    }
    nativeFinalizedRef.current = '';
    lastFinalSegmentRef.current = '';
    setNativeFinalized('');
    setNativeInterim('');
    setNativeIsListening(false);
  }, [isNative]);

  const nativeReset = useCallback(() => {
    nativeAbort();
    setNativeError(null);
  }, [nativeAbort]);

  // ─── SÉLECTION DU CHEMIN ──────────────────────────────────────────────────────
  if (isNative) {
    return {
      // Valeurs de compatibilité web (non utilisées sur natif mais requises par l'interface)
      isWebSpeechAvailable: false,
      // Disponibilité dictée
      isDictationAvailable: nativeAvailable,
      // État
      isListening: nativeIsListening,
      interimText: nativeInterim,
      finalizedText: nativeFinalized,
      errorMessage: nativeError,
      // Contrôles
      start: nativeStart,
      stop: nativeStop,
      abort: nativeAbort,
      reset: nativeReset,
    };
  }

  // Chemin web : délégation complète au hook web
  return {
    ...webSpeech,
    isDictationAvailable: webSpeech.isWebSpeechAvailable,
  };
}
