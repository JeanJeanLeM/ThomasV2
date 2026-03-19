-- Migration 050: Prompts d'extraction pour task et observation
-- Date: 2026-02-03
-- Description: Ajoute task_extraction et observation_extraction aux prompts pipeline

-- ============================================================================
-- 1. PROMPT: task_extraction (pour task_done, task_planned, harvest)
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'task_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Tâche

Tu analyses des messages de tâche (action réalisée ou planifiée). Extrais en JSON structuré.

Message: {{user_message}}
Date du jour: {{current_date_iso}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **task_type**: done (passé) | planned (futur)
2. **action**: verbe infinitif + complément si ambigu (planter, désherber, passer la herse, préparer les commandes)
3. **task_category**: production | commercialisation | administratif | general
4. **crop/crops**: culture(s) ou animal (tomates, poules, chèvres)
5. **plots**: parcelles ["serre 1", "planche 2"]
6. **materials**: matériel ["tracteur", "pulvérisateur"]
7. **quantity**: { value, unit } si quantité mentionnée
8. **quantity_type**: recolte | engrais | produit_phyto | plantation | vente | autre
9. **quantity_nature**: nom spécifique (concombres, fumier)
10. **duration**: { value, unit } si durée mentionnée
11. **date**: YYYY-MM-DD calculé (aujourd''hui, hier, demain → date ISO)
12. **scheduled_date/scheduled_time**: pour task_planned

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
    "date": "2026-02-03",
    "scheduled_date": null,
    "scheduled_time": null
  }
}
```

## EXEMPLES

"j''ai désherbé la serre 1 pendant 1h" → action: désherber, plots: ["serre 1"], duration: {value: 60, unit: "minutes"}, task_category: production
"je vais planter demain matin" → task_type: planned, scheduled_date: date+1, scheduled_time: "matin"
"vendu 12 caisses au marché" → action: vendre, quantity: {value: 12, unit: "caisses"}, task_category: commercialisation
"préparé les commandes" → action: préparer les commandes, task_category: commercialisation
"j''ai nourri les poules" → action: nourrir, crop: "poules", task_category: production

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'task_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context', 'current_date_iso'),
    'intents', jsonb_build_array('task_done', 'task_planned'),
    'created_by', 'migration_050'
  )
)
ON CONFLICT (name, version) DO UPDATE SET
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = NOW();

-- ============================================================================
-- 2. PROMPT: observation_extraction
-- ============================================================================

INSERT INTO chat_prompts (name, version, is_active, content, metadata) VALUES (
  'observation_extraction',
  '1.0',
  true,
  '# THOMAS - Extraction Observation

Tu analyses des messages d''observation terrain. Extrais en JSON structuré.

Message: {{user_message}}
Contexte ferme: {{farm_context}}

## EXTRACTION

1. **issue**: constat/problème observé (OBLIGATOIRE) - "pucerons", "mildiou", "bruit étrange"
2. **subject_type**: culture | materiel | batiment | personne
3. **crop/crops**: si subject_type=culture
4. **subject**: si subject_type=materiel|batiment|personne
5. **plots**: parcelles/planches ["serre 1", "planche 2"]
6. **category**: ravageurs | maladies | carences | degats_climatiques | degats_materiel | humain | problemes_sol | croissance | maturation | autre
7. **severity**: basse | moyen | haute (défaut: moyen)
8. **date**: YYYY-MM-DD ou expression relative

## CATÉGORIES
- ravageurs: insectes, acariens (pucerons, doryphores, limaces)
- maladies: champignons, virus (mildiou, oïdium)
- carences: nutritives (fer, azote)
- degats_climatiques: grêle, gel, sécheresse
- degats_materiel: pannes équipement/bâtiment
- humain: santé, blessure personne
- problemes_sol: compactage, drainage, pH
- croissance: floraison, levée, germination (positif/neutre)
- maturation: fruits mûrs

## FORMAT JSON

```json
{
  "original_text": "J''ai vu des pucerons sur les tomates",
  "decomposed_text": "Observation: pucerons sur tomates",
  "confidence": 0.95,
  "extracted_data": {
    "issue": "pucerons",
    "subject_type": "culture",
    "crop": "tomates",
    "crops": null,
    "subject": null,
    "plots": [],
    "category": "ravageurs",
    "severity": "moyen",
    "date": "aujourd''hui"
  }
}
```

## EXEMPLES

"mildiou sur les vignes du champ nord" → issue: mildiou, crop: vignes, plots: ["champ nord"], category: maladies
"le tracteur fait un bruit étrange" → issue: bruit étrange, subject_type: materiel, subject: tracteur, category: degats_materiel
"la serre 1 ne s''ouvre plus" → issue: ne s''ouvre plus, subject_type: batiment, subject: serre 1, category: degats_materiel
"Marie a mal au dos" → issue: mal au dos, subject_type: personne, subject: Marie, category: humain
"les courgettes fleurissent" → issue: floraison courgettes, crop: courgettes, category: croissance, severity: basse

Retourne UNIQUEMENT le JSON.',
  jsonb_build_object(
    'version', '1.0',
    'purpose', 'observation_extraction',
    'variables', jsonb_build_array('user_message', 'farm_context'),
    'intents', jsonb_build_array('observation'),
    'created_by', 'migration_050'
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
DECLARE
  prompt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prompt_count 
  FROM chat_prompts 
  WHERE name IN ('task_extraction', 'observation_extraction')
    AND is_active = true;
  
  IF prompt_count = 2 THEN
    RAISE NOTICE '✅ Les 2 prompts d''extraction (task, observation) sont actifs';
  ELSE
    RAISE WARNING '⚠️ Seulement % prompts actifs sur 2', prompt_count;
  END IF;
END $$;
