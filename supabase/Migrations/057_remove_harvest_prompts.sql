-- Migration 057: Retirer harvest des prompts - harvest = task_done avec quantité
-- Date: 2026-02-06
-- Description: Créer v4.1 intent_classification et v3.2 tool_selection sans harvest

-- ============================================================================
-- 1. DÉSACTIVER intent_classification v4.0 (remplacé par v4.1)
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplacé par v4.1 - harvest retiré"'
    ),
    updated_at = NOW()
WHERE name = 'intent_classification' AND version = '4.0';

-- ============================================================================
-- 2. INSÉRER intent_classification v4.1 (harvest retiré)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'intent_classification',
  '4.1',
  true,
  true,
  '# intent_classification v4.1

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
Action agricole réalisée au passé, y compris les récoltes (avec ou sans quantité).
Mots-clés: "j''ai [planté|semé|traité|désherbé|arrosé|inspecté|surveillé|biné|passé|récolté]".
Règle: Verbe au passé composé + action concrète. La quantité est une propriété de la tâche, pas un intent séparé.

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
      "text_span": "j''ai récolté des tomates pendant 1 heure",
      "reconstructed_message": "j''ai récolté des tomates pendant 1 heure"
    }
  ],
  "has_multiple_actions": false,
  "reasoning": "Action réalisée au passé avec durée."
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

- **intent** (obligatoire): observation | task_done | task_planned | manage_plot | manage_conversion | manage_material | help
- **confidence** (obligatoire): nombre entre 0 et 1
- **text_span** (obligatoire): portion du message original pour ce fragment
- **reconstructed_message** (obligatoire): message complété avec contexte si nécessaire
- **context_inferred** (optionnel): { subject_type, subject, source } si contexte propagé

Retourne JSON valide uniquement.',
  '["j''ai récolté des tomates", "j''ai vu des pucerons sur les courgettes", "créer une parcelle Serre 3"]',
  jsonb_build_object(
    'version', '4.1',
    'purpose', 'intent_classification',
    'changes', 'harvest retiré - récolte = task_done avec quantité',
    'variables', jsonb_build_array('user_message', 'farm_context_summary'),
    'created_by', 'migration_057'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- 3. DÉSACTIVER tool_selection v3.1 (remplacé par v3.2)
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplacé par v3.2 - create_harvest retiré"'
    ),
    updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.1';

-- ============================================================================
-- 4. INSÉRER tool_selection v3.2 (create_harvest retiré)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'tool_selection',
  '3.2',
  true,
  true,
  'Sélectionne les tools à utiliser et extrais leurs paramètres.

Intent détecté: {{intent}}
Message utilisateur: {{user_message}}
Contexte ferme: {{farm_context}}

Tools disponibles:
{{available_tools}}

## RÈGLES D''EXTRACTION PAR TOOL:

### Pour create_observation:
- crop: culture concernée
- issue: problème spécifique (pucerons, jaunissement, mildiou)
- plot_reference: mention de parcelle ("serre 1", "tunnel nord")
- category: ravageurs|maladies|physiologie|climatique|autre
- severity: faible|moyen|grave (optionnel)

### Pour create_task_done:
- action: verbe à l''infinitif (semer, récolter, traiter, désherber)
- crop: culture (optionnel)
- plot_reference: parcelle mentionnée
- materials: liste d''outils/matériels mentionnés
- duration: {value: number, unit: "minutes"|"heures"}
- quantity: {value: number, unit: "kg"|"caisses"|"L"|etc} (optionnel, pour récoltes)
- quantity_nature: nature spécifique (tomates, compost, bouillie)
- quantity_type: recolte|engrais|produit_phyto|plantation|vente|autre — UNIQUEMENT si une quantité est exprimée (value, unit ou nature). Si aucune quantité: NE PAS inclure quantity_type (null).

### Pour create_task_planned:
- action: action à faire
- plot_reference: parcelle
- scheduled_date: date au format YYYY-MM-DD
- scheduled_time: heure au format HH:MM (optionnel)

### Pour help:
- help_topic: UNE des valeurs suivantes selon la question posée
  - manage_plot: question sur parcelles, serres, tunnels, planches
  - manage_material: question sur matériel, tracteur, outil, équipement
  - manage_conversion: question sur conversions, caisses, kg, équivalents
  - task: question sur tâches, actions, récoltes, enregistrer
  - observation: question sur observations, constats, problèmes
  - team: question sur équipe, membres, invitations
  - app_features: question sur navigation, où trouver, paramètres
  - general: autre question d''aide générale

### Pour manage_plot:
- name: nom parcelle (Serre 2, Tunnel Nord)
- type: serre_plastique|serre_verre|plein_champ|tunnel|etc
- length, width: dimensions en mètres
- surface_units_count: nombre de planches

### Pour manage_conversion:
- container_name: caisse, panier, bac
- crop_name: tomates, concombres
- conversion_value: nombre
- conversion_unit: kg, L

### Pour manage_material:
- name: nom matériel
- category: tracteurs|outils_tracteur|outils_manuels|etc
- brand, model: optionnel

## FORMAT DE SORTIE JSON:

Retourne UNIQUEMENT du JSON valide:
{
  "tools": [
    {
      "tool_name": "help",
      "confidence": 0.95,
      "parameters": {
        "help_topic": "task"
      }
    }
  ]
}

## EXEMPLES:

Message: "Comment ajouter une action ?"
→ tool: help, parameters: { help_topic: "task" }

Message: "Où configurer mes conversions ?"
→ tool: help, parameters: { help_topic: "manage_conversion" }

Message: "Comment créer une parcelle ?"
→ tool: help, parameters: { help_topic: "manage_plot" }

Message: "J''ai récolté 10 kg de tomates"
→ tool: create_task_done, parameters: { action: "récolter", crop: "tomates", quantity: {value: 10, unit: "kg"} }

Message: "J''ai vu des pucerons sur les courgettes"
→ tool: create_observation, parameters: { crop: "courgettes", issue: "pucerons", category: "ravageurs" }

Retourne JSON valide uniquement.',
  '["j''ai récolté des tomates", "j''ai observé des pucerons", "créer une parcelle Serre 3"]',
  jsonb_build_object(
    'version', '3.2',
    'purpose', 'tool_selection',
    'changes', 'create_harvest retiré - récoltes via create_task_done avec quantity',
    'variables', jsonb_build_array('intent', 'user_message', 'farm_context', 'available_tools'),
    'created_by', 'migration_057'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  ic_v41_active BOOLEAN;
  ts_v32_active BOOLEAN;
BEGIN
  SELECT is_active INTO ic_v41_active FROM chat_prompts WHERE name = 'intent_classification' AND version = '4.1';
  SELECT is_active INTO ts_v32_active FROM chat_prompts WHERE name = 'tool_selection' AND version = '3.2';
  
  IF ic_v41_active = true AND ts_v32_active = true THEN
    RAISE NOTICE '✅ Migration 057 réussie: intent_classification v4.1 et tool_selection v3.2 actifs sans harvest';
  ELSE
    RAISE WARNING '⚠️ Vérifier: ic_v41=%, ts_v32=%', ic_v41_active, ts_v32_active;
  END IF;
END $$;
