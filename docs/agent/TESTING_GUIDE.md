# 🧪 Guide de Tests - Architecture Pipeline

## Vue d'Ensemble

Ce guide explique comment tester la nouvelle architecture pipeline séquencée.

## Tests Créés

### Tests End-to-End

**Fichier** : `supabase/functions/__tests__/pipeline-integration.test.ts`

**8 scénarios de test** :
1. Router redirection vers pipeline
2. Classification observation
3. Gestion récolte avec quantité
4. Détection demandes d'aide
5. Fallback legacy
6. Gestion erreurs
7. Messages multi-actions
8. Performance (< 10s)

## Exécution des Tests

### Tests Locaux (Deno)

```bash
# Installer Deno si nécessaire
curl -fsSL https://deno.land/install.sh | sh

# Exécuter tous les tests
deno test --allow-net --allow-env supabase/functions/__tests__/pipeline-integration.test.ts

# Test spécifique
deno test --allow-net --allow-env --filter "Router" supabase/functions/__tests__/pipeline-integration.test.ts
```

### Tests avec Supabase Local

```bash
# Démarrer Supabase local
supabase start

# Déployer functions
supabase functions deploy thomas-agent-pipeline
supabase functions deploy analyze-message

# Variables d'environnement
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="your-anon-key"
export OPENAI_API_KEY="your-openai-key"

# Exécuter tests
deno test --allow-net --allow-env supabase/functions/__tests__/
```

## Tests Manuels

### Test 1: Router vers Pipeline

```bash
curl -X POST http://localhost:54321/functions/v1/analyze-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "message_id": "test-1",
    "user_message": "J'\''ai observé des pucerons",
    "chat_session_id": "session-1",
    "user_id": "user-1",
    "farm_id": 1,
    "use_pipeline": true
  }'
```

**Attendu** : Redirection vers `thomas-agent-pipeline`

### Test 2: Pipeline Direct

```bash
curl -X POST http://localhost:54321/functions/v1/thomas-agent-pipeline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "message": "J'\''ai récolté 10 kg de tomates",
    "session_id": "session-2",
    "user_id": "user-1",
    "farm_id": 1
  }'
```

**Attendu** : 
- `intent_detected: "harvest"`
- `actions` array avec données récolte
- `processing_time_ms` dans metadata

### Test 3: Legacy Fallback

```bash
curl -X POST http://localhost:54321/functions/v1/analyze-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "message_id": "test-3",
    "user_message": "J'\''ai observé des pucerons",
    "chat_session_id": "session-3",
    "use_pipeline": false
  }'
```

**Attendu** : Utilisation architecture legacy

## Validation des Prompts

### Vérifier Prompts v3.0

```sql
-- Vérifier prompts actifs
SELECT name, version, is_active, LENGTH(content) as chars
FROM chat_prompts
WHERE name IN ('intent_classification', 'tool_selection')
ORDER BY name, version DESC;
```

**Attendu** :
- `intent_classification` v3.0 actif
- `tool_selection` v3.0 actif

### Test Classification Intent

```bash
# Tester prompt intent_classification directement
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "system",
        "content": "Classifie uniquement l'\''intention de ce message agricole français.\n\nMessage: J'\''ai récolté 10 kg de tomates\n\nIntentions possibles:\n- observation\n- task_done\n- harvest\n- help\n\nRetourne UNIQUEMENT JSON:\n{\n  \"intent\": \"harvest\",\n  \"confidence\": 0.95\n}"
      },
      {
        "role": "user",
        "content": "J'\''ai récolté 10 kg de tomates"
      }
    ],
    "temperature": 0.3
  }'
```

## Monitoring Production

### Vérifier Logs Edge Functions

```bash
# Logs thomas-agent-pipeline
supabase functions logs thomas-agent-pipeline --tail

# Logs analyze-message (router)
supabase functions logs analyze-message --tail
```

### Dashboard SQL

```sql
-- Exécutions dernières 24h
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  COUNT(*) FILTER (WHERE success = true) as successful,
  AVG(processing_time_ms) as avg_time,
  intent_detected
FROM chat_agent_executions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, intent_detected
ORDER BY hour DESC;

-- Performance par intent
SELECT 
  intent_detected,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_time,
  MIN(processing_time_ms) as min_time,
  MAX(processing_time_ms) as max_time
FROM chat_agent_executions
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND success = true
GROUP BY intent_detected
ORDER BY count DESC;
```

## Scénarios de Test Critiques

### Scénario 1: Observation Simple

**Message** : "J'ai observé des pucerons sur les tomates serre 1"

**Validation** :
- ✅ Intent: observation
- ✅ Tools: create_observation
- ✅ Plot matched: serre 1
- ✅ Issue extracted: pucerons
- ✅ Response français naturel

### Scénario 2: Récolte avec Quantité

**Message** : "J'ai récolté 10 kg de tomates"

**Validation** :
- ✅ Intent: harvest
- ✅ Tools: create_harvest
- ✅ Quantity: {value: 10, unit: "kg"}
- ✅ Crop: tomates

### Scénario 3: Action Agricole

**Message** : "J'ai passé la herse pendant 2 heures"

**Validation** :
- ✅ Intent: task_done
- ✅ Tools: create_task_done
- ✅ Materials: ["herse"]
- ✅ Duration: {value: 120, unit: "minutes"}

### Scénario 4: Multi-Actions

**Message** : "J'ai observé des pucerons et récolté 5 kg de courgettes"

**Validation** :
- ✅ Intent: multiple
- ✅ Tools: [create_observation, create_harvest]
- ✅ 2 actions créées

### Scénario 5: Aide

**Message** : "Comment créer une parcelle ?"

**Validation** :
- ✅ Intent: help
- ✅ Tools: help
- ✅ Response avec instructions

## Critères de Succès

### Performance
- ⏱️ Pipeline < 5s pour 95% des requêtes
- ⏱️ Intent classification < 1s
- ⏱️ Tool selection < 1.5s
- ⏱️ Tool execution < 2s
- ⏱️ Response synthesis < 1s

### Précision
- 🎯 Intent classification > 90% accuracy
- 🎯 Plot matching > 85% accuracy
- 🎯 Tool selection > 90% accuracy
- 🎯 Overall success rate > 85%

### Robustesse
- 🛡️ Erreurs gérées gracefully (fallback)
- 🛡️ Timeout protection (10s max)
- 🛡️ Legacy fallback fonctionnel
- 🛡️ Logs complets pour debug

## Troubleshooting

### Pipeline ne répond pas

```bash
# Vérifier prompts v3.0
SELECT * FROM chat_prompts 
WHERE name IN ('intent_classification', 'tool_selection') 
AND is_active = true;

# Vérifier clé OpenAI
echo $OPENAI_API_KEY

# Vérifier logs
supabase functions logs thomas-agent-pipeline --tail
```

### Classification incorrecte

```bash
# Tester prompt directement
# (voir section "Test Classification Intent")

# Ajuster température si nécessaire (0.1-0.5)
```

### Performance lente

```sql
-- Identifier étapes lentes
SELECT 
  execution_steps,
  processing_time_ms
FROM chat_agent_executions
WHERE processing_time_ms > 5000
ORDER BY created_at DESC
LIMIT 10;
```

## Prochaines Étapes

1. ✅ Tests end-to-end créés
2. ⏳ Exécuter tests localement
3. ⏳ Déployer en staging
4. ⏳ Tests avec vrais utilisateurs
5. ⏳ Monitoring production 24h
6. ⏳ Ajustement prompts selon feedback
7. ⏳ Migration complète vers pipeline

## Ressources

- **Tests** : `supabase/functions/__tests__/pipeline-integration.test.ts`
- **Prompts** : `supabase/Migrations/029_*.sql`, `030_*.sql`
- **Pipeline** : `supabase/functions/thomas-agent-pipeline/index.ts`
- **Router** : `supabase/functions/analyze-message/index.ts`

