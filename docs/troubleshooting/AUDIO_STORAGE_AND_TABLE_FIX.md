# ✅ Correction Storage Audio et Table audio_files

**Date**: 12 janvier 2026
**Status**: ✅ Migration créée, code mis à jour

## 🐛 Problèmes Identifiés

1. **Erreur 400**: `mime type audio/webm is not supported`
   - Le bucket Supabase Storage `photos` n'autorisait que les formats image
   - Les formats audio (webm, m4a, etc.) étaient rejetés

2. **Pas de table pour les fichiers audio**
   - Aucune table pour stocker les métadonnées des fichiers audio
   - Pas de lien entre les tâches et les fichiers audio
   - Impossible de retrouver les fichiers audio associés aux tâches

## ✅ Solution Implémentée

### 1. Migration SQL Complète

**Fichier**: `supabase/Migrations/038_audio_files_table_and_storage.sql`

**Contenu**:
- ✅ Mise à jour du bucket `photos` pour autoriser les formats audio
- ✅ Création de la table `audio_files` avec toutes les métadonnées
- ✅ Ajout de `audio_file_id` dans `tasks` et `observations`
- ✅ Politiques RLS pour la sécurité
- ✅ Index pour les performances
- ✅ Triggers pour `updated_at`

**Formats audio autorisés**:
- `audio/webm` ✅
- `audio/mp4` ✅
- `audio/m4a` ✅
- `audio/mpeg` ✅
- `audio/mp3` ✅
- `audio/wav` ✅
- `audio/ogg` ✅
- `audio/opus` ✅

**Taille max**: 25 MB (augmentée de 10 MB)

### 2. Table audio_files

**Structure**:
```sql
CREATE TABLE audio_files (
  id uuid PRIMARY KEY,
  farm_id integer NOT NULL,
  user_id uuid NOT NULL,
  file_name varchar NOT NULL,
  file_path varchar NOT NULL,
  file_size bigint NOT NULL,
  mime_type varchar NOT NULL,
  duration_seconds integer,
  transcription text,
  transcription_language varchar(10) DEFAULT 'fr',
  transcription_confidence numeric(5,2),
  chat_message_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Relations**:
- `audio_files.farm_id` → `farms.id`
- `audio_files.user_id` → `auth.users.id`
- `audio_files.chat_message_id` → `chat_messages.id`
- `tasks.audio_file_id` → `audio_files.id`
- `observations.audio_file_id` → `audio_files.id`

### 3. Service AudioFileService

**Fichier**: `src/services/AudioFileService.ts` (nouveau)

**Fonctionnalités**:
- ✅ `createAudioFile()` - Créer un enregistrement
- ✅ `updateAudioFile()` - Mettre à jour (transcription, etc.)
- ✅ `getAudioFile()` - Récupérer un fichier
- ✅ `deleteAudioFile()` - Soft delete

### 4. Modifications du Code

#### MediaService.ts
- ✅ Ajout paramètre `userId` dans `uploadAudioFile()`
- ✅ Ajout paramètre `durationSeconds`
- ✅ Création automatique de l'enregistrement dans `audio_files` après upload
- ✅ Retour de `audioFileId` dans `MediaUploadResult`

#### ChatConversation.tsx
- ✅ Passage de `userId` et `recordingDuration` à `uploadAudioFile()`
- ✅ Mise à jour de `audio_files` avec la transcription après transcription
- ✅ Lien de `audio_files` avec `chat_message_id` après création du message
- ✅ Lien des tâches créées avec `audio_file_id` après création
- ✅ Lien des observations créées avec `audio_file_id` après création

## 🚀 Application de la Migration

### Étape 1: Appliquer la Migration SQL

**IMPORTANT**: Selon la mémoire, vous devez appliquer les migrations manuellement via le Dashboard Supabase.

1. Ouvrir le Dashboard Supabase: https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Ouvrir le fichier: `supabase/Migrations/038_audio_files_table_and_storage.sql`
5. Copier tout le contenu
6. Coller dans l'éditeur SQL
7. Cliquer sur **Run**

**Vérification**:
```sql
-- Vérifier que le bucket est mis à jour
SELECT id, name, allowed_mime_types, file_size_limit 
FROM storage.buckets 
WHERE id = 'photos';

-- Vérifier que la table existe
SELECT * FROM information_schema.tables 
WHERE table_name = 'audio_files';

-- Vérifier les colonnes ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'audio_file_id';
```

### Étape 2: Vérifier les Politiques RLS

Dans le Dashboard → **Authentication** → **Policies**, vérifier que les politiques pour `audio_files` sont créées:
- `audio_files_select_policy`
- `audio_files_insert_policy`
- `audio_files_update_policy`
- `audio_files_delete_policy`

### Étape 3: Tester l'Upload Audio

1. Ouvrir l'application
2. Enregistrer un message vocal
3. Vérifier dans la console:
   - `✅ [AUDIO] Upload réussi`
   - `💾 [AUDIO] Audio file ID: <uuid>`
   - Pas d'erreur 400

4. Vérifier dans Supabase:
   ```sql
   SELECT * FROM audio_files ORDER BY created_at DESC LIMIT 1;
   ```

## 📊 Flux Complet

```
1. Utilisateur enregistre un message vocal
   ↓
2. stopRecording() → URI blob créée
   ↓
3. uploadAudioFile() → Upload vers Supabase Storage
   ↓
4. AudioFileService.createAudioFile() → Enregistrement dans audio_files
   ↓
5. Transcription via Whisper API
   ↓
6. AudioFileService.updateAudioFile() → Mise à jour avec transcription
   ↓
7. ChatService.sendMessage() → Création du message chat
   ↓
8. AudioFileService.updateAudioFile() → Lien avec chat_message_id
   ↓
9. Analyse IA → Création des tâches/observations
   ↓
10. DirectSupabaseService.directUpdate() → Lien tasks.audio_file_id
```

## 🧪 Tests à Effectuer

### Test 1: Upload Audio Simple
1. **Action**: Enregistrer un message vocal de 5 secondes
2. **Attendu**:
   - ✅ Upload réussi (pas d'erreur 400)
   - ✅ Enregistrement créé dans `audio_files`
   - ✅ Log: "💾 [AUDIO] Audio file ID: <uuid>"

### Test 2: Transcription et Mise à Jour
1. **Action**: Même message vocal
2. **Attendu**:
   - ✅ Transcription réussie
   - ✅ `audio_files.transcription` mis à jour
   - ✅ Log: "✅ [AUDIO] Transcription enregistrée dans audio_files"

### Test 3: Lien avec Message Chat
1. **Action**: Même message vocal
2. **Attendu**:
   - ✅ Message chat créé
   - ✅ `audio_files.chat_message_id` mis à jour
   - ✅ Log: "🔗 [AUDIO] Fichier audio lié au message chat"

### Test 4: Lien avec Tâches
1. **Action**: Enregistrer "J'ai récolté des tomates pendant 2 heures"
2. **Attendu**:
   - ✅ Tâche créée
   - ✅ `tasks.audio_file_id` mis à jour
   - ✅ Log: "🔗 [AUDIO] Tâche liée au fichier audio"

### Test 5: Vérification en Base
```sql
-- Vérifier les fichiers audio récents
SELECT 
  af.id,
  af.file_name,
  af.file_size,
  af.mime_type,
  af.transcription,
  af.chat_message_id,
  COUNT(t.id) as tasks_count
FROM audio_files af
LEFT JOIN tasks t ON t.audio_file_id = af.id
WHERE af.is_active = true
GROUP BY af.id
ORDER BY af.created_at DESC
LIMIT 10;
```

## 📝 Requêtes SQL Utiles

### Lister tous les fichiers audio d'une ferme
```sql
SELECT * FROM audio_files 
WHERE farm_id = 16 AND is_active = true
ORDER BY created_at DESC;
```

### Trouver les tâches avec audio
```sql
SELECT 
  t.id,
  t.title,
  t.date,
  af.file_name,
  af.transcription
FROM tasks t
JOIN audio_files af ON af.id = t.audio_file_id
WHERE t.farm_id = 16
ORDER BY t.date DESC;
```

### Statistiques audio
```sql
SELECT 
  COUNT(*) as total_files,
  SUM(file_size) as total_size_bytes,
  AVG(duration_seconds) as avg_duration_seconds,
  COUNT(transcription) as files_with_transcription
FROM audio_files
WHERE farm_id = 16 AND is_active = true;
```

## 🔍 Vérifications Post-Migration

### Dans Supabase Dashboard
- [ ] Bucket `photos` mis à jour avec formats audio
- [ ] Table `audio_files` créée
- [ ] Colonne `audio_file_id` ajoutée dans `tasks`
- [ ] Colonne `audio_file_id` ajoutée dans `observations`
- [ ] Politiques RLS créées pour `audio_files`
- [ ] Index créés

### Dans l'Application
- [ ] Upload audio fonctionne (pas d'erreur 400)
- [ ] Enregistrement créé dans `audio_files`
- [ ] Transcription enregistrée
- [ ] Tâches liées aux fichiers audio
- [ ] Logs corrects dans la console

## 🐛 Dépannage

### Erreur: "mime type audio/webm is not supported"
**Cause**: Migration non appliquée ou bucket non mis à jour
**Solution**: 
1. Vérifier que la migration a été appliquée
2. Vérifier le bucket: `SELECT allowed_mime_types FROM storage.buckets WHERE id = 'photos';`
3. Si nécessaire, mettre à jour manuellement dans Dashboard → Storage → Settings

### Erreur: "relation audio_files does not exist"
**Cause**: Table non créée
**Solution**: Appliquer la migration SQL complète

### Les tâches ne sont pas liées
**Cause**: `audio_file_id` non mis à jour
**Solution**: Vérifier les logs "🔗 [AUDIO] Tâche liée au fichier audio"

## ✅ Checklist de Validation

- [x] Migration SQL créée
- [x] Service AudioFileService créé
- [x] MediaService mis à jour
- [x] ChatConversation mis à jour
- [x] Code testé (pas d'erreurs de lint)
- [ ] Migration appliquée dans Supabase
- [ ] Tests manuels effectués
- [ ] Vérification en base de données

## 🎉 Résultat

Le système de fichiers audio est maintenant **complet** :

- ✅ Formats audio supportés dans le bucket Storage
- ✅ Table `audio_files` pour stocker les métadonnées
- ✅ Lien entre fichiers audio et tâches/observations
- ✅ Transcription stockée dans la base
- ✅ Traçabilité complète (qui, quand, quoi)

**Prêt pour les tests !** 🚀

---

**Note**: N'oubliez pas d'appliquer la migration SQL dans le Dashboard Supabase avant de tester !
