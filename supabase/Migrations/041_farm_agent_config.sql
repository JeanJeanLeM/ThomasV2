-- Migration 041: Farm Agent Configuration
-- Permet de choisir entre les deux méthodes d'analyse (simple vs pipeline)
-- au niveau ferme et de tracker les performances

-- Table de configuration de la méthode d'agent par ferme
CREATE TABLE IF NOT EXISTS public.farm_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agent_method VARCHAR NOT NULL DEFAULT 'simple' 
    CHECK (agent_method IN ('simple', 'pipeline')),
  
  -- Métriques de comparaison pour Méthode 1 (simple)
  simple_success_count INTEGER DEFAULT 0 CHECK (simple_success_count >= 0),
  simple_total_count INTEGER DEFAULT 0 CHECK (simple_total_count >= 0),
  
  -- Métriques de comparaison pour Méthode 2 (pipeline)
  pipeline_success_count INTEGER DEFAULT 0 CHECK (pipeline_success_count >= 0),
  pipeline_total_count INTEGER DEFAULT 0 CHECK (pipeline_total_count >= 0),
  
  -- Métadonnées
  config_reason TEXT,
  switched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(farm_id)
);

-- Index pour performance
CREATE INDEX idx_farm_agent_config_farm_id ON public.farm_agent_config(farm_id);
CREATE INDEX idx_farm_agent_config_method ON public.farm_agent_config(agent_method);

-- Table de comparaison des méthodes
-- Permet de stocker les résultats côte à côte pour analyse
CREATE TABLE IF NOT EXISTS public.agent_method_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  
  -- Résultats Méthode 1 (simple prompt)
  method1_intent VARCHAR,
  method1_actions JSONB,
  method1_confidence NUMERIC(5,2) CHECK (method1_confidence >= 0 AND method1_confidence <= 1),
  method1_processing_ms INTEGER CHECK (method1_processing_ms >= 0),
  method1_success BOOLEAN,
  method1_error TEXT,
  
  -- Résultats Méthode 2 (pipeline)
  method2_intent VARCHAR,
  method2_actions JSONB,
  method2_confidence NUMERIC(5,2) CHECK (method2_confidence >= 0 AND method2_confidence <= 1),
  method2_processing_ms INTEGER CHECK (method2_processing_ms >= 0),
  method2_success BOOLEAN,
  method2_error TEXT,
  
  -- Comparaison
  methods_agree BOOLEAN,
  user_validated_method VARCHAR CHECK (user_validated_method IN ('method1', 'method2', 'neither', 'both')),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance et analyse
CREATE INDEX idx_agent_method_comparisons_farm ON public.agent_method_comparisons(farm_id);
CREATE INDEX idx_agent_method_comparisons_user ON public.agent_method_comparisons(user_id);
CREATE INDEX idx_agent_method_comparisons_date ON public.agent_method_comparisons(created_at DESC);
CREATE INDEX idx_agent_method_comparisons_agree ON public.agent_method_comparisons(methods_agree) WHERE methods_agree IS NOT NULL;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_farm_agent_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_farm_agent_config_updated_at
  BEFORE UPDATE ON public.farm_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_agent_config_updated_at();

-- Fonction helper pour calculer le success rate
CREATE OR REPLACE FUNCTION get_agent_method_success_rate(
  p_farm_id INTEGER,
  p_method VARCHAR
)
RETURNS NUMERIC AS $$
DECLARE
  v_success_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT 
    CASE 
      WHEN p_method = 'simple' THEN simple_success_count
      WHEN p_method = 'pipeline' THEN pipeline_success_count
      ELSE 0
    END,
    CASE 
      WHEN p_method = 'simple' THEN simple_total_count
      WHEN p_method = 'pipeline' THEN pipeline_total_count
      ELSE 0
    END
  INTO v_success_count, v_total_count
  FROM public.farm_agent_config
  WHERE farm_id = p_farm_id;
  
  IF v_total_count = 0 THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((v_success_count::NUMERIC / v_total_count) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Initialiser toutes les fermes existantes avec la méthode 'simple' par défaut
INSERT INTO public.farm_agent_config (farm_id, agent_method, config_reason)
SELECT 
  id, 
  'simple',
  'Configuration par défaut - migration initiale'
FROM public.farms
WHERE id NOT IN (SELECT farm_id FROM public.farm_agent_config)
ON CONFLICT (farm_id) DO NOTHING;

-- Commentaires pour documentation
COMMENT ON TABLE public.farm_agent_config IS 'Configuration de la méthode d''analyse agent par ferme (simple vs pipeline)';
COMMENT ON TABLE public.agent_method_comparisons IS 'Comparaisons côte à côte des résultats des deux méthodes d''analyse';
COMMENT ON COLUMN public.farm_agent_config.agent_method IS 'Méthode utilisée: simple (prompt monolithique) ou pipeline (tool calling)';
COMMENT ON COLUMN public.farm_agent_config.simple_success_count IS 'Nombre de succès avec la méthode simple';
COMMENT ON COLUMN public.farm_agent_config.pipeline_success_count IS 'Nombre de succès avec la méthode pipeline';
COMMENT ON FUNCTION get_agent_method_success_rate IS 'Calcule le taux de succès en pourcentage pour une méthode donnée';
