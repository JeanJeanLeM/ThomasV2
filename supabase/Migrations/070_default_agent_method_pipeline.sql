-- Migration 070: Mode pipeline par défaut pour les utilisateurs
-- Les nouvelles configs et le fallback (sans config) utilisent 'pipeline'.

-- 1. Changer la valeur par défaut de la colonne agent_method
ALTER TABLE public.farm_agent_config
  ALTER COLUMN agent_method SET DEFAULT 'pipeline';

-- 2. Lors de la création automatique d'une config (increment_agent_method_stats), utiliser 'pipeline'
CREATE OR REPLACE FUNCTION public.increment_agent_method_stats(
  p_farm_id INTEGER,
  p_method VARCHAR,
  p_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.farm_agent_config WHERE farm_id = p_farm_id) THEN
    INSERT INTO public.farm_agent_config (farm_id, agent_method)
    VALUES (p_farm_id, 'pipeline')
    ON CONFLICT (farm_id) DO NOTHING;
  END IF;

  IF p_method = 'simple' THEN
    UPDATE public.farm_agent_config
    SET 
      simple_total_count = simple_total_count + 1,
      simple_success_count = CASE WHEN p_success THEN simple_success_count + 1 ELSE simple_success_count END,
      updated_at = NOW()
    WHERE farm_id = p_farm_id;
  ELSIF p_method = 'pipeline' THEN
    UPDATE public.farm_agent_config
    SET 
      pipeline_total_count = pipeline_total_count + 1,
      pipeline_success_count = CASE WHEN p_success THEN pipeline_success_count + 1 ELSE pipeline_success_count END,
      updated_at = NOW()
    WHERE farm_id = p_farm_id;
  END IF;

  RAISE NOTICE '📊 Stats updated for farm % - method % - success %', p_farm_id, p_method, p_success;
END;
$$;

COMMENT ON COLUMN public.farm_agent_config.agent_method IS 'Méthode utilisée: simple (prompt monolithique) ou pipeline (tool calling). Défaut: pipeline.';
