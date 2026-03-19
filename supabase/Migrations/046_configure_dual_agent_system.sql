-- Migration 046: Configure Dual Agent System (Post-045)
-- Configure le système dual agent après l'état de la DB post-045
-- S'assure que les deux méthodes sont actives et configurées correctement

-- ============================================================================
-- 1. VÉRIFICATION ET ACTIVATION DES PROMPTS
-- ============================================================================

-- S'assurer que le prompt simple v2.0 est actif et par défaut pour 'simple'
UPDATE public.chat_prompts
SET 
  is_active = TRUE,
  is_default = TRUE,
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"method": "simple"}'::jsonb
WHERE name = 'thomas_agent_system' 
  AND version = '2.0';

-- S'assurer que le prompt pipeline v3.0 est actif mais pas par défaut
UPDATE public.chat_prompts
SET 
  is_active = TRUE,
  is_default = FALSE,
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"method": "pipeline"}'::jsonb
WHERE name = 'thomas_agent_system' 
  AND version = '3.0';

-- Désactiver les autres versions de thomas_agent_system si elles existent
UPDATE public.chat_prompts
SET is_active = FALSE, is_default = FALSE
WHERE name = 'thomas_agent_system' 
  AND version NOT IN ('2.0', '3.0');

-- ============================================================================
-- 2. CONFIGURATION PAR DÉFAUT POUR LES FERMES
-- ============================================================================

-- Créer une config par défaut pour toutes les fermes sans config
INSERT INTO public.farm_agent_config (
  farm_id,
  agent_method,
  config_reason,
  simple_success_count,
  simple_total_count,
  pipeline_success_count,
  pipeline_total_count
)
SELECT 
  f.id as farm_id,
  'simple' as agent_method,
  'Configuration par défaut - migration 046' as config_reason,
  0 as simple_success_count,
  0 as simple_total_count,
  0 as pipeline_success_count,
  0 as pipeline_total_count
FROM public.farms f
WHERE NOT EXISTS (
  SELECT 1 FROM public.farm_agent_config fac 
  WHERE fac.farm_id = f.id
)
ON CONFLICT (farm_id) DO NOTHING;

-- ============================================================================
-- 3. VÉRIFICATION ET RAPPORT
-- ============================================================================

DO $$
DECLARE
  v_simple_prompt RECORD;
  v_pipeline_prompt RECORD;
  v_farms_configured INTEGER;
  v_farms_total INTEGER;
BEGIN
  -- Récupérer infos prompts
  SELECT 
    version, 
    is_active, 
    is_default, 
    LENGTH(content) as content_length,
    metadata->>'method' as method
  INTO v_simple_prompt
  FROM public.chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.0';
  
  SELECT 
    version, 
    is_active, 
    is_default, 
    LENGTH(content) as content_length,
    metadata->>'method' as method
  INTO v_pipeline_prompt
  FROM public.chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '3.0';
  
  -- Compter fermes
  SELECT COUNT(*) INTO v_farms_configured
  FROM public.farm_agent_config;
  
  SELECT COUNT(*) INTO v_farms_total
  FROM public.farms;
  
  -- Afficher rapport détaillé
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '   SYSTÈME DUAL AGENT - CONFIGURATION FINALE';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Vérification prompt simple
  IF v_simple_prompt IS NOT NULL THEN
    RAISE NOTICE '✅ MÉTHODE SIMPLE (v2.0):';
    RAISE NOTICE '   • Active: %', v_simple_prompt.is_active;
    RAISE NOTICE '   • Par défaut: %', v_simple_prompt.is_default;
    RAISE NOTICE '   • Taille: % caractères', v_simple_prompt.content_length;
    RAISE NOTICE '   • Méthode: %', COALESCE(v_simple_prompt.method, 'non définie');
    
    IF v_simple_prompt.content_length < 8000 THEN
      RAISE WARNING '   ⚠️ ATTENTION: Prompt court, devrait être ~9000 caractères';
    END IF;
  ELSE
    RAISE WARNING '❌ PROBLÈME: Prompt simple v2.0 introuvable !';
  END IF;
  
  RAISE NOTICE '';
  
  -- Vérification prompt pipeline
  IF v_pipeline_prompt IS NOT NULL THEN
    RAISE NOTICE '✅ MÉTHODE PIPELINE (v3.0):';
    RAISE NOTICE '   • Active: %', v_pipeline_prompt.is_active;
    RAISE NOTICE '   • Par défaut: %', v_pipeline_prompt.is_default;
    RAISE NOTICE '   • Taille: % caractères', v_pipeline_prompt.content_length;
    RAISE NOTICE '   • Méthode: %', COALESCE(v_pipeline_prompt.method, 'non définie');
  ELSE
    RAISE WARNING '❌ PROBLÈME: Prompt pipeline v3.0 introuvable !';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE '   CONFIGURATION DES FERMES';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE '';
  RAISE NOTICE '• Fermes totales: %', v_farms_total;
  RAISE NOTICE '• Fermes configurées: %', v_farms_configured;
  
  IF v_farms_configured = v_farms_total THEN
    RAISE NOTICE '✅ Toutes les fermes ont une configuration !';
  ELSE
    RAISE WARNING '⚠️ % ferme(s) sans configuration', v_farms_total - v_farms_configured;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  
  -- Validation finale
  IF v_simple_prompt.is_active AND v_pipeline_prompt.is_active AND v_farms_configured > 0 THEN
    RAISE NOTICE '🎉 SYSTÈME DUAL AGENT OPÉRATIONNEL !';
    RAISE NOTICE '';
    RAISE NOTICE 'Vous pouvez maintenant:';
    RAISE NOTICE '1. Ouvrir l''app mobile';
    RAISE NOTICE '2. Aller dans Profil → Assistant IA';
    RAISE NOTICE '3. Choisir entre Méthode Simple et Pipeline';
  ELSE
    RAISE WARNING '⚠️ Configuration incomplète, vérifiez les erreurs ci-dessus';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 4. VUE RÉCAPITULATIVE POUR DEBUG
-- ============================================================================

-- Afficher l'état final des prompts thomas_agent_system
SELECT 
  version,
  is_active,
  is_default,
  LENGTH(content) as size_chars,
  metadata->>'method' as method,
  metadata->>'source' as source,
  created_at::date as created,
  updated_at::date as updated
FROM public.chat_prompts
WHERE name = 'thomas_agent_system'
ORDER BY 
  CASE 
    WHEN version = '2.0' THEN 1
    WHEN version = '3.0' THEN 2
    ELSE 3
  END;

-- Afficher les premières configs ferme
SELECT 
  f.name as farm_name,
  fac.agent_method,
  fac.simple_success_count,
  fac.simple_total_count,
  fac.pipeline_success_count,
  fac.pipeline_total_count,
  CASE 
    WHEN fac.simple_total_count > 0 
    THEN ROUND((fac.simple_success_count::numeric / fac.simple_total_count * 100), 1)
    ELSE 0
  END as simple_success_rate,
  CASE 
    WHEN fac.pipeline_total_count > 0 
    THEN ROUND((fac.pipeline_success_count::numeric / fac.pipeline_total_count * 100), 1)
    ELSE 0
  END as pipeline_success_rate
FROM public.farms f
LEFT JOIN public.farm_agent_config fac ON f.id = fac.farm_id
ORDER BY f.id
LIMIT 10;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 046 terminée avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Consultez le guide: docs/agent/DEPLOYMENT_DUAL_SYSTEM.md';
  RAISE NOTICE '';
END $$;
