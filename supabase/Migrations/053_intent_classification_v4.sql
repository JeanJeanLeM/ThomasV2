-- Migration 053: intent_classification v4.0 - Multi-intent avec reconstruction de contexte
-- Date: 2026-02-05
-- Description: Prompt complet refactorisé pour le pipeline, support multi-intent

-- ============================================================================
-- 1. DÉSACTIVER v2.1 (obsolète, remplacé par v4.0)
-- ============================================================================

UPDATE chat_prompts
SET is_active = false, 
    is_default = false,
    updated_at = NOW()
WHERE name = 'intent_classification' AND version = '2.1';

-- ============================================================================
-- 2. GARDER v3.0 ACTIF POUR LE MODE SIMPLE (analyze-message) MAIS PAS DEFAULT
-- ============================================================================

UPDATE chat_prompts
SET is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{note}',
      '"Utilisé par analyze-message (mode simple). Pipeline utilise v4.0."'
    ),
    updated_at = NOW()
WHERE name = 'intent_classification' AND version = '3.0';

-- ============================================================================
-- 3. INSÉRER intent_classification v4.0 (COMPLET)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'intent_classification',
  '4.0',
  true,
  true,
  '# intent_classification v4.0

Classifier l''intention de messages agricoles français. Supporter le multi-intent et la reconstruction de contexte pour les fragments incomplets.

Message: "{{user_message}}"

Contexte ferme: {{farm_context_summary}}

---

## Intentions (définitions concises)

### observation
Constat terrain: problème, symptôme, stade phénologique, dégât équipement/bâtiment, état d''une personne.
Mots-clés: "vu", "observé", "remarqué", "constaté", "il y a", "problème de", "attaque de".
Règle: Verbe constatif + élément observé (problème ou positif). Distinguer de task_done (action de surveillance sans constat).

### task_done
Action agricole réalisée au passé.
Mots-clés: "j''ai [planté|semé|traité|désherbé|arrosé|inspecté|surveillé|biné|passé]".
Règle: Verbe au passé composé + action concrète. "Récolté" SANS quantité explicite = task_done.

### task_planned
Action future planifiée.
Mots-clés: "je vais", "demain", "prévu", "planifier", "il faut", "je dois".
Règle: Futur ou intention explicite avec date/jour.

### manage_plot
Configuration parcelle/serre/tunnel.
Mots-clés: "créer parcelle", "ajouter serre", "nouvelle serre", "modifier parcelle", "planches", "planche".
Règle: Création ou modification d''une parcelle ou unité de surface.

### manage_conversion
Configuration conversion unités (conteneur → kg/L).
Mots-clés: "conversion", "1 caisse =", "panier fait", "configurer conversion", "caisse de tomates", "équivalent".
Règle: Définition d''une équivalence (ex. 1 caisse = 6 kg de tomates).

### manage_material
Configuration matériel/équipement.
Mots-clés: "ajouter matériel", "enregistrer tracteur", "nouveau tracteur", "ajouter herse", "modifier matériel".
Règle: Création ou modification d''un matériel dans l''inventaire.

### help
Question ou demande d''assistance.
Mots-clés: "comment", "où", "quand", "pourquoi", "quel", "?", "aide", "expliquer".

---

## Multi-intent et reconstruction de message

Quand un message contient plusieurs actions reliées par "et", "puis", "ensuite", virgule:

1. Découper en fragments (un par action)
2. Pour chaque fragment, classifier l''intent
3. Reconstruire les fragments incomplets avec le contexte des fragments précédents

**Règle de reconstruction**: Si un fragment ne mentionne pas de culture, parcelle ou matériel alors que le fragment précédent en contient, inférer le sujet manquant.

**Types de contexte à propager**: culture (crop), parcelle (plot), matériel (material). Le dernier mentionné dans un fragment précédent peut s''appliquer au fragment suivant si pertinent sémantiquement.

---

## Format de sortie JSON

Retourne UNIQUEMENT du JSON valide, sans texte avant ou après.

### Cas single-intent

```json
{
  "intents": [
    {
      "intent": "task_done",
      "confidence": 0.95,
      "text_span": "j''ai récolté 4 caisses de tomates",
      "reconstructed_message": "j''ai récolté 4 caisses de tomates"
    }
  ],
  "has_multiple_actions": false,
  "reasoning": "Verbe récolté avec quantité explicite."
}
```

### Cas multi-intent avec reconstruction

```json
{
  "intents": [
    {
      "intent": "task_done",
      "confidence": 0.95,
      "text_span": "j''ai récolté des poivrons pendant 2 heures",
      "reconstructed_message": "j''ai récolté des poivrons pendant 2 heures"
    },
    {
      "intent": "observation",
      "confidence": 0.95,
      "text_span": "j''ai vu des pucerons",
      "reconstructed_message": "j''ai vu des pucerons sur les poivrons",
      "context_inferred": {
        "subject_type": "culture",
        "subject": "poivrons",
        "source": "previous_fragment"
      }
    }
  ],
  "has_multiple_actions": true,
  "reasoning": "Deux actions. Fragment 2 sans culture; poivrons propagé du fragment 1."
}
```

### Structure des champs

```json
{
  "intents": [
    {
      "intent": "observation|task_done|task_planned|manage_plot|manage_conversion|manage_material|help",
      "confidence": 0.0,
      "text_span": "extrait du message pour cette action",
      "reconstructed_message": "message complet avec contexte propagé si besoin",
      "context_inferred": {
        "subject_type": "culture|materiel|parcelle",
        "subject": "valeur propagée",
        "plots": ["..."],
        "source": "previous_fragment"
      }
    }
  ],
  "has_multiple_actions": false,
  "reasoning": "explication courte"
}
```

reconstructed_message = input direct pour l''extraction suivante. context_inferred = optionnel, présent si sujet propagé.

---

## Règles de classification

1. Plusieurs verbes/actions dans le message → has_multiple_actions: true, un intent par action
2. Problème/symptôme/constat spécifique après "vu/observé/remarqué" → observation
3. "inspecté/surveillé/vérifié" sans problème spécifique → task_done
4. Futur ou date planifiée → task_planned
5. Mot interrogatif ou "?" → help
6. Création/modification parcelle → manage_plot
7. Configuration conversion (caisse = kg) → manage_conversion
8. Création/modification matériel → manage_material

---

## Instructions finales

- Toujours retourner un array `intents` (même pour une seule action)
- Appliquer la reconstruction de contexte quand un fragment est incomplet (sans culture/parcelle/matériel) et que le fragment précédent en contient
- subject_type dans context_inferred: culture, materiel ou parcelle selon ce qui a été propagé
- Pas de texte avant ou après le JSON',
  '[
    {"input": "J''ai désherbé la serre 1 pendant 1 heure", "output": {"intents": [{"intent": "task_done", "confidence": 0.95, "text_span": "J''ai désherbé la serre 1 pendant 1 heure", "reconstructed_message": "J''ai désherbé la serre 1 pendant 1 heure"}], "has_multiple_actions": false, "reasoning": "Action passée avec durée."}},
    {"input": "Comment créer une parcelle ?", "output": {"intents": [{"intent": "help", "confidence": 1.0, "text_span": "Comment créer une parcelle ?", "reconstructed_message": "Comment créer une parcelle ?"}], "has_multiple_actions": false, "reasoning": "Question explicite."}},
    {"input": "J''ai récolté des poivrons pendant 2 heures et j''ai vu des pucerons", "output": {"intents": [{"intent": "task_done", "confidence": 0.9, "text_span": "j''ai récolté des poivrons pendant 2 heures", "reconstructed_message": "j''ai récolté des poivrons pendant 2 heures"}, {"intent": "observation", "confidence": 0.95, "text_span": "j''ai vu des pucerons", "reconstructed_message": "j''ai vu des pucerons sur les poivrons", "context_inferred": {"subject_type": "culture", "subject": "poivrons", "source": "previous_fragment"}}], "has_multiple_actions": true, "reasoning": "Deux actions. Fragment 2 sans culture; poivrons propagé."}}
  ]'::jsonb,
  jsonb_build_object(
    'version', '4.0',
    'purpose', 'intent_classification_multi_intent',
    'method', 'pipeline',
    'variables', jsonb_build_array('user_message', 'farm_context_summary'),
    'created_by', 'migration_053',
    'output_format', 'intents_array',
    'improvements', jsonb_build_array(
      'multi_intent_support',
      'context_reconstruction',
      'reconstructed_message_for_extraction',
      'compatible_with_v3_tool_selection'
    ),
    'breaking_changes', 'Output format changed from {intent} to {intents:[]}. Pipeline updated.'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  examples = EXCLUDED.examples,
  metadata = EXCLUDED.metadata,
  is_active = true,
  is_default = true,
  updated_at = NOW();

-- ============================================================================
-- 4. VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  v40_active BOOLEAN;
  v30_active BOOLEAN;
  v21_active BOOLEAN;
BEGIN
  SELECT is_active INTO v40_active FROM chat_prompts WHERE name = 'intent_classification' AND version = '4.0';
  SELECT is_active INTO v30_active FROM chat_prompts WHERE name = 'intent_classification' AND version = '3.0';
  SELECT is_active INTO v21_active FROM chat_prompts WHERE name = 'intent_classification' AND version = '2.1';
  
  IF v40_active = true AND v30_active = true AND (v21_active = false OR v21_active IS NULL) THEN
    RAISE NOTICE '✅ intent_classification: v4.0 (pipeline), v3.0 (analyze-message), v2.1 désactivé';
  ELSE
    RAISE WARNING '⚠️ Vérifier les états: v4.0=%, v3.0=%, v2.1=%', v40_active, v30_active, v21_active;
  END IF;
END $$;
