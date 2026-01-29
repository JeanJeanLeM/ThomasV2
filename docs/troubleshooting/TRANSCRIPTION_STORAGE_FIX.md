# ✅ Correction Transcription - Téléchargement depuis Storage

**Date**: 12 janvier 2026
**Status**: ✅ Corrigé

## 🐛 Problème Identifié

L'Edge Function retournait l'erreur :
```
❌ Impossible de télécharger l'audio: Bad Request
```

**Cause**: L'Edge Function essayait de télécharger l'audio depuis l'URL publique Supabase Storage, mais cette méthode n'est pas fiable et peut échouer avec "Bad Request".

## ✅ Solution Implémentée

### 1. Edge Function - Téléchargement depuis Storage

**Fichier**: `supabase/functions/transcribe-audio/index.ts`

**Changements**:
- ✅ Utilisation du client Supabase pour télécharger directement depuis Storage
- ✅ Support de `filePath` (recommandé) et `audioUrl` (fallback)
- ✅ Téléchargement via `supabase.storage.from('photos').download(filePath)`
- ✅ Détection automatique du type MIME depuis l'extension du fichier

**Avant**:
```typescript
const audioResponse = await fetch(audioUrl);
const audioBlob = await audioResponse.blob();
```

**Après**:
```typescript
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const { data, error } = await supabase.storage
  .from('photos')
  .download(filePath);
audioBlob = data;
```

### 2. TranscriptionService - Passage du filePath

**Fichier**: `src/services/TranscriptionService.ts`

**Changements**:
- ✅ Ajout du paramètre optionnel `filePath`
- ✅ Priorité au `filePath` si disponible (plus fiable)
- ✅ Fallback sur `audioUrl` si `filePath` non fourni

### 3. ChatConversation - Utilisation du filePath

**Fichier**: `src/components/ChatConversation.tsx`

**Changements**:
- ✅ Passage de `uploadResult.filePath` à `transcribeFromUrl()`
- ✅ L'Edge Function utilise maintenant le chemin Storage au lieu de l'URL publique

## 🔧 Configuration Requise

### Secrets Edge Function

L'Edge Function nécessite 3 secrets dans Supabase Dashboard :

1. **OPENAI_API_KEY** (déjà configuré)
   - Votre clé OpenAI complète

2. **SUPABASE_URL** (à ajouter)
   - Format: `https://kvwzbofifqqytyfertkh.supabase.co`
   - Trouvable dans Dashboard → Settings → API → Project URL

3. **SUPABASE_SERVICE_ROLE_KEY** (à ajouter)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Trouvable dans Dashboard → Settings → API → service_role key
   - ⚠️ **ATTENTION**: Cette clé a tous les droits, ne jamais l'exposer côté client !

### Comment Ajouter les Secrets

1. Allez sur le Dashboard Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu latéral → **Settings** → **Edge Functions**
4. Section **Secrets**
5. Pour chaque secret :
   - Cliquez sur **Add Secret**
   - Nom: `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY`
   - Valeur: La valeur correspondante
   - Cliquez sur **Save**

## 🚀 Redéploiement

Après avoir ajouté les secrets, redéployez l'Edge Function :

```bash
npx supabase functions deploy transcribe-audio
```

## 🧪 Tests à Effectuer

### Test 1: Transcription avec filePath
1. **Action**: Enregistrer un message vocal
2. **Attendu**:
   - ✅ Log: "📥 [TRANSCRIBE] Téléchargement audio depuis Storage: chat/16/audio/..."
   - ✅ Log: "✅ [TRANSCRIBE] Audio téléchargé depuis Storage: X bytes"
   - ✅ Log: "✅ [TRANSCRIBE] Transcription réussie"
   - ✅ Transcription affichée dans le chat

### Test 2: Vérification des Logs Edge Function

Dans Supabase Dashboard → Edge Functions → transcribe-audio → Logs, vous devriez voir :

```
🎙️ [TRANSCRIBE] Démarrage transcription audio
📥 [TRANSCRIBE] Téléchargement audio depuis Storage: chat/16/audio/...
✅ [TRANSCRIBE] Audio téléchargé depuis Storage: 71709 bytes
📝 [TRANSCRIBE] Nom fichier pour Whisper: audio.webm Type MIME: audio/webm
🧠 [TRANSCRIBE] Appel Whisper API...
✅ [TRANSCRIBE] Transcription réussie: ...
```

## 🔍 Vérifications

### Dans Supabase Dashboard

**Vérifier les Secrets**:
1. Settings → Edge Functions → Secrets
2. Vérifier que les 3 secrets sont présents :
   - `OPENAI_API_KEY` ✅
   - `SUPABASE_URL` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅

**Vérifier les Logs**:
1. Edge Functions → transcribe-audio → Logs
2. Vérifier qu'il n'y a pas d'erreur "Configuration Supabase manquante"
3. Vérifier que le téléchargement depuis Storage fonctionne

### Dans la Console Frontend

- [ ] Pas d'erreur "Bad Request"
- [ ] Log "📥 [TRANSCRIBE] Téléchargement audio depuis Storage"
- [ ] Log "✅ [TRANSCRIBE] Audio téléchargé depuis Storage"
- [ ] Transcription réussie

## 🐛 Dépannage

### Erreur: "Configuration Supabase manquante"
**Cause**: Secrets `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` non configurés
**Solution**: Ajouter les secrets dans Dashboard → Settings → Edge Functions → Secrets

### Erreur: "Impossible de télécharger l'audio depuis Storage"
**Causes possibles**:
1. Le `filePath` est incorrect
2. Le fichier n'existe pas dans Storage
3. Les permissions Storage ne permettent pas le téléchargement

**Solution**: 
- Vérifier que le fichier existe dans Storage
- Vérifier les politiques RLS du bucket `photos`
- Vérifier les logs de l'Edge Function pour plus de détails

### Erreur: "Bad Request" persiste
**Cause**: L'Edge Function utilise encore l'ancienne méthode (URL publique)
**Solution**: 
1. Vérifier que l'Edge Function a été redéployée
2. Vérifier que le code utilise bien `filePath` et non `audioUrl`
3. Vérifier les logs de l'Edge Function

## ✅ Checklist de Validation

- [x] Edge Function modifiée pour utiliser Storage
- [x] TranscriptionService mis à jour pour passer filePath
- [x] ChatConversation mis à jour pour utiliser filePath
- [ ] Secrets SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY ajoutés
- [ ] Edge Function redéployée
- [ ] Tests manuels effectués
- [ ] Transcription fonctionne

## 🎉 Résultat

La transcription utilise maintenant le téléchargement direct depuis Supabase Storage, ce qui est :
- ✅ Plus fiable (pas de problème avec les URLs publiques)
- ✅ Plus sécurisé (utilise le service role key dans l'Edge Function)
- ✅ Plus rapide (pas de redirection HTTP)

**Prêt pour les tests !** 🚀

---

**Note**: N'oubliez pas d'ajouter les secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans le Dashboard Supabase avant de tester !
