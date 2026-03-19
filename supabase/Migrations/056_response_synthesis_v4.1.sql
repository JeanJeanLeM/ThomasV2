-- ============================================================================
-- Migration 056: Response Synthesis v4.1 - Simplified prompt (remplace v4.0)
-- ============================================================================
-- Date: 2026-02-06
-- Description: 
--   Prompt v4.1 simplifié pour forcer le LLM à détecter action_type=help
--   et générer une réponse d'aide structurée (message + exemples).
--   Migration 055 déjà exécutée → v4.0 en base ; on ajoute v4.1 et on désactive v4.0.
-- ============================================================================

-- ============================================================================
-- 1. DÉSACTIVER response_synthesis v4.0
-- ============================================================================

UPDATE chat_prompts
SET is_active = false, is_default = false
WHERE name = 'response_synthesis' AND version = '4.0';

-- ============================================================================
-- 2. CRÉER response_synthesis v4.1 (prompt simplifié)
-- ============================================================================

INSERT INTO chat_prompts (
  name,
  version,
  content,
  examples,
  metadata
)
VALUES (
  'response_synthesis',
  '4.1',
  'Tu es Thomas, assistant agricole.

Message: {{user_message}}
Tools: {{tool_results}}

## INSTRUCTION CRITIQUE: DÉTECTER LE TYPE

Regarder le PREMIER élément de tool_results:

**SI action_type = "help":**
→ Retourner JSON avec type="help"
→ Utiliser help_content.message + help_content.examples + help_content.app_path
→ FORMATER: intro + liste exemples avec * 
→ NE JAMAIS dire "j''ai créé/identifié une action"

**SINON:**
→ Retourner JSON avec type="actions"
→ Message court: "Parfait ! J''ai identifié {N} action(s) dans ton message."

## CAS 1: HELP (action_type="help")

Formater ainsi:
```
[Phrase intro courte]
[help_content.message]
* *[exemple 1]*
* *[exemple 2]*
* *[exemple 3]*

[Mention app_path]
```

Exemple:
```
Bien sûr ! Tu peux ajouter du matériel via Paramètres > Matériel ou en me disant par exemple :
* *Ajouter un tracteur John Deere 6120M*
* *Enregistrer une herse Kuhn en bon état*
* *Ajouter un pulvérisateur de 500 litres*

Plus c''est précis, mieux c''est !
```

## CAS 2: ACTIONS (autres action_types)

Message court: "Parfait ! J''ai identifié {N} action(s) dans ton message."

Les détails sont dans les cards, NE PAS les répéter.

## FORMAT JSON

Retourner UNIQUEMENT:
```json
{
  "content": "ta réponse",
  "type": "help" OU "actions" OU "error",
  "suggestions": []
}
```

Type = "help" SI action_type="help", SINON type="actions"',
  '[]'::jsonb,
  jsonb_build_object(
    'version', '4.1',
    'purpose', 'response_synthesis_simplified',
    'method', 'pipeline',
    'created_by', 'migration_056',
    'created_at', '2026-02-06',
    'improvements', jsonb_build_array(
      'Prompt simplifié pour forcer détection help',
      'Instructions critiques en tête',
      'Format HELP explicite avec exemples',
      'Remplace v4.0'
    ),
    'replaces', '4.0'
  )
);

-- ============================================================================
-- 3. ACTIVER response_synthesis v4.1 COMME VERSION PAR DÉFAUT
-- ============================================================================

UPDATE chat_prompts
SET is_active = true, is_default = true
WHERE name = 'response_synthesis' AND version = '4.1';

-- ============================================================================
-- 4. VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  v41_active BOOLEAN;
  v40_active BOOLEAN;
BEGIN
  SELECT is_active INTO v41_active FROM chat_prompts WHERE name = 'response_synthesis' AND version = '4.1';
  SELECT is_active INTO v40_active FROM chat_prompts WHERE name = 'response_synthesis' AND version = '4.0';
  
  IF v41_active = true AND v40_active = false THEN
    RAISE NOTICE '✅ Migration 056 réussie: response_synthesis v4.1 actif, v4.0 désactivé';
  ELSE
    RAISE WARNING '⚠️ Vérifier: v4.1 actif=%, v4.0 actif=%', v41_active, v40_active;
  END IF;
END $$;

-- ============================================================================
-- RÉSUMÉ POST-MIGRATION
-- ============================================================================
-- response_synthesis: v4.1 (actif, par défaut) - prompt simplifié
-- response_synthesis: v4.0 (désactivé)
-- Le pipeline doit charger v4.1
-- ============================================================================
