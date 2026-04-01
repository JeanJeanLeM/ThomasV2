-- Migration 078: task_extraction v1.2 — action libre sans culture
-- Date: 2026-03-24
-- Objectif: éviter les doublons de culture dans les cartes (ex: "Planter des choux" + "Choux")
-- Règle: la culture reste dans crop/crops ; action ne doit pas contenir la culture.

-- ============================================================================
-- 1. Déprécier task_extraction v1.1
-- ============================================================================

UPDATE public.chat_prompts
SET
  is_active  = false,
  is_default = false,
  metadata   = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'deprecated',       true,
    'deprecated_since', '2026-03-24',
    'replaced_by',      '1.2'
  ),
  updated_at = NOW()
WHERE name = 'task_extraction'
  AND version = '1.1';

-- ============================================================================
-- 2. Insérer task_extraction v1.2
-- ============================================================================

INSERT INTO public.chat_prompts (name, version, is_active, is_default, content, metadata) VALUES (
  'task_extraction',
  '1.2',
  true,
  true,
  '# THOMAS - Extraction Tâche v1.2

Tu analyses des messages de tâche (action réalisée ou planifiée). Extrais en JSON structuré.

Message: {{user_message}}
Date du jour: {{current_date_iso}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **task_type**: done (passé) | planned (futur)
2. **action**: verbe infinitif + complément métier si utile, MAIS SANS culture/animal
3. **standard_action**: code EXACT choisi parmi la liste ci-dessous (voir ## ACTIONS STANDARD)
4. **task_category**: production | commercialisation | administratif | general
5. **crop/crops**: culture(s) ou animal (tomates, poules, chèvres)
6. **plots**: parcelles ["serre 1", "planche 2"]
7. **materials**: matériel ["tracteur", "pulvérisateur"]
8. **quantity**: { value, unit } si quantité mentionnée
9. **quantity_type**: recolte | engrais | produit_phyto | plantation | vente | autre
10. **quantity_nature**: nom spécifique (concombres, fumier)
11. **duration**: { value, unit } si durée mentionnée
12. **date**: YYYY-MM-DD calculé (aujourd''hui, hier, demain → date ISO)
13. **scheduled_date/scheduled_time**: pour task_planned

## RÈGLES STRICTES POUR `action` (TRÈS IMPORTANT)

- `action` NE DOIT PAS contenir le nom de la culture/animal.
- La culture/animal doit aller uniquement dans `crop` / `crops`.
- Si l''objet est un intrant/équipement/contenant (bobine, bâche, pot, filet, tuteur, goutte-à-goutte, etc.), garder cet objet dans `action`.
- Si l''objet est une culture (choux, tomates, concombres, salades, etc.), ne pas le garder dans `action`.

Exemples obligatoires:
- "j''ai récolté des choux fleur" → action: "récolter", crop: "choux fleur"
- "j''ai planté des choux" → action: "planter", crop: "choux"
- "j''ai installé les bobines sur les concombres" → action: "installer bobines", crop: "concombres"
- "j''ai posé une bâche sur tomates" → action: "poser bâche", crop: "tomates"
- "j''ai mis des pots pour les semis" → action: "installer pots", crop: null

## ACTIONS STANDARD — choisir EXACTEMENT un code ci-dessous pour standard_action

{{standard_actions_catalog}}

**Règles standard_action :**
- Utiliser le code le plus précis selon le sens principal du message.
- Un message peut mélanger plusieurs verbes (ex. "j''ai taillé, coupé et enlevé les gourmands") → choisir **un seul code** (ici : tailler).
- Si aucun code ne correspond exactement, utiliser **autre**.
- Si l''action est ambiguë ou inconnue, mettre **null**.

## CATÉGORIES
- production: planter, semer, désherber, récolter, traiter, irriguer
- commercialisation: vendre, livrer, préparer les commandes, marché
- administratif: déclaration PAC, comptabilité, facturation
- general: réparer, formation, entretien

## FORMAT JSON

```json
{
  "original_text": "J''ai récolté 4 caisses de concombres",
  "decomposed_text": "récolter 4 caisses concombres",
  "confidence": 0.95,
  "task_type": "done",
  "extracted_data": {
    "action": "récolter",
    "standard_action": "recolter",
    "task_type": "done",
    "task_category": "production",
    "crop": "concombres",
    "crops": null,
    "plots": [],
    "materials": [],
    "quantity": { "value": 4, "unit": "caisses" },
    "quantity_nature": "concombres",
    "quantity_type": "recolte",
    "duration": null,
    "number_of_people": 1,
    "date": "2026-03-24",
    "scheduled_date": null,
    "scheduled_time": null
  }
}
```

## EXEMPLES

"j''ai désherbé la serre 1 pendant 1h" → action: "désherber", standard_action: "desherber", plots: ["serre 1"], duration: {value: 60, unit: "minutes"}
"j''ai taillé, coupé et enlevé les gourmands" → action: "tailler", standard_action: "tailler"
"récolté, cueilli, récupéré les concombres" → action: "récolter", crop: "concombres", standard_action: "recolter"
"je vais planter demain matin" → action: "planter", task_type: planned, standard_action: "planter", scheduled_date: date+1, scheduled_time: "matin"
"j''ai installé des bobines sur les concombres" → action: "installer bobines", crop: "concombres", standard_action: "installer"
"j''ai posé une bâche sur la serre 2" → action: "poser bâche", crop: null, standard_action: "installer"
"vendu 12 caisses au marché" → action: "vendre", standard_action: "vendre", task_category: commercialisation

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version',    '1.2',
    'purpose',    'task_extraction',
    'variables',  jsonb_build_array('user_message', 'farm_context', 'current_date_iso', 'standard_actions_catalog'),
    'intents',    jsonb_build_array('task_done', 'task_planned'),
    'created_by', 'migration_078',
    'changelog',  'Action libre sans culture/animal pour éviter les doublons UI; culture conservée uniquement dans crop/crops; standard_action inchangé'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content    = EXCLUDED.content,
  metadata   = EXCLUDED.metadata,
  is_active  = true,
  is_default = true,
  updated_at = NOW();
