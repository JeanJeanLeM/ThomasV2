-- Migration 069: plot_management_extraction v1.1 - extraction longueur/largeur des SU (identiques)
-- Date: 2026-02-03
-- Description: Déprécie v1.0, ajoute v1.1 avec length/width dans surface_units_config (SU identiques).

-- ============================================================================
-- 1. Déprécier plot_management_extraction v1.0 (ne plus l'utiliser)
-- ============================================================================

UPDATE public.chat_prompts
SET
  is_active = false,
  is_default = false,
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'deprecated', true,
    'deprecated_since', '2026-02-03',
    'replaced_by', '1.1'
  ),
  updated_at = NOW()
WHERE name = 'plot_management_extraction'
  AND version = '1.0';

-- ============================================================================
-- 2. Insérer plot_management_extraction v1.1 (actif, avec length/width SU)
-- ============================================================================

INSERT INTO public.chat_prompts (name, version, is_active, is_default, content, metadata) VALUES (
  'plot_management_extraction',
  '1.1',
  true,
  true,
  '# THOMAS - Extraction Parcelle

Tu analyses des messages de gestion de parcelle (création ou modification). Extrais les données en JSON structuré.

Message: {{user_message}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **operation**: create | modify
2. **name**: Nom parcelle (1-100 car)
3. **type**: serre_plastique | serre_verre | plein_champ | tunnel | hydroponique | pepiniere | autre
4. **length**, **width**: Dimensions parcelle en mètres (optionnel)
5. **surface_units_config**: si planches/SU mentionnées
   - **count**, **naming_pattern**, **type**, **sequence_start** (obligatoires si planches)
   - **length**, **width**: dimensions en mètres de chaque SU si elles sont identiques (optionnel)
6. **code**, **description**, **aliases**, **llm_keywords**: Optionnels

## FORMAT JSON

```json
{
  "original_text": "texte",
  "decomposed_text": "créer parcelle [name]",
  "confidence": 0.95,
  "operation": "create",
  "extracted_data": {
    "name": "Serre 2",
    "code": null,
    "type": "serre_plastique",
    "length": 20,
    "width": 10,
    "description": null,
    "aliases": [],
    "llm_keywords": ["serre 2"]
  },
  "surface_units_config": {
    "count": 50,
    "naming_pattern": "planche {n}",
    "type": "planche",
    "sequence_start": 1,
    "length": 2,
    "width": 1.2
  },
  "card_summary": {
    "action_type": "manage_plot",
    "title": "Parcelle Serre 2 créée",
    "subtitle": "serre_plastique • 200 m²",
    "highlights": [
      { "label": "Type", "value": "Serre plastique" },
      { "label": "Dimensions", "value": "20m x 10m" },
      { "label": "Planches", "value": "50 × 2m × 1,2m" }
    ],
    "record_type": "plot"
  }
}
```

Règles: Si l''utilisateur indique des dimensions communes pour toutes les planches (ex. "50 planches de 2m sur 1m20"), mets length et width dans surface_units_config. Les SU sont considérées identiques.

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.1',
    'purpose', 'plot_management_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context'),
    'created_by', 'migration_069',
    'changelog', 'surface_units_config: length, width pour SU identiques'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  is_default = true,
  updated_at = NOW();
