# 🔧 FIX: Routing Agent Method Pipeline

## Problème Identifié

Le routing entre méthode Simple et Pipeline ne fonctionnait pas car:

1. **`AIChatService.analyzeMessage()` ne passait PAS `farm_id`** à l'Edge Function
2. **`agent_method` avait une valeur par défaut `'simple'`** au lieu de `'auto'`
3. **La condition de détection automatique ne se déclenchait jamais**

## Solution Appliquée

### 1. Modification `aiChatService.ts`
**Fichier**: `src/services/aiChatService.ts`

- ✅ Ajouté paramètre `farmId?: number` à `analyzeMessage()`
- ✅ Passé `farm_id` et `agent_method: 'auto'` à l'Edge Function
- ✅ Ajouté logs pour tracer le routing

### 2. Modification `analyze-message/index.ts`
**Fichier**: `supabase/functions/analyze-message/index.ts`

- ✅ Changé valeur par défaut `agent_method` de `'simple'` à `'auto'`
- ✅ Amélioré logique de détection: si `agent_method === 'auto'`, lit `farm_agent_config`
- ✅ Ajouté gestion d'erreur si `farm_id` manquant (fallback `simple`)
- ✅ Ajouté logs détaillés pour debug

### 3. Modification `ChatConversation.tsx`
**Fichier**: `src/components/ChatConversation.tsx`

Modifié **3 appels** à `analyzeMessage()` pour passer `activeFarm?.farm_id`:

1. **Ligne ~1279**: Analyse de transcription audio
```typescript
const analysisResult = await AIChatService.analyzeMessage(
  dbMessage.id,
  transcription.text,
  chat.id,
  activeFarm?.farm_id  // ✅ AJOUTÉ
);
```

2. **Ligne ~1511**: Analyse rétroactive
```typescript
const result = await AIChatService.analyzeMessage(
  actualMessageId, 
  messageText, 
  chat.id, 
  activeFarm?.farm_id  // ✅ AJOUTÉ
);
```

3. **Ligne ~2224**: Analyse normale de message
```typescript
const result = await AIChatService.analyzeMessage(
  dbMessage.id, 
  originalText, 
  chat.id, 
  activeFarm?.farm_id  // ✅ AJOUTÉ
);
```

### 4. Modification `ChatServiceDirect.ts` (Bonus)
**Fichier**: `src/services/ChatServiceDirect.ts`

- ✅ Ajouté paramètre `farmId?: number` à `analyzeMessageDirect()`
- ✅ Passé `farm_id` et `agent_method: 'auto'`

## Nouveau Flow de Routing

```
Message → AIChatService.analyzeMessage(farmId) 
         → Edge Function analyze-message
         → Lit agent_method='auto'
         → Query farm_agent_config WHERE farm_id
         → Trouve 'pipeline'
         → Redirige vers thomas-agent-pipeline ✅
         → Pipeline exécute (3 LLM calls)
         → Retour au client
```

## Logs à Observer

### Dans le Client (navigateur):
```
🏠 [AI-ANALYSIS] Farm ID: 16
🔀 [AI-ANALYSIS] Mode routing: auto (détection depuis farm_agent_config)
```

### Dans analyze-message Edge Function:
```
🔀 [ROUTER] Agent method param: auto
🏠 [ROUTER] Farm ID: 16
🔀 [ROUTER] Méthode auto-détectée depuis DB: pipeline
➡️ [ROUTER] Redirecting to thomas-agent-pipeline...
```

### Dans thomas-agent-pipeline Edge Function:
```
🚀 Thomas Agent Pipeline v2.0 - Real Implementation
🔍 [PIPELINE] === DÉBUT PIPELINE AGENT ===
🧠 [PIPELINE] ÉTAPE 1/5: Construction contexte...
🎯 [PIPELINE] ÉTAPE 2/5: Classification intention (LLM)...
🛠️ [PIPELINE] ÉTAPE 3/5: Sélection tools (LLM)...
⚡ [PIPELINE] ÉTAPE 4/5: Exécution tools...
💬 [PIPELINE] ÉTAPE 5/5: Synthèse réponse (LLM)...
🎉 [PIPELINE] TERMINÉ en 18500ms
```

## Test

1. **Vérifier en DB** que votre ferme est en mode `pipeline`:
```sql
SELECT agent_method FROM farm_agent_config WHERE farm_id = 16;
```

2. **Envoyer un message** dans le chat:
```
"j'ai observé des pucerons"
```

3. **Observer les logs** dans la console navigateur et Edge Functions

4. **Vérifier le temps**:
- Si ~8-10s → Simple (❌ routing pas activé)
- Si ~18-25s → Pipeline (✅ routing fonctionne!)

## Fichiers Modifiés

- ✅ `src/services/aiChatService.ts`
- ✅ `src/services/ChatServiceDirect.ts`
- ✅ `src/components/ChatConversation.tsx`
- ✅ `supabase/functions/analyze-message/index.ts`

## Prochaines Étapes

1. Tester avec un message simple
2. Observer les logs pour confirmer routing
3. Comparer temps d'exécution (simple vs pipeline)
4. Vérifier les stats dans `farm_agent_config`

---

**Date**: 2026-02-03
**Status**: ✅ Prêt à tester
