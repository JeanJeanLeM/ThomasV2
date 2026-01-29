# 🧪 Guide de Test : Discrimination Observation vs Tâche

## 🎯 **Objectif**

Valider que Thomas Agent distingue correctement les **observations** (constats) des **tâches effectuées** (actions), particulièrement avec le verbe "observer".

---

## 🔴 **Problème Résolu**

### **Avant (v2.0) - Confusion**
Message : "J'ai observé des dégâts de mineuse sur les tomates"
- ❌ Classé comme : `task_done` avec action "observer"
- ❌ Problème : Confusion entre constat et action

### **Après (v2.1) - Discrimination**
Message : "J'ai observé des dégâts de mineuse sur les tomates"
- ✅ Classé comme : `observation_creation` 
- ✅ Raison : Problème spécifique (mineuse) = constat terrain

---

## 📋 **Test Cases à Valider**

### **Catégorie 1 : OBSERVATIONS (Constats) ✅**

Tous ces messages doivent être classés `observation_creation` :

| # | Message | Intent Attendu | Raison |
|---|---------|----------------|--------|
| 1 | "J'ai observé des dégâts de mineuse sur les tomates" | `observation_creation` | Problème spécifique (dégâts) |
| 2 | "J'ai vu des pucerons dans la serre 1" | `observation_creation` | Ravageur identifié (pucerons) |
| 3 | "J'ai remarqué un jaunissement des feuilles" | `observation_creation` | Symptôme physiologique |
| 4 | "J'ai constaté un problème d'arrosage" | `observation_creation` | Problème identifié |
| 5 | "Des limaces sur les salades ce matin" | `observation_creation` | Ravageur sans verbe explicite |
| 6 | "J'ai observé des traces de mildiou" | `observation_creation` | Maladie identifiée |
| 7 | "J'ai vu que les plants sont flétris" | `observation_creation` | Symptôme de stress |

### **Catégorie 2 : TÂCHES EFFECTUÉES (Actions) ✅**

Tous ces messages doivent être classés `task_done` :

| # | Message | Intent Attendu | Raison |
|---|---------|----------------|--------|
| 8 | "J'ai inspecté les serres ce matin" | `task_done` | Action de surveillance |
| 9 | "J'ai fait le tour des parcelles" | `task_done` | Action générique |
| 10 | "J'ai surveillé les cultures pendant 2h" | `task_done` | Action avec durée |
| 11 | "J'ai vérifié l'état des plants" | `task_done` | Action de contrôle |
| 12 | "J'ai contrôlé toutes les serres avec Jean" | `task_done` | Action collaborative |
| 13 | "J'ai observé les cultures" | `task_done` | Action générique sans problème |
| 14 | "Inspection complète du tunnel nord" | `task_done` | Action sans problème |

### **Catégorie 3 : CAS LIMITES ⚠️**

Messages ambigus à tester avec attention :

| # | Message | Intent Attendu | Raison | Notes |
|---|---------|----------------|--------|-------|
| 15 | "J'ai observé" | `help` ou `unclear` | Trop vague | Devrait demander clarification |
| 16 | "J'ai observé les tomates" | `task_done` | Pas de problème mentionné | Action générique |
| 17 | "J'ai observé les tomates qui ont des pucerons" | `observation_creation` | Problème présent | Même si formulation complexe |
| 18 | "Surveillance des cultures toute la journée, rien à signaler" | `task_done` | Action + pas de problème | Tâche de surveillance |
| 19 | "Tour des parcelles : pucerons serre 1" | `observation_creation` | Problème identifié | Malgré format télégraphique |

### **Catégorie 4 : ACTIONS MULTIPLES 🔀**

Messages avec plusieurs actions :

| # | Message | Intents Attendus | Raison |
|---|---------|------------------|--------|
| 20 | "J'ai inspecté les serres et observé des pucerons" | `task_done` + `observation_creation` | 2 actions distinctes |
| 21 | "Fait le tour, vu des limaces sur salades" | `task_done` + `observation_creation` | Action puis constat |
| 22 | "J'ai observé les cultures et tout va bien" | `task_done` | Action sans problème |

---

## 🧪 **Protocole de Test**

### **1. Déployer la Migration**

```bash
# Appliquer la migration v2.1
psql -h [SUPABASE_HOST] -U postgres -d postgres -f supabase/Migrations/022_fix_observation_discrimination.sql

# Vérifier activation
SELECT name, version, is_active 
FROM chat_prompts 
WHERE name IN ('intent_classification', 'tool_selection')
ORDER BY version DESC;
```

**Résultat attendu** :
- `intent_classification` v2.1 : `is_active = true`
- `tool_selection` v2.1 : `is_active = true`
- Versions 2.0 : `is_active = false`

### **2. Tester avec l'Interface Chat**

Pour chaque message de test :

1. **Envoyer le message** dans le chat Thomas
2. **Observer les logs console** :
   - `[CHAT-ANALYSIS] Actions identifiées:`
   - Vérifier `action_type` dans les logs
3. **Vérifier la réponse** de Thomas
4. **Consulter la DB** pour validation

```javascript
// Logs à chercher dans la console
console.log('[CHAT-ANALYSIS] Actions identifiées:');
console.log('   1. observation: "..." (confiance: 95%)');  // ✅ Correct
// OU
console.log('   1. task_done: "..." (confiance: 95%)');    // ❌ Vérifier
```

### **3. Vérifier en Base de Données**

```sql
-- Dernières analyses avec discrimination
SELECT 
  cma.id,
  cma.user_message,
  cma.analysis_result->>'intent' as intent,
  cma.analysis_result->>'discrimination_reasoning' as discrimination,
  cma.confidence_score,
  cma.created_at
FROM chat_message_analyses cma
ORDER BY cma.created_at DESC
LIMIT 20;

-- Actions créées (type correct ?)
SELECT 
  caa.id,
  caa.action_type,
  caa.action_data->>'original_text' as original_text,
  caa.confidence_score,
  caa.status
FROM chat_analyzed_actions caa
ORDER BY caa.created_at DESC
LIMIT 20;
```

### **4. Validation Automatique (si tests configurés)**

```bash
# Si tests automatisés existent
npm test src/services/agent/ -- --testNamePattern="observation.*discrimination"
```

---

## ✅ **Critères de Succès**

### **Métriques Cibles**

| Métrique | Cible | Comment Mesurer |
|----------|-------|-----------------|
| **Précision observations** | >95% | Catégorie 1 : 7/7 corrects |
| **Précision tâches** | >95% | Catégorie 2 : 7/7 corrects |
| **Gestion cas limites** | >80% | Catégorie 3 : 4/5 corrects |
| **Actions multiples** | >90% | Catégorie 4 : Toutes séparées |
| **Confiance moyenne** | >0.85 | Logs console |
| **Faux positifs** | <5% | Observations classées task |
| **Faux négatifs** | <5% | Tâches classées observation |

### **Validation Qualitative**

- ✅ Le champ `discrimination_reasoning` est présent dans les logs
- ✅ Thomas explique clairement son choix
- ✅ Les observations créées ont un `category` pertinent (ravageurs, maladies, etc.)
- ✅ Les tâches créées ont une `action` claire (inspecter, surveiller, etc.)
- ✅ Pas de régression sur autres types (task_planned, harvest, help)

---

## 📊 **Template de Rapport**

Après avoir testé tous les cas :

```markdown
# Rapport Test Discrimination v2.1

**Date** : YYYY-MM-DD
**Testeur** : [Nom]
**Environnement** : Dev/Staging/Prod

## Résultats

### Catégorie 1 - Observations
- ✅ Test 1 : Passé (confidence: 0.95)
- ✅ Test 2 : Passé (confidence: 0.92)
- ❌ Test 3 : Échoué (classé task_done au lieu d'observation)
...

**Score** : 6/7 (86%)

### Catégorie 2 - Tâches
- ✅ Test 8 : Passé
...

**Score** : 7/7 (100%)

### Catégorie 3 - Cas limites
- ✅ Test 15 : Passé (demande clarification)
...

**Score** : 4/5 (80%)

### Catégorie 4 - Actions multiples
- ✅ Test 20 : Passé (2 actions détectées)
...

**Score** : 3/3 (100%)

## Métriques Globales
- **Précision totale** : 20/22 (91%)
- **Confiance moyenne** : 0.89
- **Faux positifs** : 1 (4.5%)
- **Faux négatifs** : 1 (4.5%)

## Problèmes Identifiés
1. Test 3 : "J'ai remarqué un jaunissement" classé task_done
   - **Cause probable** : Mot "jaunissement" pas dans liste problèmes
   - **Fix** : Enrichir keywords maladies dans prompt

## Recommandations
- ✅ Déploiement en production OK
- ⚠️ Surveiller cas avec "remarqué"
- 📝 Ajouter plus d'exemples de symptômes physiologiques
```

---

## 🚨 **Dépannage**

### **Problème : Toujours classé task_done**

**Causes possibles** :
1. Migration pas appliquée → Vérifier versions prompts
2. Cache prompts actif → Redémarrer service
3. Prompt v2.0 toujours actif → Vérifier `is_active`

**Solution** :
```sql
-- Forcer désactivation v2.0
UPDATE chat_prompts SET is_active = false 
WHERE version = '2.0' AND name IN ('intent_classification', 'tool_selection');

-- Forcer activation v2.1
UPDATE chat_prompts SET is_active = true 
WHERE version = '2.1' AND name IN ('intent_classification', 'tool_selection');
```

### **Problème : Confiance trop basse (<0.7)**

**Causes** :
- Message ambigu ou incomplet
- Manque de contexte (parcelle, culture)
- Formulation inhabituelle

**Solution** :
- Ajouter exemples dans prompt v2.1
- Enrichir few-shot examples
- Améliorer extraction entités

### **Problème : Actions multiples non détectées**

**Cause** : Prompt tool_selection ne split pas correctement

**Solution** : Vérifier section "multiple actions" dans prompt v2.1

---

## 🎯 **Prochaines Améliorations**

Si discrimination fonctionne bien (>90%) :

1. **Enrichir synonymes problèmes** : carences, stress, etc.
2. **Ajouter catégories observations** : météo, sols, etc.
3. **Fine-tuning LLM** : Dataset spécifique agriculture française
4. **A/B Testing** : Comparer v2.0 vs v2.1 sur production
5. **Feedback loop** : Apprentissage depuis corrections utilisateurs

---

## 📚 **Références**

- Migration : `supabase/Migrations/022_fix_observation_discrimination.sql`
- Prompts v2.1 : Table `chat_prompts` (intent_classification, tool_selection)
- Agent : `agents/03_CHAT_AI_SPECIALIST.md`
- Schema : `supabase/DB_schema`

