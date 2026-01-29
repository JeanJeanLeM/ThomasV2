-- Migration: Tool Selection Prompt v3.0
-- Date: 2026-01-07
-- Description: Prompt pour sélection de tools et extraction de paramètres

-- Désactiver anciennes versions
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'tool_selection' AND is_active = true;

-- Insérer nouvelle version v3.0
INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'tool_selection',
  '3.0',
  true,
  'Sélectionne les tools à utiliser et extrais leurs paramètres.

Intent détecté: {{intent}}
Message utilisateur: {{user_message}}

Tools disponibles:
{{available_tools}}

RÈGLES D''EXTRACTION:

Pour observation:
- crop: culture concernée
- issue: problème spécifique (pucerons, jaunissement, mildiou)
- plot_reference: mention de parcelle ("serre 1", "tunnel nord")
- category: ravageurs|maladies|physiologie|climatique|autre

Pour task_done:
- action: verbe à l''infinitif (semer, récolter, traiter)
- crop: culture (optionnel)
- plot_reference: parcelle mentionnée
- materials: liste d''outils/matériels mentionnés
- duration: {value: number, unit: "minutes"|"heures"}

Pour task_planned:
- action: action à faire
- plot_reference: parcelle
- scheduled_date: date au format YYYY-MM-DD
- scheduled_time: heure au format HH:MM (optionnel)

Pour harvest:
- crop: culture récoltée
- quantity: {value: number, unit: "kg"|"caisses"|etc}
- plot_reference: parcelle
- quality: excellent|good|fair|poor (optionnel)

Pour help:
- question_type: le type de question
- context: contexte de la question

Pour management:
- operation: create|list|search|deactivate
- entity_type: plot|material|conversion
- parameters: selon l''opération

Retourne UNIQUEMENT du JSON valide:
{
  "tools": [
    {
      "tool_name": "create_observation",
      "confidence": 0.95,
      "parameters": {
        "crop": "tomates",
        "issue": "pucerons",
        "plot_reference": "serre 1",
        "category": "ravageurs"
      }
    }
  ]
}

Si message complexe avec plusieurs actions, retourner plusieurs tools.',
  jsonb_build_object(
    'version', '3.0',
    'purpose', 'tool_selection_and_parameter_extraction',
    'created_by', 'pipeline_migration_2026_01_07',
    'improvements', jsonb_build_array(
      'Focused on tool selection only',
      'Clear parameter extraction rules per tool',
      'Supports multi-action messages'
    )
  )
);

