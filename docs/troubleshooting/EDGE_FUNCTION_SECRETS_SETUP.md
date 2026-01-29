# 🔐 Configuration Secrets Edge Function - Transcription Audio

## ⚡ Configuration Rapide (5 minutes)

### Étape 1: Trouver les Valeurs

#### 1. SUPABASE_URL
1. Dashboard Supabase → **Settings** → **API**
2. Section **Project URL**
3. Copier l'URL complète (ex: `https://kvwzbofifqqytyfertkh.supabase.co`)

#### 2. SUPABASE_SERVICE_ROLE_KEY
1. Dashboard Supabase → **Settings** → **API**
2. Section **Project API keys**
3. Trouver **service_role** (⚠️ Clé secrète, ne jamais exposer)
4. Cliquer sur **Reveal** pour voir la clé
5. Copier la clé complète (commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

#### 3. OPENAI_API_KEY
1. Votre fichier `.env` local
2. Ligne `OPENAI_API_KEY=sk-proj-...`
3. Copier la clé complète (pas tronquée)

### Étape 2: Ajouter les Secrets dans Supabase

1. Dashboard Supabase → **Settings** → **Edge Functions**
2. Section **Secrets**
3. Pour chaque secret :

   **Secret 1: SUPABASE_URL**
   - Cliquer **Add Secret**
   - Name: `SUPABASE_URL`
   - Value: `https://kvwzbofifqqytyfertkh.supabase.co` (votre URL)
   - Cliquer **Save**

   **Secret 2: SUPABASE_SERVICE_ROLE_KEY**
   - Cliquer **Add Secret**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (votre clé complète)
   - Cliquer **Save**

   **Secret 3: OPENAI_API_KEY**
   - Cliquer **Add Secret**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-...` (votre clé complète depuis `.env`)
   - Cliquer **Save**

### Étape 3: Vérifier les Secrets

Dans la liste des secrets, vous devriez voir :
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`

### Étape 4: Redéployer l'Edge Function

```bash
npx supabase functions deploy transcribe-audio
```

### Étape 5: Tester

1. Enregistrer un message vocal dans l'application
2. Vérifier les logs dans Dashboard → Edge Functions → transcribe-audio → Logs
3. Vous devriez voir :
   ```
   📥 [TRANSCRIBE] Téléchargement audio depuis Storage: chat/16/audio/...
   ✅ [TRANSCRIBE] Audio téléchargé depuis Storage: X bytes
   ✅ [TRANSCRIBE] Transcription réussie
   ```

## 🔍 Vérification

### Dans les Logs Edge Function

Si vous voyez :
- ❌ "Configuration Supabase manquante" → Secrets non configurés
- ❌ "OPENAI_API_KEY non configurée" → Secret OPENAI_API_KEY manquant
- ✅ "Audio téléchargé depuis Storage" → Tout fonctionne !

### Test Rapide

Dans Supabase Dashboard → Edge Functions → transcribe-audio → Logs, cherchez les dernières invocations. Si vous voyez des erreurs, vérifiez que les 3 secrets sont bien configurés.

## ⚠️ Sécurité

- **NE JAMAIS** exposer `SUPABASE_SERVICE_ROLE_KEY` côté client
- **NE JAMAIS** commiter les secrets dans Git
- Les secrets sont automatiquement disponibles dans les Edge Functions via `Deno.env.get()`

## ✅ Checklist

- [ ] SUPABASE_URL ajouté
- [ ] SUPABASE_SERVICE_ROLE_KEY ajouté
- [ ] OPENAI_API_KEY ajouté
- [ ] Edge Function redéployée
- [ ] Test effectué
- [ ] Transcription fonctionne

---

**Une fois les secrets configurés, la transcription devrait fonctionner !** 🚀
