# Fix Audio Transcription - AMR-NB → AAC

## Problème identifié

L'Edge Function `transcribe-audio` retournait l'erreur :
```
Erreur Whisper API: 400 - Invalid file format
```

**Cause racine** : Android enregistrait en **AMR-NB (audio/3gpp)** au lieu de **AAC (audio/mp4)**.

### Logs système Android
```
W StagefrightRecorder: Intended audio encoding bit rate (128000) is too large and will be set to (12200)
W StagefrightRecorder: Intended audio sample rate (44100) is too large and will be set to (8000)
W StagefrightRecorder: Intended number of audio channels (2) is too large and will be set to (1)
D CCodecConfig: string output.media-type.value = "audio/3gpp"
```

Android ignorait les paramètres demandés et forçait l'encodage en AMR-NB.

### Formats supportés par Whisper API
✅ Supportés : `flac`, `m4a`, `mp3`, `mp4`, `mpeg`, `mpga`, `oga`, `ogg`, `wav`, `webm`
❌ **NON supporté** : `3gpp` (AMR-NB)

---

## Solutions appliquées

### 1. Correction des paramètres d'enregistrement (Client)

**Fichier** : `src/components/ChatConversation.tsx`

**Changements** :
- Utilisation de valeurs numériques explicites au lieu de constantes
- `outputFormat: 2` (MPEG_4) pour forcer le conteneur MP4
- `audioEncoder: 3` (AAC) pour forcer l'encodeur AAC (pas AMR_NB qui est 1)
- Réduction à **16kHz mono** (recommandé par Whisper pour la voix)
- Bitrate à **64kbps** (optimal pour la voix)

**Avant** :
```typescript
android: {
  extension: '.m4a',
  outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
  audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
}
```

**Après** :
```typescript
android: {
  extension: '.m4a',
  outputFormat: 2, // MPEG_4 (forcer AAC, pas AMR-NB)
  audioEncoder: 3, // AAC (pas AMR_NB qui est 1)
  sampleRate: 16000, // 16kHz recommandé par Whisper
  numberOfChannels: 1, // Mono
  bitRate: 64000, // Optimal pour la voix
}
```

### 2. Détection AMR-NB dans Edge Function

**Fichier** : `supabase/functions/transcribe-audio/index.ts`

**Ajout** : Détection des magic bytes AMR-NB
```typescript
// AMR-NB commence par "#!AMR" (23 21 41 4D 52)
if (hexSignature.startsWith('2321414D')) {
  throw new Error('Format audio AMR-NB (3gpp) non supporté. Veuillez réenregistrer avec AAC/M4A.');
}
```

---

## Comment tester

### 1. Rebuild l'application mobile
```bash
eas build --profile development --platform android --local
```

### 2. Installer le nouveau build sur le téléphone

### 3. Tester l'enregistrement audio

#### Vérifier les logs Android (via adb)
```bash
adb logcat | grep -i "StagefrightRecorder\|CCodec"
```

**Résultat attendu** :
```
I MediaCodec: [c2.android.aac.encoder] configured as encoder
D CCodecConfig: string output.media-type.value = "audio/mp4"
```

**❌ Si vous voyez** :
```
D CCodecConfig: string output.media-type.value = "audio/3gpp"
```
→ Le problème persiste, Android force toujours AMR-NB.

#### Vérifier les logs Edge Function (Supabase Dashboard)
```
🔍 [TRANSCRIBE] Magic bytes du fichier: 00000018
✅ [TRANSCRIBE] Fichier MP4/M4A valide détecté
📝 [TRANSCRIBE] Type MIME déterminé: audio/mp4
```

**❌ Si vous voyez** :
```
🔍 [TRANSCRIBE] Magic bytes du fichier: 2321414D
❌ [TRANSCRIBE] Fichier détecté comme AMR-NB (audio/3gpp)
```
→ AMR-NB détecté, message d'erreur clair retourné à l'utilisateur.

---

## Solutions alternatives si le problème persiste

Si Android continue de forcer AMR-NB malgré les changements :

### Option 1 : Utiliser WAV (non compressé, supporté universellement)
```typescript
android: {
  extension: '.wav',
  outputFormat: 1, // WAV
  audioEncoder: 1, // PCM
  sampleRate: 16000,
  numberOfChannels: 1,
}
```

**Avantages** : Toujours accepté par Whisper
**Inconvénients** : Fichiers plus volumineux (~960 KB/min vs ~480 KB/min)

### Option 2 : Conversion côté serveur
Convertir AMR-NB → MP3/WAV dans l'Edge Function avant d'envoyer à Whisper.
- Nécessite `ffmpeg` ou une bibliothèque de conversion audio.
- Plus complexe, mais transparent pour l'utilisateur.

### Option 3 : Enregistrement web audio sur mobile
Utiliser `MediaRecorder` API (WebView) au lieu d'Expo AV.
- Compatible avec React Native WebView
- Formats supportés : `audio/webm` (Opus), `audio/ogg`

---

## Références

- [Expo AV Recording Options](https://docs.expo.dev/versions/latest/sdk/audio/#recordingoptionspreset)
- [Android MediaRecorder Output Formats](https://developer.android.com/reference/android/media/MediaRecorder.OutputFormat)
- [OpenAI Whisper API Audio Formats](https://platform.openai.com/docs/guides/speech-to-text)
- [AMR-NB Specifications](https://en.wikipedia.org/wiki/Adaptive_Multi-Rate_audio_codec)

---

## Déploiement

### 1. Déployer l'Edge Function
```bash
npx supabase functions deploy transcribe-audio
```

### 2. Rebuild l'application
```bash
# Android
eas build --profile development --platform android --local

# iOS (si applicable)
eas build --profile development --platform ios --local
```

### 3. Tester immédiatement
- Enregistrer un message vocal
- Vérifier la transcription
- Vérifier les logs

---

## Statut

- [x] Identification du problème (AMR-NB vs AAC)
- [x] Correction paramètres d'enregistrement
- [x] Détection AMR-NB dans Edge Function
- [x] Documentation
- [ ] Test sur device Android réel
- [ ] Validation transcription fonctionne
- [ ] Deploy production si tests OK

---

**Date** : 2026-01-14
**Auteur** : Assistant AI
**Priorité** : 🔥 CRITIQUE (bloque transcription audio mobile)
