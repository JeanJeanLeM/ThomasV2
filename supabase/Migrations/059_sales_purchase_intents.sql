-- Migration 059: Intents sale et purchase pour le pipeline
-- Date: 2026-02-11
-- Description: Ajouter intent_classification v4.2, tool_selection v3.3, sale_extraction v1.0, purchase_extraction v1.0

-- ============================================================================
-- 1. DÉSACTIVER intent_classification v4.1 (remplacé par v4.2)
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplacé par v4.2 - ajout sale et purchase"'
    ),
    updated_at = NOW()
WHERE name = 'intent_classification' AND version = '4.1';

-- ============================================================================
-- 2. INSÉRER intent_classification v4.2 (sale, purchase ajoutés)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'intent_classification',
  '4.2',
  true,
  true,
  '# intent_classification v4.2

Classifier l''intention de messages agricoles français. Supporter le multi-intent et la reconstruction de contexte pour les fragments incomplets.

Message: "{{user_message}}"

Contexte ferme: {{farm_context_summary}}

---

## Intentions (définitions concises)

### observation
Constat terrain: problème, symptôme, stade phénologique, dégât équipement/bâtiment, état d''une personne.
Mots-clés: "vu", "observé", "remarqué", "constaté", "il y a", "problème de", "attaque de".

### task_done
Action agricole réalisée au passé, y compris les récoltes (avec ou sans quantité).
Mots-clés: "j''ai [planté|semé|traité|désherbé|arrosé|inspecté|surveillé|biné|passé|récolté]".
Règle: Verbe au passé composé + action concrète. La quantité est une propriété de la tâche, pas un intent séparé.

### task_planned
Action future planifiée.
Mots-clés: "je vais", "demain", "prévu", "planifier", "il faut", "je dois".

### sale
Vente de produits à un client. Prix mentionné ou implicite.
Mots-clés: "vendu", "vente", "facturé", "livré à", "à [nom client]", "€", "euros".
Règle: Action de vente avec quantité + client + (optionnel) prix. Ex: "j''ai vendu 4 caisses de radis à Bernard".

### purchase
Achat de produits à un fournisseur.
Mots-clés: "acheté", "commandé", "reçu de", "chez [nom]", "au [magasin]".
Règle: Action d''achat avec quantité + fournisseur. Ex: "j''ai acheté 10 sacs de terreau chez Jardiland".

### manage_plot
Configuration parcelle/serre/tunnel.
Mots-clés: "créer parcelle", "ajouter serre", "nouvelle serre", "modifier parcelle", "planches", "planche".

### manage_conversion
Configuration conversion unités (conteneur → kg/L).
Mots-clés: "conversion", "1 caisse =", "panier fait", "configurer conversion", "caisse de tomates", "équivalent".

### manage_material
Configuration matériel/équipement.
Mots-clés: "ajouter matériel", "enregistrer tracteur", "nouveau tracteur", "ajouter herse", "modifier matériel".

### help
Question ou demande d''assistance.
Mots-clés: "comment", "où", "quand", "pourquoi", "quel", "?", "aide", "expliquer".

---

## Multi-intent et reconstruction de message

Quand un message contient plusieurs actions reliées par "et", "puis", "ensuite", virgule:
1. Découper en fragments (un par action)
2. Pour chaque fragment, classifier l''intent
3. Reconstruire les fragments incomplets avec le contexte des fragments précédents

---

## Format de sortie JSON

Retourne UNIQUEMENT du JSON valide, sans texte avant ou après.

### Structure des champs

- **intent** (obligatoire): observation | task_done | task_planned | sale | purchase | manage_plot | manage_conversion | manage_material | help
- **confidence** (obligatoire): nombre entre 0 et 1
- **text_span** (obligatoire): portion du message original pour ce fragment
- **reconstructed_message** (obligatoire): message complété avec contexte si nécessaire
- **context_inferred** (optionnel): { subject_type, subject, source } si contexte propagé

Retourne JSON valide uniquement.',
  '["j''ai vendu 4 caisses de radis à Bernard", "j''ai acheté 10 sacs chez Jardiland", "j''ai récolté des tomates"]',
  jsonb_build_object(
    'version', '4.2',
    'purpose', 'intent_classification',
    'changes', 'ajout sale et purchase pour facturation',
    'variables', jsonb_build_array('user_message', 'farm_context_summary'),
    'created_by', 'migration_059'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- 3. DÉSACTIVER tool_selection v3.2 (remplacé par v3.3)
-- ============================================================================

UPDATE chat_prompts
SET is_active = false,
    is_default = false,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated}',
      '"Remplacé par v3.3 - create_sale et create_purchase"'
    ),
    updated_at = NOW()
WHERE name = 'tool_selection' AND version = '3.2';

-- ============================================================================
-- 4. INSÉRER tool_selection v3.3 (create_sale, create_purchase)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, is_default, content, examples, metadata) VALUES (
  'tool_selection',
  '3.3',
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

### Pour create_observation, create_task_done, create_task_planned, manage_plot, manage_conversion, manage_material, help:
(Voir règles existantes v3.2)

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

## EXEMPLES:

Message: "J''ai vendu 4 caisses de radis à Bernard à 20€ la caisse"
→ {"tools": [{"tool_name": "create_sale", "confidence": 0.95, "parameters": {"customer_name": "Bernard", "quantity": {"value": 4, "unit": "caisses"}, "quantity_nature": "radis", "price": {"value": 20, "is_unit_price": true, "is_ttc": false}, "vat_rate": 5.5, "payment_status": "to_be_paid"}}]}

Message: "J''ai acheté 10 sacs de terreau à 15€ l''unité chez Jardiland"
→ {"tools": [{"tool_name": "create_purchase", "confidence": 0.95, "parameters": {"supplier_name": "Jardiland", "quantity": {"value": 10, "unit": "sacs"}, "quantity_nature": "terreau", "price": {"value": 15, "is_unit_price": true, "is_ttc": false}, "vat_rate": 5.5, "payment_status": "to_be_paid"}}]}

Retourne JSON valide uniquement.',
  '["j''ai vendu 4 caisses à Bernard", "j''ai acheté chez Jardiland"]',
  jsonb_build_object(
    'version', '3.3',
    'purpose', 'tool_selection',
    'changes', 'create_sale et create_purchase ajoutés',
    'variables', jsonb_build_array('intent', 'user_message', 'farm_context', 'available_tools'),
    'created_by', 'migration_059'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  is_active = EXCLUDED.is_active,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- ============================================================================
-- 5. PROMPT sale_extraction v1.0
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'sale_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Vente

Tu analyses des messages de vente. Extrais en JSON structuré.

Message: {{user_message}}
Date du jour: {{current_date_iso}}
Contexte ferme: {{farm_context}} (clients, conversions, produits)

## EXTRACTION

1. **customer_name**: nom du client (OBLIGATOIRE)
2. **quantity**: { value, unit } (ex: 4, caisses)
3. **quantity_nature**: produit/culture vendu (radis, tomates)
4. **price**: { value, is_unit_price, is_ttc }
   - value: montant en euros
   - is_unit_price: true = "20€ la caisse", false = "80€ au total"
   - is_ttc: true = TTC, false = HT (défaut)
5. **vat_rate**: 5.5 (agricole) ou 0, 10, 20
6. **payment_due_date**: YYYY-MM-DD ou null
7. **payment_status**: "paid" | "to_be_paid"
8. **delivery_date**: YYYY-MM-DD ou null
9. **notes**: précisions (optionnel)

## RÈGLES DE CALCUL

- Si is_unit_price: total_ht = quantity × price_value (ou conversion HT si is_ttc)
- Si !is_unit_price: unit_price_ht = price_value / quantity
- Si is_ttc: price_ht = price_ttc / (1 + vat_rate/100)

## FORMAT JSON

```json
{
  "original_text": "j''ai vendu 4 caisses de radis à Bernard à 20€ la caisse",
  "decomposed_text": "vente 4 caisses radis Bernard 20€/caisse",
  "confidence": 0.95,
  "extracted_data": {
    "customer_name": "Bernard",
    "quantity": { "value": 4, "unit": "caisses" },
    "quantity_nature": "radis",
    "price": { "value": 20, "is_unit_price": true, "is_ttc": false },
    "vat_rate": 5.5,
    "payment_due_date": null,
    "payment_status": "to_be_paid",
    "delivery_date": null,
    "notes": null
  }
}
```

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'sale_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context', 'current_date_iso'),
    'created_by', 'migration_059'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- 6. PROMPT purchase_extraction v1.0
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'purchase_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Achat

Tu analyses des messages d''achat. Extrais en JSON structuré.

Message: {{user_message}}
Date du jour: {{current_date_iso}}
Contexte ferme: {{farm_context}} (fournisseurs, conversions, produits)

## EXTRACTION

1. **supplier_name**: nom du fournisseur (OBLIGATOIRE)
2. **quantity**: { value, unit }
3. **quantity_nature**: produit acheté (terreau, engrais)
4. **price**: { value, is_unit_price, is_ttc }
5. **vat_rate**: 5.5 ou 0, 10, 20
6. **payment_status**: "paid" | "to_be_paid"
7. **delivery_date**: YYYY-MM-DD ou null
8. **notes**: optionnel

## FORMAT JSON

```json
{
  "original_text": "j''ai acheté 10 sacs de terreau à 15€ l''unité chez Jardiland",
  "decomposed_text": "achat 10 sacs terreau 15€/unité Jardiland",
  "confidence": 0.95,
  "extracted_data": {
    "supplier_name": "Jardiland",
    "quantity": { "value": 10, "unit": "sacs" },
    "quantity_nature": "terreau",
    "price": { "value": 15, "is_unit_price": true, "is_ttc": false },
    "vat_rate": 20,
    "payment_status": "to_be_paid",
    "delivery_date": null,
    "notes": null
  }
}
```

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'purchase_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context', 'current_date_iso'),
    'created_by', 'migration_059'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 059: intents sale/purchase et prompts extraction créés';
END $$;
