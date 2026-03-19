-- ============================================================================
-- Migration 055: Response Synthesis v4.0 - Improved Response Generation
-- ============================================================================
-- Date: 2026-02-06
-- Description: 
--   Améliore la génération des réponses pour éviter les messages génériques
--   et adapter le ton en fonction du type d'action (help vs actions normales)
-- 
-- Changes:
--   - Détection claire du type de réponse basée sur action_type dans tool_results
--   - Réponses d'aide ne commencent JAMAIS par "j'ai ajouté une action"
--   - Meilleure structure pour les différents cas (succès, échec, aide)
--   - Utilisation des données réelles (help_content pour aide, matched entities pour actions)
-- ============================================================================

-- ============================================================================
-- 1. DÉSACTIVER response_synthesis v3.1
-- ============================================================================

UPDATE chat_prompts
SET is_active = false, is_default = false
WHERE name = 'response_synthesis' AND version = '3.1';

-- ============================================================================
-- 2. CRÉER response_synthesis v4.0
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
  '4.0',
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
    'version', '4.0',
    'purpose', 'response_synthesis_improved',
    'method', 'pipeline',
    'created_by', 'migration_055',
    'created_at', '2026-02-06',
    'improvements', jsonb_build_array(
      'Type detection based on tool_results content',
      'Help responses never start with action confirmation',
      'Clear structure for each response type',
      'Real entity names from matched_entities',
      'Short and natural messages',
      'Specific examples for each action type'
    ),
    'replaces', '3.1'
  )
);

-- ============================================================================
-- 3. ACTIVER response_synthesis v4.0 COMME VERSION PAR DÉFAUT
-- ============================================================================

UPDATE chat_prompts
SET is_active = true, is_default = true
WHERE name = 'response_synthesis' AND version = '4.0';

-- ============================================================================
-- 4. VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  v4_active BOOLEAN;
  v31_active BOOLEAN;
BEGIN
  SELECT is_active INTO v4_active FROM chat_prompts WHERE name = 'response_synthesis' AND version = '4.0';
  SELECT is_active INTO v31_active FROM chat_prompts WHERE name = 'response_synthesis' AND version = '3.1';
  
  IF v4_active = true AND v31_active = false THEN
    RAISE NOTICE '✅ Migration 055 réussie: response_synthesis v4.0 actif, v3.1 désactivé';
  ELSE
    RAISE WARNING '⚠️ Vérifier: v4.0 actif=%, v3.1 actif=%', v4_active, v31_active;
  END IF;
END $$;

-- ============================================================================
-- RÉSUMÉ POST-MIGRATION
-- ============================================================================
-- response_synthesis: v4.0 (actif, par défaut)
-- response_synthesis: v3.1 (désactivé)
-- 
-- Le pipeline doit charger v4.0 (ou fallback sur la version active par défaut)
-- ============================================================================
