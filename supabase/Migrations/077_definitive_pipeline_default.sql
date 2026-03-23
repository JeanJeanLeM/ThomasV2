-- Migration 077: Fix définitif — pipeline par défaut pour tous les nouveaux comptes
-- Cause: migration 047 définissait increment_agent_method_stats avec agent_method='simple'
-- même si migration 070 l'a corrigé, une application incomplète pouvait laisser l'ancienne version.

-- ============================================================
-- 1. Colonne par défaut → 'pipeline'
-- ============================================================
ALTER TABLE public.farm_agent_config
  ALTER COLUMN agent_method SET DEFAULT 'pipeline';

-- ============================================================
-- 2. Recréer increment_agent_method_stats avec 'pipeline' comme défaut
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_agent_method_stats(
  p_farm_id INTEGER,
  p_method  VARCHAR,
  p_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer la config si elle n'existe pas encore (défaut: pipeline)
  IF NOT EXISTS (SELECT 1 FROM public.farm_agent_config WHERE farm_id = p_farm_id) THEN
    INSERT INTO public.farm_agent_config (farm_id, agent_method, config_reason)
    VALUES (p_farm_id, 'pipeline', 'Configuration par défaut - première utilisation (pipeline)')
    ON CONFLICT (farm_id) DO NOTHING;
  END IF;

  -- Incrémenter les compteurs selon la méthode utilisée
  IF p_method = 'simple' THEN
    UPDATE public.farm_agent_config
    SET
      simple_total_count   = simple_total_count + 1,
      simple_success_count = CASE WHEN p_success THEN simple_success_count + 1 ELSE simple_success_count END,
      updated_at           = NOW()
    WHERE farm_id = p_farm_id;
  ELSIF p_method = 'pipeline' THEN
    UPDATE public.farm_agent_config
    SET
      pipeline_total_count   = pipeline_total_count + 1,
      pipeline_success_count = CASE WHEN p_success THEN pipeline_success_count + 1 ELSE pipeline_success_count END,
      updated_at             = NOW()
    WHERE farm_id = p_farm_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_agent_method_stats TO authenticated;

-- ============================================================
-- 3. Corriger toutes les lignes 'simple' qui sont des défauts auto
--    (config_reason NULL ou marqué comme défaut / première utilisation)
-- ============================================================
UPDATE public.farm_agent_config
SET
  agent_method  = 'pipeline',
  config_reason = 'Configuration par défaut - première utilisation (pipeline)',
  updated_at    = NOW()
WHERE agent_method = 'simple'
  AND (
    config_reason IS NULL
    OR config_reason ILIKE '%défaut%'
    OR config_reason ILIKE '%defaut%'
    OR config_reason ILIKE '%première%'
    OR config_reason ILIKE '%premiere%'
    OR config_reason ILIKE '%default%'
    OR config_reason ILIKE '%first%'
  );

COMMENT ON COLUMN public.farm_agent_config.agent_method
  IS 'Méthode d''analyse agent: simple ou pipeline. Défaut: pipeline.';
