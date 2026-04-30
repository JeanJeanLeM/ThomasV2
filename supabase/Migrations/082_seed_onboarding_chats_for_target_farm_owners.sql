-- Migration 082: Seed onboarding chats for target farm owners
-- Date: 2026-01-23
-- Scope: farms 56 and 57 owners only
-- Goal:
--   - Keep all existing chats untouched
--   - Add one onboarding chat per targeted owner if missing
--   - Seed the 2 startup onboarding messages (Onboarding + Continuer)

BEGIN;

WITH target_owners AS (
  SELECT *
  FROM (VALUES
    (56, 'f068e520-516b-40b3-b957-c5160641275b'::uuid), -- Fleurs en Bray
    (57, 'e916a918-83eb-41b8-ab72-1331b78fe8e1'::uuid)  -- La ferme des brindilles
  ) AS t(farm_id, owner_id)
),
owner_context AS (
  SELECT
    t.farm_id,
    t.owner_id AS user_id,
    COALESCE(
      NULLIF(BTRIM(p.first_name), ''),
      NULLIF(split_part(COALESCE(BTRIM(p.full_name), ''), ' ', 1), ''),
      NULLIF(split_part(COALESCE(BTRIM(p.email), ''), '@', 1), ''),
      ''
    ) AS first_name,
    COALESCE(NULLIF(BTRIM(f.name), ''), 'votre ferme') AS farm_name
  FROM target_owners t
  JOIN public.farms f
    ON f.id = t.farm_id
   AND f.owner_id = t.owner_id
  LEFT JOIN public.profiles p
    ON p.id = t.owner_id
  WHERE f.is_active = true
),
owners_missing_onboarding_chat AS (
  SELECT oc.*
  FROM owner_context oc
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.farm_id = oc.farm_id
      AND cs.user_id = oc.user_id
      AND cs.status = 'active'
      AND cs.archived_at IS NULL
      AND (
        cs.title IN ('Onboarding & aide rapide', 'Bienvenue sur Thomas')
        OR EXISTS (
          SELECT 1
          FROM public.chat_messages cm
          WHERE cm.session_id = cs.id
            AND cm.role = 'assistant'
            AND cm.metadata->>'type' IN ('welcome_onboarding', 'onboarding_intro_continue_prompt')
        )
      )
  )
),
inserted_sessions AS (
  INSERT INTO public.chat_sessions (
    farm_id,
    user_id,
    chat_type,
    title,
    is_shared,
    status,
    description
  )
  SELECT
    om.farm_id,
    om.user_id,
    'general',
    'Onboarding & aide rapide',
    true,
    'active',
    'AUTO_ONBOARDING_OWNER_TARGET_MIG_082'
  FROM owners_missing_onboarding_chat om
  RETURNING id, farm_id, user_id
),
inserted_welcome_messages AS (
  INSERT INTO public.chat_messages (
    session_id,
    role,
    content,
    ai_confidence,
    metadata
  )
  SELECT
    s.id,
    'assistant',
    '👋 Bonjour'
      || CASE WHEN oc.first_name <> '' THEN ' ' || oc.first_name ELSE '' END
      || ' !'
      || E'\n\n'
      || 'Je suis Thomas, votre assistant pour ' || oc.farm_name || E'.\n'
      || 'Nouveau dans cette ferme ?' || E'\n'
      || 'Utilisez le raccourci ci-dessous pour lancer l''onboarding en un clic.',
    1,
    jsonb_build_object(
      'type', 'welcome_onboarding',
      'has_actions', false,
      'is_help_request', true,
      'help_shortcut', jsonb_build_object(
        'screen', 'ONBOARDING_TUTORIAL',
        'label', 'Onboarding'
      ),
      'onboarding_message_key',
        s.user_id::text || ':' || s.farm_id::text || ':' || FLOOR(EXTRACT(EPOCH FROM NOW()))::bigint::text,
      'onboarding_simulation', true
    )
  FROM inserted_sessions s
  JOIN owners_missing_onboarding_chat oc
    ON oc.farm_id = s.farm_id
   AND oc.user_id = s.user_id
  RETURNING session_id
)
INSERT INTO public.chat_messages (
  session_id,
  role,
  content,
  ai_confidence,
  metadata
)
SELECT
  s.id,
  'assistant',
  'Ensuite, appuyez sur Continuer pour voir des exemples de messages.',
  1,
  jsonb_build_object(
    'type', 'onboarding_intro_continue_prompt',
    'has_actions', false,
    'is_help_request', true,
    'help_shortcut', jsonb_build_object(
      'screen', 'ONBOARDING_INTRO_CONTINUE',
      'label', 'Continuer'
    ),
    'onboarding_simulation', true
  )
FROM inserted_sessions s;

COMMIT;

DO $$
DECLARE
  v_created integer;
BEGIN
  SELECT COUNT(*)
  INTO v_created
  FROM public.chat_sessions
  WHERE description = 'AUTO_ONBOARDING_OWNER_TARGET_MIG_082';

  RAISE NOTICE 'Migration 082 applied. Sessions created by this migration: %', v_created;
END $$;
