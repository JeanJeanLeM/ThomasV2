-- Migration 080: tool_selection v3.5 - aide plus specifique
-- Date: 2026-02-03
-- Objectif: forcer un help_topic explicite et fiable pour les demandes d'aide.

-- ============================================================================
-- 1) Desactiver tool_selection v3.4
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplace par v3.5 - help_topic explicite et contraintes help"'
    ),
    updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.4';

-- ============================================================================
-- 2) Inserer tool_selection v3.5
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'tool_selection',
  '3.5',
  true,
  true,
  'Selectionne les tools a utiliser et extrais leurs parametres.

Intent detecte: {{intent}}
Message utilisateur: {{user_message}}
Contexte ferme: {{farm_context}}

Tools disponibles:
{{available_tools}}

## REGLES GENERALES:
- Retourne UNIQUEMENT du JSON valide.
- Chaque tool DOIT avoir un champ "tool_name" (jamais "name" ni "tool").
- Si intent = "help": retourne UNIQUEMENT le tool "help" (pas de tool de creation/modification).

## REGLES D''EXTRACTION PAR TOOL:

### Pour create_sale (intent sale):
- customer_name: nom du client
- quantity: { value, unit } (ex: 4 caisses)
- quantity_nature: nature du produit (radis, tomates)
- price: { value, is_unit_price, is_ttc }
- vat_rate: taux TVA (5.5 par defaut)
- payment_due_date: date echeance ISO (optionnel)
- payment_status: "paid" | "to_be_paid"
- delivery_date: date livraison (optionnel)

### Pour create_purchase (intent purchase):
- supplier_name: nom du fournisseur
- quantity, quantity_nature, price, vat_rate: memes regles que create_sale
- payment_status: "paid" | "to_be_paid"

### Pour create_observation:
- crop: culture concernee
- issue: probleme specifique (OBLIGATOIRE)
- plot_reference: mention de parcelle
- category: ravageurs|maladies|physiologie|climatique|autre
- severity: faible|moyen|eleve

### Pour create_task_done / create_task_planned:
- action: verbe a l''infinitif
- crop: culture
- plots: ARRAY des parcelles ["serre 1"]
- materials: ARRAY des materiels ["semoir"]
- duration: {value, unit}
- quantity: {value, unit}
- quantity_nature: nom specifique
- quantity_type: engrais|produit_phyto|recolte|plantation|vente|autre

### Pour manage_plot / manage_conversion / manage_material:
- operation: create|modify
- Parametres specifiques selon l''entite

### Pour help (OBLIGATOIRE si intent help):
- tool_name: "help"
- parameters.help_topic: UNE valeur parmi:
  - "manage_material"  -> ajout/modification/recherche materiel, outils, tracteur...
  - "manage_plot"      -> parcelles, serres, planches, surface units...
  - "manage_conversion"-> conversions de contenants/unites (caisse, panier, kg...)
  - "task"             -> taches, recoltes, planification
  - "observation"      -> ravageurs, maladies, constats terrain
  - "team"             -> invitation membres, roles equipe
  - "app_features"     -> navigation "ou trouver" une fonctionnalite
  - "general"          -> seulement si aucun sujet clair
- Ne JAMAIS laisser parameters vide pour le tool help.

## FORMAT DE SORTIE JSON:
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

## EXEMPLES HELP:

Message: "Comment ajouter du materiel ?"
-> {"tools":[{"tool_name":"help","confidence":0.96,"parameters":{"help_topic":"manage_material"}}]}

Message: "Ou je configure les parcelles ?"
-> {"tools":[{"tool_name":"help","confidence":0.95,"parameters":{"help_topic":"manage_plot"}}]}

Message: "Comment faire une conversion caisse -> kg ?"
-> {"tools":[{"tool_name":"help","confidence":0.95,"parameters":{"help_topic":"manage_conversion"}}]}

Message: "Ou trouver les statistiques ?"
-> {"tools":[{"tool_name":"help","confidence":0.9,"parameters":{"help_topic":"app_features"}}]}

Retourne JSON valide uniquement.',
  '[
    {"input":"Comment ajouter du materiel ?","output":{"tools":[{"tool_name":"help","confidence":0.96,"parameters":{"help_topic":"manage_material"}}]}},
    {"input":"Ou configurer les parcelles ?","output":{"tools":[{"tool_name":"help","confidence":0.95,"parameters":{"help_topic":"manage_plot"}}]}},
    {"input":"Comment faire 1 caisse = 6 kg ?","output":{"tools":[{"tool_name":"help","confidence":0.95,"parameters":{"help_topic":"manage_conversion"}}]}},
    {"input":"Ou enregistrer une recolte ?","output":{"tools":[{"tool_name":"help","confidence":0.95,"parameters":{"help_topic":"task"}}]}},
    {"input":"Ou trouver les stats ?","output":{"tools":[{"tool_name":"help","confidence":0.9,"parameters":{"help_topic":"app_features"}}]}}
  ]'::jsonb,
  jsonb_build_object(
    'version', '3.5',
    'purpose', 'tool_selection',
    'changes', 'Help specificity: help_topic ferme, constraints intent=help => tool help only, mapping and examples.',
    'variables', jsonb_build_array('intent', 'user_message', 'farm_context', 'available_tools'),
    'created_by', 'migration_080'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  examples = EXCLUDED.examples,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
