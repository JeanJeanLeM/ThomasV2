-- Migration: Fix discrimination observation vs task_done
-- Date: 2026-01-05
-- Description: Améliore la discrimination entre observations (constats) et tâches effectuées

-- ============================================================================
-- MISE À JOUR PROMPT: Intent Classification v2.1
-- ============================================================================

INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata)
VALUES (
  'intent_classification',
  'Classifie précisément l''intention de ce message agricole français.

## 📤 Message
"{{user_message}}"

## 🎯 Classification d''Intention

### 🔍 RÈGLE CRITIQUE - Discrimination "Observer"

⚠️ **Le verbe "observer" a DEUX sens en français** :

#### **CONSTATIF (→ observation_creation)**
L''utilisateur **remarque/constate** un problème, symptôme, anomalie :
- "J''ai **observé** des dégâts de mineuse" ✅ observation
- "J''ai **vu** des pucerons sur les tomates" ✅ observation
- "J''ai **remarqué** un jaunissement des feuilles" ✅ observation
- "J''ai **constaté** un problème d''arrosage" ✅ observation

**Indicateurs clés** : Mention d''un problème/symptôme/anomalie spécifique après le verbe

#### **ACTIF (→ task_done)**
L''utilisateur **effectue une action** de surveillance/inspection :
- "J''ai **inspecté** les serres" ✅ task_done
- "J''ai **fait une tournée** d''observation" ✅ task_done  
- "J''ai **surveillé** les cultures pendant 2h" ✅ task_done
- "J''ai **vérifié** l''état des plants" ✅ task_done

**Indicateurs clés** : Action de surveillance générale, durée mentionnée, pas de problème spécifique

---

### Intentions Principales:

1. **observation_creation** - Constats terrain (passifs)
   - **Focus** : PROBLÈME/SYMPTÔME détecté
   - **Mots-clés principaux** : 
     - Constats : "remarqué", "constaté", "vu", "trouvé"
     - Problèmes : "dégâts", "maladie", "ravageur", "pucerons", "jaunissement", "flétrissement"
     - Conditions : "stress hydrique", "carence", "brûlure"
   - **Structure typique** : "J''ai [verbe constatif] [problème spécifique] sur [culture/parcelle]"
   
2. **task_done** - Actions réalisées (actives)
   - **Focus** : TRAVAIL effectué avec durée/effort
   - **Mots-clés principaux** : 
     - Actions : "fait", "effectué", "réalisé", "accompli", "terminé"
     - Travaux : "planté", "traité", "arrosé", "taillé", "désherbé", "paillé"
     - Surveillance : "inspecté", "surveillé", "vérifié", "contrôlé", "fait le tour"
   - **Structure typique** : "J''ai [action] [cible] [avec matériel/durée/quantité]"
   
3. **task_planned** - Actions futures  
   - **Focus** : PLANIFICATION avec date future
   - **Mots-clés** : "vais", "prévu", "demain", "lundi", "planifier", "programmer"
   
4. **harvest** - Récoltes spécialisées
   - **Focus** : QUANTITÉS récoltées
   - **Mots-clés** : "récolté", "ramassé", "cueilli" + quantités chiffrées
   
5. **management** - Gestion/Configuration
   - **Focus** : CONFIGURATION système
   - **Mots-clés** : "créer parcelle", "ajouter matériel", "configurer", "paramétrer"
   
6. **help** - Demandes d''aide
   - **Focus** : QUESTION utilisateur
   - **Mots-clés** : "comment", "où", "aide", "?", "expliquer", "qui peut"

## 🧪 Exemples de Discrimination

### ✅ OBSERVATION (Constat)
- "J''ai observé des dégâts de mineuse sur les tomates"
  → Intent: observation_creation (problème spécifique détecté)
  
- "J''ai remarqué que les feuilles jaunissent dans la serre 1"
  → Intent: observation_creation (symptôme physiologique)

- "J''ai vu des limaces sur les salades ce matin"
  → Intent: observation_creation (ravageur identifié)

### ✅ TÂCHE EFFECTUÉE (Action)
- "J''ai inspecté toutes les serres ce matin"
  → Intent: task_done (action de surveillance sans problème)
  
- "J''ai fait le tour des parcelles pendant 1h"
  → Intent: task_done (action avec durée)

- "J''ai vérifié l''état des plants avec Jean"
  → Intent: task_done (action collaborative)

### ⚠️ CAS AMBIGUS
Si le message contient "observé" mais **sans problème spécifique** :
- "J''ai observé les cultures" → Intent: task_done (action générique)
- "J''ai observé des pucerons" → Intent: observation_creation (problème précis)

**RÈGLE** : Si problème/symptôme/ravageur mentionné → observation_creation
            Sinon → task_done

## 📊 Format de Réponse JSON

```json
{
  "intent": "observation_creation",
  "confidence": 0.95,
  "reasoning": "L''utilisateur décrit un problème spécifique (dégâts de mineuse) observé sur une culture. C''est un CONSTAT, pas une action de surveillance.",
  "discrimination_applied": "Le message contient un problème spécifique après ''observé'', donc observation_creation et non task_done",
  "entities_detected": {
    "action_indicators": ["observé"],
    "problem_indicators": ["dégâts", "mineuse"],
    "location_indicators": ["serre 1"],
    "crop_indicators": ["tomates"]
  }
}
```

## ⚡ Instructions Finales
- **TOUJOURS** vérifier si un problème spécifique est mentionné après "observer/voir/remarquer"
- **SI problème spécifique** → observation_creation
- **SI action générique sans problème** → task_done
- **En cas de doute** : privilégier observation_creation si symptôme/ravageur présent',

  '[
    {
      "input": "J''ai observé des dégâts de mineuse sur les tomates",
      "intent": "observation_creation",
      "reasoning": "Problème spécifique (dégâts mineuse) = constat terrain"
    },
    {
      "input": "J''ai inspecté les serres ce matin",
      "intent": "task_done", 
      "reasoning": "Action de surveillance sans problème spécifique"
    },
    {
      "input": "J''ai vu des pucerons sur la serre 1",
      "intent": "observation_creation",
      "reasoning": "Ravageur identifié (pucerons) = observation"
    },
    {
      "input": "J''ai fait le tour des parcelles",
      "intent": "task_done",
      "reasoning": "Action générique de surveillance = tâche"
    }
  ]'::jsonb,

  '2.1', 
  true,

  '{
    "category": "classification",
    "output_format": "json",
    "temperature": 0.1,
    "variables": ["user_message"],
    "improvements": ["discrimination_observer", "explicit_rules", "more_examples"],
    "created_by": "chat_ai_specialist_fix_2026_01_05"
  }'::jsonb
) ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  examples = EXCLUDED.examples,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- MISE À JOUR PROMPT: Tool Selection v2.1
-- ============================================================================

INSERT INTO public.chat_prompts (name, content, examples, version, is_active, metadata)
VALUES (
  'tool_selection',
  'Analyse ce message agricole et identifie précisément quels tools utiliser.

## 📤 Message Utilisateur
"{{user_message}}"

## 🏗️ Contexte Ferme  
{{farm_context}}

## 🛠️ Tools Disponibles
{{available_tools}}

## 🎯 Instructions d''Analyse

### 1. **Classification d''Intention - RÈGLES DE DISCRIMINATION**

#### 🔍 **OBSERVATION vs TÂCHE - RÈGLE CRITIQUE**

⚠️ **Différencier "observer" CONSTATIF vs ACTIF** :

**→ observation_creation** (Constat terrain)
- L''utilisateur **remarque/constate un PROBLÈME spécifique**
- Exemples :
  - "J''ai observé **des dégâts** de mineuse" ✅
  - "J''ai vu **des pucerons**" ✅
  - "J''ai remarqué **un jaunissement**" ✅
- **Test** : Y a-t-il un problème/symptôme/ravageur mentionné ? → OUI = observation

**→ task_done** (Action effectuée)
- L''utilisateur **effectue une SURVEILLANCE/ACTION** sans problème spécifique
- Exemples :
  - "J''ai inspecté les serres" ✅
  - "J''ai fait le tour des parcelles" ✅
  - "J''ai surveillé les cultures 2h" ✅
- **Test** : Action générique ou durée mentionnée sans problème ? → OUI = task_done

---

### Types d''Intentions :

- **observation_creation** : Constat terrain, problème/symptôme/ravageur détecté
- **task_done** : Action accomplie, travail réalisé avec effort/durée/matériel
- **task_planned** : Action future, programmation, "je vais faire", "demain"  
- **harvest** : Récolte avec quantités (spécialisé)
- **management** : Configuration parcelles/matériel/conversions
- **help** : Question, demande d''aide, "comment", "où", "?"

### 2. **Extraction d''Entités**
Identifie précisément :
- **Parcelles** : noms, références, types ("serre 1", "tunnel nord")
- **Cultures** : plantes mentionnées ("tomates", "courgettes")
- **Quantités** : valeurs + unités ("3 caisses", "15 kg", "2 litres")
- **Matériels** : outils, tracteurs, équipements mentionnés
- **Dates/Heures** : références temporelles ("demain", "lundi", "14h")
- **Problèmes** : ravageurs, maladies, symptômes ("pucerons", "jaunissement")
- **Qualité** : évaluations ("excellent", "bon", "mauvais")

## 📋 Format de Réponse JSON STRICT

```json
{
  "message_analysis": {
    "primary_intent": "observation_creation|task_done|task_planned|harvest|management|help",
    "discrimination_reasoning": "Explication de pourquoi observation vs task",
    "secondary_intents": ["..."],
    "confidence": 0.95,
    "complexity": "simple|medium|complex",
    "entities_detected": {
      "plots": ["serre 1"],
      "crops": ["tomates"],
      "problems": ["dégâts", "mineuse"],
      "quantities": ["3 caisses"],
      "materials": ["tracteur"],
      "dates": ["demain"]
    }
  },
  "tools_to_use": [
    {
      "tool_name": "create_observation",
      "confidence": 0.9,
      "parameters": {
        "crop": "tomates",
        "issue": "dégâts de mineuse",
        "plot_reference": "serre 1",
        "severity": "medium",
        "category": "ravageurs"
      },
      "reasoning": "L''utilisateur décrit un constat de ravageur (mineuse) sur une culture spécifique (tomates). Problème identifié = observation, pas tâche."
    }
  ],
  "message_type": "single|multiple|help|unclear"
}
```

## 🧪 Exemples de Classification

### ✅ create_observation (Constats)
```json
{
  "message": "J''ai observé des dégâts de mineuse sur les tomates",
  "tool": "create_observation",
  "reasoning": "Problème spécifique (dégâts mineuse) identifié = constat"
}
```

### ✅ create_task_done (Actions)
```json
{
  "message": "J''ai inspecté toutes les serres pendant 2h",
  "tool": "create_task_done",
  "reasoning": "Action de surveillance avec durée, pas de problème = tâche"
}
```

## ⚠️ Règles Importantes
- **TOUJOURS** distinguer observation (constat) vs tâche (action)
- **SI problème/symptôme/ravageur mentionné** → create_observation
- **SI action générique sans problème** → create_task_done
- **Un tool par action** identifiée dans le message
- **Paramètres complets** autant que possible depuis le message
- **Confiance réaliste** basée sur clarté du message  
- **Reasoning explicite** pour chaque tool sélectionné
- **JSON valide** obligatoire',

  '[
    {
      "input": "J''ai observé des dégâts de mineuse sur les tomates",
      "output": "JSON avec create_observation tool sélectionné",
      "tools_used": ["create_observation"],
      "reasoning": "Problème spécifique détecté"
    },
    {
      "input": "J''ai inspecté les serres ce matin",
      "output": "JSON avec create_task_done tool sélectionné",
      "tools_used": ["create_task_done"],
      "reasoning": "Action de surveillance sans problème"
    }
  ]'::jsonb,

  '2.1',
  true,

  '{
    "category": "classification",
    "purpose": "tool_selection",
    "output_format": "json",
    "temperature": 0.1,
    "variables": ["user_message", "farm_context", "available_tools"],
    "improvements": ["discrimination_observer", "explicit_reasoning"],
    "created_by": "chat_ai_specialist_fix_2026_01_05"
  }'::jsonb
) ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  examples = EXCLUDED.examples,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- DÉSACTIVATION VERSIONS PRÉCÉDENTES
-- ============================================================================

-- Désactiver les versions 2.0
UPDATE public.chat_prompts 
SET is_active = false 
WHERE name IN ('intent_classification', 'tool_selection')
  AND version = '2.0'
  AND is_active = true;

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$ 
DECLARE
  v21_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v21_count
  FROM chat_prompts 
  WHERE version = '2.1' AND is_active = true;
  
  IF v21_count >= 2 THEN
    RAISE NOTICE '✅ Prompts v2.1 activés avec discrimination améliorée';
  ELSE
    RAISE WARNING '⚠️ Problème activation prompts v2.1';
  END IF;
  
  RAISE NOTICE '🎯 Migration discrimination observation vs task_done terminée';
END $$;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

-- Cette migration résout la confusion entre "observer" constatif (observation)
-- et "observer" actif (task_done) en ajoutant :
--
-- ✅ Règle de discrimination explicite dans les prompts
-- ✅ Exemples contrastés pour chaque cas
-- ✅ Test décisionnel : problème spécifique mentionné ?
-- ✅ Champ "discrimination_reasoning" dans la réponse JSON
--
-- EXEMPLES :
-- - "J'ai observé des dégâts" → observation (problème présent)
-- - "J'ai inspecté les serres" → task_done (action sans problème)


