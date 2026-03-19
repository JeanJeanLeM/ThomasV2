-- Migration 049: Prompts d'extraction pour management (manage_plot, manage_conversion, manage_material)
-- Date: 2026-02-03
-- Description: Ajoute les 3 prompts d'extraction et met à jour intent_classification/tool_selection

-- ============================================================================
-- 1. PROMPT: plot_management_extraction
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'plot_management_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Parcelle

Tu analyses des messages de gestion de parcelle (création ou modification). Extrais les données en JSON structuré.

Message: {{user_message}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **operation**: create | modify
2. **name**: Nom parcelle (1-100 car)
3. **type**: serre_plastique | serre_verre | plein_champ | tunnel | hydroponique | pepiniere | autre
4. **length**, **width**: Dimensions mètres (optionnel)
5. **surface_units_config**: { count, naming_pattern, type, sequence_start } si planches mentionnées
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
    "sequence_start": 1
  },
  "card_summary": {
    "action_type": "manage_plot",
    "title": "Parcelle Serre 2 créée",
    "subtitle": "serre_plastique • 200 m²",
    "highlights": [
      { "label": "Type", "value": "Serre plastique" },
      { "label": "Dimensions", "value": "20m x 10m" }
    ],
    "record_type": "plot"
  }
}
```

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'plot_management_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context'),
    'created_by', 'migration_049'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- 2. PROMPT: conversion_management_extraction
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'conversion_management_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Conversion

Tu analyses des messages de conversion (1 caisse = X kg). Extrais les données en JSON structuré.

Message: {{user_message}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **operation**: create | modify
2. **container_name**: caisse, panier, bac, brouette (OBLIGATOIRE)
3. **crop_name**: tomates, concombres, fumier (OBLIGATOIRE)
4. **conversion_value**: nombre (OBLIGATOIRE)
5. **conversion_unit**: kg, L, g (OBLIGATOIRE)
6. **container_type**, **description**, **slugs**: Optionnels

## PATTERNS
- "1 caisse = 6 kg de tomates" → container: caisse, crop: tomates, value: 6, unit: kg
- "panier concombres 4 kg" → container: panier, crop: concombres, value: 4, unit: kg
- "brouette fumier 50 kg" → container: brouette, crop: fumier, value: 50, unit: kg

## FORMAT JSON

```json
{
  "original_text": "1 caisse = 6 kg de tomates",
  "decomposed_text": "conversion caisse tomates = 6 kg",
  "confidence": 0.95,
  "operation": "create",
  "extracted_data": {
    "container_name": "caisse",
    "crop_name": "tomates",
    "conversion_value": 6,
    "conversion_unit": "kg",
    "container_type": "caisse",
    "description": null,
    "slugs": ["caisse-tomate"]
  },
  "card_summary": {
    "action_type": "manage_conversion",
    "title": "Conversion caisse tomates",
    "subtitle": "1 caisse = 6 kg",
    "highlights": [
      { "label": "Contenant", "value": "caisse" },
      { "label": "Culture", "value": "tomates" },
      { "label": "Équivalent", "value": "6 kg" }
    ],
    "record_type": "conversion"
  }
}
```

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'conversion_management_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context'),
    'created_by', 'migration_049'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- 3. PROMPT: material_management_extraction
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'material_management_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Matériel

Tu analyses des messages de gestion de matériel. Extrais les données en JSON structuré.

Message: {{user_message}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **operation**: create | modify
2. **name**: Nom matériel (OBLIGATOIRE)
3. **category**: tracteurs | outils_tracteur | outils_manuels | materiel_marketing | petit_equipement | autre
4. **brand**, **model**: Marque et modèle (optionnel)
5. **cost**, **purchase_date**, **supplier**, **condition_notes**: Optionnels
6. **custom_category**: Si category=autre
7. **llm_keywords**: Mots-clés pour matching

## CATÉGORIES
- tracteurs: tracteur, moissonneuse
- outils_tracteur: herse, charrue, semoir, pulvérisateur
- outils_manuels: bêche, râteau, sécateur
- materiel_marketing: caisse, panier, étal
- petit_equipement: brouette, seau, bâche

## FORMAT JSON

```json
{
  "original_text": "ajouter tracteur John Deere 6120M",
  "decomposed_text": "matériel Tracteur John Deere 6120M",
  "confidence": 0.95,
  "operation": "create",
  "extracted_data": {
    "name": "Tracteur John Deere 6120M",
    "category": "tracteurs",
    "model": "6120M",
    "brand": "John Deere",
    "description": null,
    "cost": null,
    "purchase_date": null,
    "supplier": null,
    "condition_notes": null,
    "custom_category": null,
    "llm_keywords": ["tracteur", "john deere", "6120m"]
  },
  "card_summary": {
    "action_type": "manage_material",
    "title": "Matériel Tracteur John Deere 6120M créé",
    "subtitle": "tracteurs • John Deere 6120M",
    "highlights": [
      { "label": "Catégorie", "value": "Tracteurs" },
      { "label": "Marque", "value": "John Deere" },
      { "label": "Modèle", "value": "6120M" }
    ],
    "record_type": "material"
  }
}
```

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'material_management_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context'),
    'created_by', 'migration_049'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- 4. MISE À JOUR intent_classification v3.0 - Ajouter manage_plot, manage_conversion, manage_material
-- ============================================================================

UPDATE chat_prompts
SET content = REPLACE(content,
  '### management
**Indicateurs**: Gestion/configuration de l''application
**Règle**: Créer/modifier/supprimer des entités (parcelles, matériel, conversions)
Exemples: "créer une nouvelle parcelle", "ajouter un outil"',
  '### manage_plot
**Indicateurs**: Parcelle, serre, tunnel, planches
**Règle**: Création ou modification d''une parcelle
Exemples: "créer serre 2", "ajouter tunnel nord avec 50 planches"

### manage_conversion
**Indicateurs**: Conversion, caisse = kg, panier, équivalent
**Règle**: Définition équivalence contenant → unité
Exemples: "1 caisse = 6 kg tomates", "panier concombres 4 kg"

### manage_material
**Indicateurs**: Matériel, tracteur, herse, équipement
**Règle**: Création ou modification d''un matériel
Exemples: "ajouter tracteur John Deere", "enregistrer herse Kuhn"'),
updated_at = NOW()
WHERE name = 'intent_classification' AND version = '3.0';

-- Mettre à jour la liste des intents possibles
UPDATE chat_prompts
SET content = REPLACE(content,
  '"intent": "observation|task_done|task_planned|harvest|help|management"',
  '"intent": "observation|task_done|task_planned|harvest|help|manage_plot|manage_conversion|manage_material"'),
updated_at = NOW()
WHERE name = 'intent_classification' AND version = '3.0';

-- ============================================================================
-- 5. MISE À JOUR tool_selection v3.0 - Ajouter règles pour manage_*
-- ============================================================================

UPDATE chat_prompts
SET content = REPLACE(content,
  'Pour management:
- operation: create|list|search|deactivate
- entity_type: plot|material|conversion
- parameters: selon l''opération',
  'Pour manage_plot:
- name: nom parcelle (Serre 2, Tunnel Nord)
- type: serre_plastique|serre_verre|plein_champ|tunnel|etc
- length, width: dimensions mètres
- surface_units_count: nombre de planches

Pour manage_conversion:
- container_name: caisse, panier, bac
- crop_name: tomates, concombres
- conversion_value: nombre
- conversion_unit: kg, L

Pour manage_material:
- name: nom matériel
- category: tracteurs|outils_tracteur|outils_manuels|etc
- brand, model: optionnel'),
updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.0';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prompt_count 
  FROM chat_prompts 
  WHERE name IN ('plot_management_extraction', 'conversion_management_extraction', 'material_management_extraction')
    AND is_active = true;
  
  IF prompt_count = 3 THEN
    RAISE NOTICE '✅ Les 3 prompts d''extraction management sont actifs';
  ELSE
    RAISE WARNING '⚠️ Seulement % prompts actifs sur 3', prompt_count;
  END IF;
END $$;
