-- Migration 083: task_extraction v1.3 — règles explicites number_of_people
-- Date: 2026-04-01
-- Objectif:
--   - Conserver l'historique des prompts (pas de suppression)
--   - Introduire des règles explicites d'extraction de number_of_people
--   - Garantir un seul task_extraction actif/default en production

BEGIN;

-- Verrou transactionnel pour éviter les courses si plusieurs déploiements.
SELECT pg_advisory_xact_lock(hashtext('migration_083_task_extraction_v1_3_number_of_people'));

DO $$
DECLARE
  v_source_content text;
  v_source_metadata jsonb;
  v_new_content text;
BEGIN
  -- Source: préférer v1.2, sinon fallback sur la version la plus pertinente.
  SELECT cp.content, cp.metadata
  INTO v_source_content, v_source_metadata
  FROM public.chat_prompts cp
  WHERE cp.name = 'task_extraction'
  ORDER BY
    CASE WHEN cp.version = '1.2' THEN 0 ELSE 1 END,
    cp.is_active DESC,
    cp.is_default DESC,
    cp.updated_at DESC
  LIMIT 1;

  IF v_source_content IS NULL THEN
    RAISE EXCEPTION 'Migration 083: source task_extraction introuvable';
  END IF;

  v_new_content := v_source_content;

  -- 1) Champ explicite dans la section EXTRACTION.
  IF POSITION('14. **number_of_people**' IN v_new_content) = 0 THEN
    v_new_content := REPLACE(
      v_new_content,
      '13. **scheduled_date/scheduled_time**: pour task_planned',
      '13. **scheduled_date/scheduled_time**: pour task_planned
14. **number_of_people**: entier >= 1 (nombre de personnes ayant réalisé/prévu la tâche; défaut 1 si absent)'
    );
  END IF;

  -- 2) Règles métier explicites.
  IF POSITION('## RÈGLES `number_of_people`' IN v_new_content) = 0 THEN
    IF POSITION('## CATÉGORIES' IN v_new_content) > 0 THEN
      v_new_content := REPLACE(
        v_new_content,
        '## CATÉGORIES',
        '## RÈGLES `number_of_people` (IMPORTANT)
- Extraire `number_of_people` si le message mentionne un effectif.
- Interpréter "à deux", "à 2", "avec 2 personnes", "nous étions 3", "à trois", etc.
- Interpréter "avec mon stagiaire", "avec un ouvrier", "avec un collègue" comme 2 personnes (utilisateur + accompagnant).
- Si aucune mention claire, mettre `number_of_people` à 1.
- Valeur minimale: 1 (jamais 0).

## CATÉGORIES'
      );
    ELSE
      v_new_content := v_new_content || E'

## RÈGLES `number_of_people` (IMPORTANT)
- Extraire `number_of_people` si le message mentionne un effectif.
- Interpréter "à deux", "à 2", "avec 2 personnes", "nous étions 3", "à trois", etc.
- Interpréter "avec mon stagiaire", "avec un ouvrier", "avec un collègue" comme 2 personnes (utilisateur + accompagnant).
- Si aucune mention claire, mettre `number_of_people` à 1.
- Valeur minimale: 1 (jamais 0).';
    END IF;
  END IF;

  -- 3) Exemple JSON: garantir number_of_people.
  IF POSITION('"number_of_people": 1' IN v_new_content) = 0 THEN
    v_new_content := REPLACE(
      v_new_content,
      '"duration": null,',
      '"duration": null,
    "number_of_people": 1,'
    );
  END IF;

  -- 4) Exemples dédiés (si absents).
  IF POSITION('avec 2 personnes' IN v_new_content) = 0 THEN
    IF POSITION('## EXEMPLES' IN v_new_content) > 0 THEN
      v_new_content := REPLACE(
        v_new_content,
        '## EXEMPLES',
        '## EXEMPLES

"j''ai désherbé la serre 1 pendant 1h avec 2 personnes" → number_of_people: 2
"j''ai traité les tomates avec mon stagiaire" → number_of_people: 2
"nous étions 3 pour planter les salades" → number_of_people: 3'
      );
    ELSE
      v_new_content := v_new_content || E'

## EXEMPLES

"j''ai désherbé la serre 1 pendant 1h avec 2 personnes" → number_of_people: 2
"j''ai traité les tomates avec mon stagiaire" → number_of_people: 2
"nous étions 3 pour planter les salades" → number_of_people: 3';
    END IF;
  END IF;

  -- Upsert v1.3 (idempotent).
  INSERT INTO public.chat_prompts (name, version, is_active, is_default, content, metadata)
  VALUES (
    'task_extraction',
    '1.3',
    true,
    true,
    v_new_content,
    COALESCE(v_source_metadata, '{}'::jsonb) || jsonb_build_object(
      'version', '1.3',
      'created_by', 'migration_083',
      'purpose', 'task_extraction',
      'changelog', 'Ajout de règles explicites number_of_people + exemples; fallback 1 conservé'
    )
  )
  ON CONFLICT (name, version) DO UPDATE SET
    content = EXCLUDED.content,
    metadata = EXCLUDED.metadata,
    is_active = true,
    is_default = true,
    updated_at = NOW();

  -- Désactiver les autres versions actives/default (historique conservé).
  UPDATE public.chat_prompts
  SET
    is_active = false,
    is_default = false,
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'deprecated', true,
      'deprecated_since', NOW()::text,
      'replaced_by', '1.3'
    )
  WHERE name = 'task_extraction'
    AND version <> '1.3'
    AND (is_active = true OR is_default = true);
END $$;

-- Garde-fou: exactement un task_extraction actif/default.
DO $$
DECLARE
  v_active_count integer;
  v_active_default_count integer;
BEGIN
  SELECT COUNT(*) INTO v_active_count
  FROM public.chat_prompts
  WHERE name = 'task_extraction' AND is_active = true;

  SELECT COUNT(*) INTO v_active_default_count
  FROM public.chat_prompts
  WHERE name = 'task_extraction' AND is_active = true AND is_default = true;

  IF v_active_count <> 1 OR v_active_default_count <> 1 THEN
    RAISE EXCEPTION
      'Migration 083 invariant failed for task_extraction (active=%, active_default=%)',
      v_active_count, v_active_default_count;
  END IF;
END $$;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Migration 083 applied: task_extraction v1.3 active/default with explicit number_of_people rules.';
END $$;
