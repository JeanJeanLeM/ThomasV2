# 🔧 Pipeline Fixes - Catégories et Format Réponse

## Corrections Appliquées

### 1. Fonction `determineTaskCategory()`

**Avant:**
```typescript
if (/récolt|ramass/.test(actionLower)) return 'recolte'  // ❌ Invalide
```

**Après:**
```typescript
if (/récolt|ramass/.test(actionLower)) return 'production'  // ✅ Valide
```

**Catégories valides (contrainte DB):**
- `production` - Toutes tâches agricoles (récolte, plantation, désherbage, etc.)
- `marketing` - Ventes, livraisons, marchés
- `administratif` - Comptabilité, factures, papiers
- `general` - Autres

### 2. Statut des Tâches

**Avant:**
```typescript
status: 'a_faire'  // ❌ Invalide
```

**Après:**
```typescript
status: 'en_attente'  // ✅ Valide
```

**Statuts valides:**
- `en_attente` - À faire
- `en_cours` - En cours
- `terminee` - Terminée
- `annulee` - Annulée
- `archivee` - Archivée

### 3. Durée en Heures

**Ajouté:**
```typescript
duration.unit === 'heures' || duration.unit === 'heure'
```

Pour gérer les variations singulier/pluriel.

### 4. Format de Réponse - Actions Même en Erreur

**Avant:**
```typescript
actions: toolResults.filter(tr => tr.success).map(...)  // Ne retourne rien si échec
```

**Après:**
```typescript
actions: toolResults.map(tr => ({
  ...tr,
  status: tr.success ? 'pending' : 'error',  // Indique l'erreur
  error_message: tr.success ? undefined : tr.message
}))
```

**Maintenant:** Les actions sont retournées MÊME si la création a échoué, permettant d'afficher la card avec un indicateur d'erreur.

### 5. Logs de Debug Ajoutés

```typescript
console.log(`📋 [CREATE-TASK] Paramètres reçus:`, params)
console.log(`🏷️ [CREATE-TASK] Catégorie: ${category}`)
console.log(`📦 [CREATE-TASK] Données tâche:`, taskData)
console.log(`✅ [CREATE-TASK] Tâche créée: ${task.id}`)
```

## Déploiement

### Redéployez thomas-agent-pipeline

**Supabase Dashboard** → Edge Functions → **thomas-agent-pipeline**:
1. **Copiez tout** le fichier local mis à jour
2. **Collez** dans l'éditeur
3. **Deploy**
4. ⏱️ Attendez ~30-60 secondes

## Test

Après déploiement:
1. Rechargez votre page (`Ctrl+F5`)
2. Envoyez: **"j'ai récolté des concombres pendant 1 heure"**
3. **Logs attendus:**

```
🎯 [INTENT] Intent: task_done
🛠️ [TOOLS] 1 tool: create_task_done
📋 [CREATE-TASK] Paramètres reçus: {action: "récolter", crop: "concombres"...}
🏷️ [CREATE-TASK] Catégorie: production  ← CORRECT
📦 [CREATE-TASK] Données tâche: {...}
✅ [CREATE-TASK] Tâche créée: abc-123
💬 [SYNTHESIS] Réponse générée
🎉 [PIPELINE] TERMINÉ en 18500ms
```

4. **Résultat dans l'app:**
   - ✅ Card affichée avec l'action
   - ✅ Tâche créée en DB
   - ⏱️ ~14-20 secondes
   - 🎯 Confiance: ~90-95%

## Format de Réponse Pipeline

```json
{
  "success": true,
  "analysis_id": "uuid",
  "actions": [
    {
      "id": "action-uuid",
      "action_type": "task_done",
      "confidence_score": 0.95,
      "status": "pending",
      "original_text": "J'ai récolté...",
      "decomposed_text": "Récolter concombres",
      "extracted_data": {
        "action": "récolter",
        "crop": "concombres",
        "quantity": {"value": 8, "unit": "kg"},
        "duration": {"value": 1, "unit": "heure"}
      },
      "matched_entities": {
        "plot_ids": [18],
        "matched_plots": [...]
      },
      "record_id": "task-uuid"
    }
  ],
  "confidence": 1.0,
  "processing_time_ms": 14219,
  "message": "✅ J'ai bien enregistré votre récolte de concombres!"
}
```

**Compatible avec le format analyze-message!** ✅

---

**Date**: 2026-02-03
**Status**: ✅ Prêt à redéployer
