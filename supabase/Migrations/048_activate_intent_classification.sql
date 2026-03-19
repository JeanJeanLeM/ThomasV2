-- Migration 048: Activer le prompt intent_classification v3.0
-- Ce prompt est nécessaire pour le pipeline agent

UPDATE public.chat_prompts
SET is_active = TRUE
WHERE name = 'intent_classification'
  AND version = '3.0';

-- Vérifier le résultat
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.chat_prompts
  WHERE name IN ('intent_classification', 'tool_selection', 'response_synthesis')
    AND version = '3.0'
    AND is_active = TRUE;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 048 terminée';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Prompts v3.0 actifs: % / 3', v_count;
  
  IF v_count = 3 THEN
    RAISE NOTICE '✅ Tous les prompts v3.0 sont actifs - Pipeline prêt!';
  ELSE
    RAISE WARNING '⚠️  Seulement % prompts v3.0 actifs - Vérifiez la configuration', v_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- Afficher les prompts v3.0
SELECT 
  name,
  version,
  is_active,
  LENGTH(content) as content_length,
  metadata->>'purpose' as purpose
FROM public.chat_prompts
WHERE version = '3.0'
  AND name IN ('intent_classification', 'tool_selection', 'response_synthesis', 'thomas_agent_system')
ORDER BY name;
