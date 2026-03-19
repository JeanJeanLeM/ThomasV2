-- Migration 062: Fix tool_selection prompt - JSON format explicite avec tool_name
-- Date: 2026-02-13
-- Description: Le prompt v3.3 ne spécifiait pas le champ "tool_name" dans le format JSON,
--   ce qui faisait que le LLM retournait "name" au lieu de "tool_name".
--   Le pipeline attend "tool_name" dans chaque objet tool.

-- ============================================================================
-- 1. DÉSACTIVER tool_selection v3.3
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplacé par v3.4 - fix format JSON tool_name"'
    ),
    updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.3';

-- ============================================================================
-- 2. INSÉRER tool_selection v3.4 (format JSON explicite avec tool_name)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'tool_selection',
  '3.4',
  true,
  true,
  'Sélectionne les tools à utiliser et extrais leurs paramètres.

Intent détecté: {{intent}}
Message utilisateur: {{user_message}}
Contexte ferme: {{farm_context}}

Tools disponibles:
{{available_tools}}

## RÈGLES D''EXTRACTION PAR TOOL:

### Pour create_sale (intent sale):
- customer_name: nom du client (Bernard, Société X)
- quantity: { value, unit } (ex: 4 caisses)
- quantity_nature: nature du produit (radis, tomates)
- price: { value, is_unit_price, is_ttc } (value en euros, is_unit_price true si "20€ la caisse")
- vat_rate: taux TVA (5.5 défaut agricole)
- payment_due_date: date échéance ISO (optionnel)
- payment_status: "paid" | "to_be_paid"
- delivery_date: date livraison (optionnel)

### Pour create_purchase (intent purchase):
- supplier_name: nom du fournisseur (Jardiland, Magasin X)
- quantity, quantity_nature, price, vat_rate: mêmes que create_sale
- payment_status: "paid" | "to_be_paid"

### Pour create_observation:
- crop: culture concernée
- issue: problème spécifique (OBLIGATOIRE)
- plot_reference: mention de parcelle
- category: ravageurs|maladies|physiologie|climatique|autre
- severity: faible|moyen|élevé

### Pour create_task_done / create_task_planned:
- action: verbe à l''infinitif
- crop: culture
- plots: ARRAY des parcelles ["serre 1"]
- materials: ARRAY des matériels ["semoir"]
- duration: {value, unit}
- quantity: {value, unit}
- quantity_nature: nom spécifique
- quantity_type: engrais|produit_phyto|recolte|plantation|vente|autre

### Pour manage_plot / manage_conversion / manage_material:
- operation: create|modify
- Paramètres spécifiques selon l''entité

### Pour help:
- help_topic: sujet de la question

## FORMAT DE SORTIE JSON:

Retourne UNIQUEMENT du JSON valide:
{
  "tools": [
    {
      "tool_name": "create_sale",
      "confidence": 0.95,
      "parameters": {
        "customer_name": "Bernard",
        "quantity": { "value": 4, "unit": "caisses" },
        "quantity_nature": "radis",
        "price": { "value": 20, "is_unit_price": true, "is_ttc": false },
        "vat_rate": 5.5,
        "payment_status": "to_be_paid"
      }
    }
  ]
}

IMPORTANT: Chaque tool DOIT avoir un champ "tool_name" (pas "name", pas "tool").

## EXEMPLES:

Message: "J''ai vendu 4 caisses de radis à Bernard à 20€ la caisse"
→ {"tools": [{"tool_name": "create_sale", "confidence": 0.95, "parameters": {"customer_name": "Bernard", "quantity": {"value": 4, "unit": "caisses"}, "quantity_nature": "radis", "price": {"value": 20, "is_unit_price": true, "is_ttc": false}, "vat_rate": 5.5, "payment_status": "to_be_paid"}}]}

Message: "J''ai acheté 10 sacs de terreau à 15€ l''unité chez Jardiland"
→ {"tools": [{"tool_name": "create_purchase", "confidence": 0.95, "parameters": {"supplier_name": "Jardiland", "quantity": {"value": 10, "unit": "sacs"}, "quantity_nature": "terreau", "price": {"value": 15, "is_unit_price": true, "is_ttc": false}, "vat_rate": 5.5, "payment_status": "to_be_paid"}}]}

Message: "J''ai observé des pucerons sur les tomates en serre 1"
→ {"tools": [{"tool_name": "create_observation", "confidence": 0.95, "parameters": {"crop": "tomates", "issue": "pucerons", "plot_reference": "serre 1", "category": "ravageurs"}}]}

Message: "J''ai récolté 5 caisses de courgettes"
→ {"tools": [{"tool_name": "create_task_done", "confidence": 0.95, "parameters": {"action": "récolter", "crop": "courgettes", "quantity": {"value": 5, "unit": "caisses"}, "quantity_nature": "courgettes", "quantity_type": "recolte"}}]}

Retourne JSON valide uniquement.',
  '[
    {"input": "j''ai vendu 4 caisses à Bernard", "output": {"tools": [{"tool_name": "create_sale", "confidence": 0.95, "parameters": {"customer_name": "Bernard", "quantity": {"value": 4, "unit": "caisses"}}}]}},
    {"input": "j''ai acheté chez Jardiland", "output": {"tools": [{"tool_name": "create_purchase", "confidence": 0.9, "parameters": {"supplier_name": "Jardiland"}}]}},
    {"input": "j''ai observé des pucerons", "output": {"tools": [{"tool_name": "create_observation", "confidence": 0.95, "parameters": {"issue": "pucerons", "category": "ravageurs"}}]}},
    {"input": "j''ai récolté 10 kg tomates", "output": {"tools": [{"tool_name": "create_task_done", "confidence": 0.95, "parameters": {"action": "récolter", "crop": "tomates", "quantity": {"value": 10, "unit": "kg"}}}]}}
  ]'::jsonb,
  jsonb_build_object(
    'version', '3.4',
    'purpose', 'tool_selection',
    'changes', 'Fix format JSON: tool_name explicite au lieu de name. Exemples JSON complets pour tous les tools.',
    'variables', jsonb_build_array('intent', 'user_message', 'farm_context', 'available_tools'),
    'created_by', 'migration_062'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  examples = EXCLUDED.examples,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
