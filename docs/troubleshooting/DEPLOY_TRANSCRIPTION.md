# 🚀 Guide de Déploiement - Transcription Audio

## ⚡ Déploiement Rapide (5 minutes)

### Étape 1: Déployer l'Edge Function

```bash
npx supabase functions deploy transcribe-audio
```

**Attendu**: Message de succès confirmant le déploiement.

### Étape 2: Configurer la Clé OpenAI

1. Allez sur le Dashboard Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu latéral → **Settings** → **Edge Functions**
4. Section **Secrets**
5. Cliquez sur **Add Secret**
6. Nom: `OPENAI_API_KEY`
7. Valeur: Votre clé OpenAI (commence par `sk-`)
8. Cliquez sur **Save**

### Étape 3: Vérifier le Déploiement

Dans les logs de l'Edge Function, vous devriez voir:

```
🚀 Thomas Transcription Audio Function loaded
Listening on http://localhost:9999/
```

### Étape 4: Tester dans l'Application

1. Ouvrez l'application
2. Allez dans un chat existant
3. Maintenez le bouton micro enfoncé
4. Dites: **"J'ai récolté des tomates pendant 2 heures"**
5. Relâchez le bouton
6. Attendez 5-10 secondes

**Résultat attendu**:
- ✅ Message vocal affiché avec icône microphone
- ✅ Transcription affichée sous l'audio: "📝 J'ai récolté des tomates pendant 2 heures"
- ✅ Carte d'action créée: "Récolter Tomates"
- ✅ Tâche créée en DB avec 120 minutes de durée

## 🔍 Vérification Post-Déploiement

### Dans le Chat
- [ ] L'enregistrement audio fonctionne
- [ ] L'upload vers Supabase réussit
- [ ] La transcription s'affiche sous l'audio
- [ ] L'analyse IA détecte les actions
- [ ] Les tâches sont créées automatiquement

### Dans les Logs Frontend (Console)
```
☁️ [AUDIO] Upload audio vers Supabase...
✅ [AUDIO] Upload réussi: https://...
🎙️ [AUDIO] Transcription en cours...
✅ [AUDIO] Transcription réussie: J'ai récolté...
🤖 [AUDIO] Analyse IA de la transcription...
✅ [AUDIO] Analyse IA terminée: 1 actions détectées
```

### Dans les Logs Edge Function (Supabase Dashboard)
```
🎙️ [TRANSCRIBE] Démarrage transcription audio
📥 [TRANSCRIBE] Téléchargement audio depuis: https://...
✅ [TRANSCRIBE] Audio téléchargé: 125432 bytes
🧠 [TRANSCRIBE] Appel Whisper API...
✅ [TRANSCRIBE] Transcription réussie
```

## ❌ Dépannage

### Erreur: "OPENAI_API_KEY non configurée"
**Solution**: Vérifiez que la clé est bien ajoutée dans Supabase Dashboard → Settings → Edge Functions → Secrets

### Erreur: "Failed to deploy function"
**Solution**: 
```bash
# Vérifier que vous êtes connecté
npx supabase login

# Vérifier le lien du projet
npx supabase link

# Réessayer le déploiement
npx supabase functions deploy transcribe-audio
```

### La transcription ne s'affiche pas
**Causes possibles**:
1. Edge Function pas déployée → Redéployer
2. Clé OpenAI invalide → Vérifier la clé
3. Fichier audio trop gros → Limite 25 MB
4. Timeout réseau → Réessayer

### L'analyse IA ne se lance pas
**Vérification**:
- La transcription doit contenir des mots-clés agricoles
- Phrases trop courtes (< 10 caractères) sont ignorées
- Tester avec: "J'ai planté des tomates"

## 📊 Monitoring

### Vérifier les Appels à l'Edge Function

Dans Supabase Dashboard → Functions → transcribe-audio:
- **Invocations**: Nombre d'appels
- **Errors**: Taux d'erreur (doit être < 5%)
- **Avg Duration**: Temps moyen (~2-5 secondes)

### Vérifier les Coûts OpenAI

Dans OpenAI Dashboard → Usage:
- **Audio API**: Coût de transcription
- **Estimation**: ~$0.006 / minute

## ✅ Checklist Finale

- [ ] Edge Function déployée
- [ ] OPENAI_API_KEY configurée
- [ ] Test simple réussi
- [ ] Test multi-cultures réussi
- [ ] Logs sans erreurs
- [ ] Performance acceptable (< 10 secondes total)

## 🎉 Prêt !

Si tous les tests passent, le système de transcription audio est maintenant **opérationnel** ! 

Les utilisateurs peuvent maintenant enregistrer des messages vocaux qui seront automatiquement:
1. Transcrits en texte
2. Analysés par l'IA
3. Convertis en tâches agricoles
4. Affichés dans le chat avec la transcription visible

---

**Questions ?** Consultez `AUDIO_TRANSCRIPTION_COMPLETE.md` pour la documentation complète.
