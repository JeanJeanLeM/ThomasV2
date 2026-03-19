-- Migration 054: Prompts v3.1 complets (tool_selection + response_synthesis)
-- Date: 2026-02-05
-- Description: Insertion complète des prompts avec support help_topic et section help
-- Note: Utilise INSERT ON CONFLICT au lieu de REPLACE pour garantir la mise à jour

-- ============================================================================
-- 1. DÉSACTIVER tool_selection v3.0 pour le pipeline (garder pour référence)
-- ============================================================================

UPDATE chat_prompts
SET is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{note}',
      '"Remplacé par v3.1 pour le pipeline"'
    ),
    updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.0';

-- ============================================================================
-- 2. INSÉRER tool_selection v3.1 COMPLET
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'tool_selection',
  '3.1',
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

### Pour create_task_planned:
- action: action à faire
- plot_reference: parcelle
- scheduled_date: date au format YYYY-MM-DD
- scheduled_time: heure au format HH:MM (optionnel)

### Pour create_harvest:
- crop: culture récoltée
- quantity: {value: number, unit: "kg"|"caisses"|etc}
- plot_reference: parcelle
- quality: excellent|good|fair|poor (optionnel)

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

Message: "Comment inviter un membre ?"
→ tool: help, parameters: { help_topic: "team" }

Si message complexe avec plusieurs actions, retourner plusieurs tools.',
  '[
    {"input": "Comment ajouter une action ?", "output": {"tools": [{"tool_name": "help", "confidence": 0.95, "parameters": {"help_topic": "task"}}]}},
    {"input": "Où sont les paramètres des parcelles ?", "output": {"tools": [{"tool_name": "help", "confidence": 0.95, "parameters": {"help_topic": "manage_plot"}}]}},
    {"input": "J''ai observé des pucerons sur les tomates", "output": {"tools": [{"tool_name": "create_observation", "confidence": 0.95, "parameters": {"crop": "tomates", "issue": "pucerons", "category": "ravageurs"}}]}}
  ]'::jsonb,
  jsonb_build_object(
    'version', '3.1',
    'purpose', 'tool_selection_and_parameter_extraction',
    'method', 'pipeline',
    'created_by', 'migration_054',
    'improvements', jsonb_build_array(
      'help_topic mapping for help tool',
      'Clear examples for help intent',
      'Compatible with HELP_CONTENT_BY_TOPIC in pipeline'
    )
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
-- 3. DÉSACTIVER response_synthesis v3.0 pour le pipeline
-- ============================================================================

UPDATE chat_prompts
SET is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{note}',
      '"Remplacé par v3.1 pour le pipeline"'
    ),
    updated_at = NOW()
WHERE name = 'response_synthesis' AND version = '3.0';

-- ============================================================================
-- 4. INSÉRER response_synthesis v3.1 COMPLET
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'response_synthesis',
  '3.1',
  true,
  true,
  'Génère une réponse naturelle en français basée sur les résultats des tools.

Message utilisateur: {{user_message}}

Résultats des tools exécutés:
{{tool_results}}

Actions créées:
{{actions_created}}

## RÈGLES DE SYNTHÈSE:

### Ton et Style:
- Naturel et professionnel français
- Tutoiement (tu/te/ton)
- Messages courts mais informatifs
- Confirmations précises des actions créées
- Proactif avec suggestions d''amélioration

### Structure de Réponse par Type:

**Si SUCCÈS (tools réussis):**
1. Confirmation des actions créées avec détails
2. Résumé des données importantes (quantités, parcelles, etc.)
3. Suggestion proactive si pertinent
4. Encouragement positif

**Si ÉCHEC PARTIEL:**
1. Expliquer clairement ce qui a fonctionné
2. Expliquer le problème rencontré
3. Proposer des solutions alternatives concrètes
4. Suggestions pour résoudre le problème

**Si ÉCHEC COMPLET:**
1. Expliquer le problème clairement
2. Proposer 2-3 solutions alternatives
3. Indiquer ce qui manque ou pose problème
4. Encourager à réessayer avec plus de détails

**Si action_type = help (aide utilisateur):**
1. Utiliser le help_content reçu dans tool_results (message, examples, app_path)
2. Structure: accroche courte + message principal + exemples formatés + chemin app si présent
3. Ton: accueillant, concret, incitatif à l''action
4. Ne pas inventer d''exemples: utiliser uniquement ceux fournis dans help_content
5. Formater les exemples en italique ou liste à puces

### Exemples de Réponses Attendues:

**Observation simple:**
"J''ai créé une observation pour les pucerons sur tes tomates dans la Serre 1. L''observation a été classée en ''ravageurs'' avec une gravité moyenne. Surveille l''évolution et considère un traitement si nécessaire."

**Récolte avec conversion:**
"J''ai enregistré ta récolte de 3 caisses de courgettes (15 kg selon tes conversions). Excellente productivité ! La récolte est maintenant dans ton suivi de production."

**Tâche planifiée:**
"Tâche de traitement planifiée pour demain matin (08:00). Je te rappellerai de vérifier les conditions météo avant application."

**Actions multiples:**
"Actions traitées : ✅ Observation pucerons créée (Serre 1) ✅ Récolte 5kg tomates enregistrée ✅ Traitement planifié demain. Excellent suivi de ton exploitation !"

**Échec avec aide:**
"Je n''ai pas pu identifier la parcelle ''sere 1'' (peut-être ''Serre 1'' ?). Tes parcelles disponibles : Serre 1, Tunnel Nord, Plein Champ A. Peux-tu préciser ?"

**Aide sur les tâches (help_topic = task):**
"Pour enregistrer une tâche ou une récolte, dis-moi par exemple :
- *J''ai désherbé la serre 1 pendant 1 heure*
- *J''ai récolté 4 caisses de concombres en serre 2*
- *Je vais planter des laitues demain matin*

Plus ta phrase est complète (action, culture, parcelle, durée/quantité), plus je la comprends bien."

**Aide sur les parcelles (help_topic = manage_plot):**
"Tu peux utiliser le formulaire (Paramètres > Gestion des parcelles) ou me dire par exemple :
- *Créer une serre plastique Serre 2 de 20m x 10m avec 50 planches*
- *Ajouter un tunnel nord de 30 mètres de long et 5 de large*

Plus ta phrase est complète (type, nom, dimensions), plus je la comprends bien."

### IMPORTANT:
- Utiliser les VRAIS noms matchés (pas les références brutes)
- Mentionner les quantités converties si applicable
- Être spécifique sur ce qui a été créé
- Toujours en français naturel avec tutoiement
- Pour help: structurer la réponse avec les exemples fournis

Retourne UNIQUEMENT du JSON valide:
{
  "content": "Ta réponse naturelle en français",
  "type": "actions|conversational|help|error",
  "suggestions": ["suggestion 1", "suggestion 2"]
}',
  '[]'::jsonb,
  jsonb_build_object(
    'version', '3.1',
    'purpose', 'response_synthesis_with_help_support',
    'method', 'pipeline',
    'created_by', 'migration_054',
    'improvements', jsonb_build_array(
      'Support for action_type help',
      'Uses help_content from tool_results',
      'Formatted examples for help responses',
      'Tutoiement consistent'
    )
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
-- 5. METTRE À JOUR LE PIPELINE POUR UTILISER v3.1
-- ============================================================================

-- Note: Le pipeline index.ts doit être mis à jour pour charger v3.1 au lieu de v3.0
-- Voir modification dans thomas-agent-pipeline/index.ts

-- ============================================================================
-- 6. VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  ts_v31 BOOLEAN;
  rs_v31 BOOLEAN;
  ic_v40 BOOLEAN;
BEGIN
  SELECT is_active INTO ts_v31 FROM chat_prompts WHERE name = 'tool_selection' AND version = '3.1';
  SELECT is_active INTO rs_v31 FROM chat_prompts WHERE name = 'response_synthesis' AND version = '3.1';
  SELECT is_active INTO ic_v40 FROM chat_prompts WHERE name = 'intent_classification' AND version = '4.0';
  
  IF ts_v31 = true AND rs_v31 = true THEN
    RAISE NOTICE '✅ Prompts v3.1 actifs: tool_selection, response_synthesis';
  ELSE
    RAISE WARNING '⚠️ Vérifier: tool_selection v3.1=%, response_synthesis v3.1=%', ts_v31, rs_v31;
  END IF;
  
  IF ic_v40 = true THEN
    RAISE NOTICE '✅ intent_classification v4.0 actif';
  ELSE
    RAISE WARNING '⚠️ intent_classification v4.0 non actif (v4.0=%), vérifier migration 053', ic_v40;
  END IF;
END $$;

-- ============================================================================
-- RÉSUMÉ DES VERSIONS ACTIVES APRÈS CETTE MIGRATION
-- ============================================================================
-- intent_classification: v4.0 (multi-intent, from migration 053)
-- tool_selection: v3.1 (help_topic support)
-- response_synthesis: v3.1 (help section support)
-- 
-- Anciennes versions (v3.0) restent actives mais is_default=false
-- pour le mode analyze-message simple
-- ============================================================================
