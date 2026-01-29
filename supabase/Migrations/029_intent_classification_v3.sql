-- Migration: Intent Classification Prompt v3.0
-- Date: 2026-01-07
-- Description: Prompt court et focalisé pour classification d'intention uniquement

-- Désactiver anciennes versions
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'intent_classification' AND is_active = true;

-- Insérer nouvelle version v3.0
INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'intent_classification',
  '3.0',
  true,
  'Classifie uniquement l''intention de ce message agricole français.

Message: {{user_message}}

Intentions possibles:
- observation: Constat terrain avec problème spécifique (pucerons, maladie, jaunissement)
- task_done: Action agricole accomplie (récolté, semé, traité, travaillé)
- task_planned: Action future (demain, lundi, prévu, planifié)
- harvest: Récolte avec quantité chiffrée (10 kg, 3 caisses)
- help: Question utilisateur (comment, où, quand, ?)
- management: Gestion/configuration (créer parcelle, ajouter matériel)

RÈGLES:
1. Si verbe agricole au passé + durée/outil = task_done
2. Si "récolté" + quantité = harvest
3. Si "récolté" sans quantité = task_done
4. Si problème spécifique mentionné = observation
5. Si mot interrogatif (?, comment, quand) = help

Retourne UNIQUEMENT du JSON valide:
{
  "intent": "observation",
  "confidence": 0.95,
  "reasoning": "Message mentionne un problème spécifique (pucerons)"
}',
  jsonb_build_object(
    'version', '3.0',
    'purpose', 'intent_classification_only',
    'created_by', 'pipeline_migration_2026_01_07',
    'improvements', jsonb_build_array(
      'Short and focused on intent only',
      'Clear discrimination rules',
      'No entity extraction (done in tool selection)'
    )
  )
);

