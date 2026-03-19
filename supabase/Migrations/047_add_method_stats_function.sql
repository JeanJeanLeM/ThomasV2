-- Migration 047: Add Method Stats Increment Function
-- Fonction RPC pour incrémenter les statistiques de méthode agent

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
  -- Vérifier que farm_agent_config existe
  IF NOT EXISTS (SELECT 1 FROM public.farm_agent_config WHERE farm_id = p_farm_id) THEN
    -- Créer config par défaut
    INSERT INTO public.farm_agent_config (farm_id, agent_method)
    VALUES (p_farm_id, 'simple')
    ON CONFLICT (farm_id) DO NOTHING;
  END IF;

  -- Incrémenter les compteurs selon la méthode
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

-- Donner accès à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.increment_agent_method_stats TO authenticated;

-- Test de la fonction
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonction increment_agent_method_stats créée';
  RAISE NOTICE '';
  RAISE NOTICE 'Cette fonction sera appelée automatiquement par les Edge Functions';
  RAISE NOTICE 'pour enregistrer les performances de chaque méthode.';
  RAISE NOTICE '';
END $$;
