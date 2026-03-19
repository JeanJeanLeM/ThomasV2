# 🔥 HOTFIX - Corrections Urgentes

## Problèmes Corrigés

### 1. ✅ ProfileScreen - Icône manquante
- **Erreur**: `CpuChipIcon` n'existe pas
- **Fix**: Remplacé par `CogIcon` + emoji 🤖
- **Status**: ✅ Corrigé dans le code

### 2. ✅ Analyse qui ne fonctionne plus
- **Erreur**: Requête SQL trop stricte sur `metadata->>'method'`
- **Fix**: Utilise maintenant `version` pour sélectionner le prompt
  - `simple` → cherche v2.0 OU is_default=true
  - `pipeline` → cherche v3.0
- **Status**: ✅ Corrigé dans Edge Function

## 🚀 Déploiement URGENT

### Étape 1: Redémarrer le serveur de développement

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez:
npm start
# ou
expo start
```

### Étape 2: Déployer l'Edge Function

```bash
# Dans le terminal, depuis la racine du projet:
supabase functions deploy analyze-message
```

**Alternative si supabase CLI non installé:**
1. Copiez le contenu de `supabase/functions/analyze-message/index.ts`
2. Allez dans Supabase Dashboard → Edge Functions → analyze-message
3. Remplacez le code et cliquez "Deploy"

### Étape 3: Tester

1. **Test ProfileScreen:**
   - Ouvrez l'app
   - Allez dans **Profil**
   - Vérifiez qu'il n'y a plus d'erreur
   - Cherchez "🤖 Assistant IA" dans le menu

2. **Test Analyse:**
   - Allez dans **Chat → Assistant IA**
   - Envoyez: **"j'ai observé des pucerons"**
   - Devrait créer une observation (pas juste dire "récolte")

## 📊 Vérifier les Logs Edge Function

Dans Supabase Dashboard → Edge Functions → analyze-message → Logs, cherchez:

```
✅ [ANALYZE] Méthode auto-détectée depuis config ferme: simple
✅ [ANALYZE] Prompt trouvé: thomas_agent_system (v2.0)
📊 [ANALYZE] Prompt longueur: ~9000 caractères
🎯 [ANALYZE] Méthode utilisée: simple
```

## 🐛 Si l'analyse ne fonctionne toujours pas

Vérifiez que le prompt v2.0 existe et est actif:

```sql
SELECT 
  name,
  version,
  is_active,
  is_default,
  LENGTH(content) as size,
  metadata
FROM chat_prompts
WHERE name = 'thomas_agent_system'
ORDER BY version DESC;
```

**Résultat attendu:**
- v2.0: `is_active=true`, `is_default=true`, `size~9000`
- v3.0: `is_active=true`, `is_default=false`, `size~2000`

Si le prompt v2.0 est trop court ou inactif, réexécutez:
```sql
-- Réexécutez la migration 045
```

## ✅ Validation Complète

Après déploiement, ces 3 choses doivent fonctionner:

1. ✅ **ProfileScreen s'ouvre sans erreur**
2. ✅ **Menu "🤖 Assistant IA" visible**
3. ✅ **Analyse de message fonctionne** (pas juste "récolte")

## 🆘 Support

Si les problèmes persistent:
1. Vérifiez les logs de l'Edge Function
2. Vérifiez que la migration 046 a bien tourné
3. Vérifiez que les deux prompts existent en DB
