-- Migration 081: Create onboarding chat for all farm users
-- Date: 2026-01-23
-- Goal:
--   - Ensure every active farm user has one onboarding chat
--   - Seed the 2 startup onboarding messages required by the app flow
--   - Keep migration idempotent (safe to rerun)

BEGIN;

WITH target_users AS (
  -- Active farm members
  SELECT DISTINCT
    fm.farm_id,
    fm.user_id
  FROM public.farm_members fm
  WHERE fm.is_active = true

  UNION

  -- Farm owners (in case one owner row is missing in farm_members)
  SELECT DISTINCT
    f.id AS farm_id,
    f.owner_id AS user_id
  FROM public.farms f
  WHERE f.is_active = true
    AND f.owner_id IS NOT NULL
),
target_users_with_context AS (
  SELECT
    tu.farm_id,
    tu.user_id,
    COALESCE(
      NULLIF(BTRIM(p.first_name), ''),
      NULLIF(split_part(COALESCE(BTRIM(p.full_name), ''), ' ', 1), ''),
      NULLIF(split_part(COALESCE(BTRIM(p.email), ''), '@', 1), ''),
      ''
    ) AS first_name,
    COALESCE(NULLIF(BTRIM(f.name), ''), 'votre ferme') AS farm_name
  FROM target_users tu
  JOIN public.farms f
    ON f.id = tu.farm_id
  LEFT JOIN public.profiles p
    ON p.id = tu.user_id
  WHERE f.is_active = true
),
users_missing_onboarding_chat AS (
  SELECT t.*
  FROM target_users_with_context t
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE cs.farm_id = t.farm_id
      AND cs.user_id = t.user_id
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
    u.farm_id,
    u.user_id,
    'general',
    'Onboarding & aide rapide',
    true,
    'active',
    'AUTO_ONBOARDING_MIGRATION_081'
  FROM users_missing_onboarding_chat u
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
      || CASE WHEN u.first_name <> '' THEN ' ' || u.first_name ELSE '' END
      || ' !'
      || E'\n\n'
      || 'Je suis Thomas, votre assistant pour ' || u.farm_name || E'.\n'
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
      'onboarding_message_key', s.user_id::text || ':' || s.farm_id::text || ':' || FLOOR(EXTRACT(EPOCH FROM NOW()))::bigint::text,
      'onboarding_simulation', true
    )
  FROM inserted_sessions s
  JOIN users_missing_onboarding_chat u
    ON u.farm_id = s.farm_id
   AND u.user_id = s.user_id
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
  v_total integer;
BEGIN
  SELECT COUNT(*)
  INTO v_total
  FROM public.chat_sessions
  WHERE description = 'AUTO_ONBOARDING_MIGRATION_081';

  RAISE NOTICE 'Migration 081 applied. Onboarding sessions created by this migration: %', v_total;
END $$;
