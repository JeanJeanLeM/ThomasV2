-- Migration 042: Chat Prompts Versioning Enhancement
-- Ajoute un système de versioning simple pour les prompts

-- Ajouter les colonnes de versioning à chat_prompts
ALTER TABLE public.chat_prompts 
  ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.chat_prompts(id),
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) CHECK (success_rate >= 0 AND success_rate <= 100),
  ADD COLUMN IF NOT EXISTS avg_confidence NUMERIC(5,2) CHECK (avg_confidence >= 0 AND avg_confidence <= 1);

-- Index pour performance sur les prompts actifs
CREATE INDEX IF NOT EXISTS idx_chat_prompts_active_version 
  ON public.chat_prompts(name, version) 
  WHERE is_active = TRUE;

-- Index pour les prompts par défaut
CREATE INDEX IF NOT EXISTS idx_chat_prompts_default
  ON public.chat_prompts(name, is_default)
  WHERE is_default = TRUE;

-- Index pour l'historique de versions
CREATE INDEX IF NOT EXISTS idx_chat_prompts_parent
  ON public.chat_prompts(parent_version_id)
  WHERE parent_version_id IS NOT NULL;

-- Fonction pour obtenir le prompt actif par défaut
CREATE OR REPLACE FUNCTION get_active_prompt(p_prompt_name VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  content TEXT,
  examples JSONB,
  version VARCHAR,
  metadata JSONB
) AS $$
BEGIN
  -- Chercher d'abord le prompt par défaut actif
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.content,
    p.examples,
    p.version,
    p.metadata
  FROM public.chat_prompts p
  WHERE p.name = p_prompt_name
    AND p.is_active = TRUE
    AND p.is_default = TRUE
  LIMIT 1;
  
  -- Si pas trouvé, chercher n'importe quel prompt actif avec version la plus récente
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.name,
      p.content,
      p.examples,
      p.version,
      p.metadata
    FROM public.chat_prompts p
    WHERE p.name = p_prompt_name
      AND p.is_active = TRUE
    ORDER BY p.created_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour incrémenter le compteur d'usage
CREATE OR REPLACE FUNCTION increment_prompt_usage(p_prompt_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.chat_prompts
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = p_prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les métriques du prompt
CREATE OR REPLACE FUNCTION update_prompt_metrics(
  p_prompt_id UUID,
  p_success BOOLEAN,
  p_confidence NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_current_success_rate NUMERIC;
  v_current_avg_confidence NUMERIC;
  v_usage_count INTEGER;
BEGIN
  -- Récupérer les valeurs actuelles
  SELECT usage_count, success_rate, avg_confidence
  INTO v_usage_count, v_current_success_rate, v_current_avg_confidence
  FROM public.chat_prompts
  WHERE id = p_prompt_id;
  
  -- Calculer le nouveau success_rate (moyenne mobile)
  IF v_current_success_rate IS NULL THEN
    v_current_success_rate := CASE WHEN p_success THEN 100 ELSE 0 END;
  ELSE
    v_current_success_rate := (
      (v_current_success_rate * v_usage_count + CASE WHEN p_success THEN 100 ELSE 0 END) 
      / (v_usage_count + 1)
    );
  END IF;
  
  -- Calculer le nouveau avg_confidence (moyenne mobile)
  IF v_current_avg_confidence IS NULL THEN
    v_current_avg_confidence := p_confidence;
  ELSE
    v_current_avg_confidence := (
      (v_current_avg_confidence * v_usage_count + COALESCE(p_confidence, 0))
      / (v_usage_count + 1)
    );
  END IF;
  
  -- Mettre à jour
  UPDATE public.chat_prompts
  SET 
    usage_count = usage_count + 1,
    success_rate = ROUND(v_current_success_rate, 2),
    avg_confidence = ROUND(v_current_avg_confidence, 2),
    updated_at = NOW()
  WHERE id = p_prompt_id;
END;
$$ LANGUAGE plpgsql;

-- Marquer les prompts version 3.0 existants comme par défaut
UPDATE public.chat_prompts
SET is_default = TRUE
WHERE version = '3.0' 
  AND is_active = TRUE
  AND name IN ('intent_classification', 'tool_selection', 'thomas_agent_system');

-- Si pas de version 3.0, marquer la version la plus récente comme défaut
DO $$
DECLARE
  v_prompt_name VARCHAR;
BEGIN
  FOR v_prompt_name IN 
    SELECT DISTINCT name 
    FROM public.chat_prompts 
    WHERE name IN ('intent_classification', 'tool_selection', 'thomas_agent_system', 'response_synthesis')
  LOOP
    -- Vérifier si ce prompt a déjà un défaut
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_prompts 
      WHERE name = v_prompt_name AND is_default = TRUE
    ) THEN
      -- Marquer la version la plus récente comme défaut
      UPDATE public.chat_prompts
      SET is_default = TRUE
      WHERE id = (
        SELECT id 
        FROM public.chat_prompts 
        WHERE name = v_prompt_name AND is_active = TRUE
        ORDER BY created_at DESC 
        LIMIT 1
      );
    END IF;
  END LOOP;
END;
$$;

-- View pour voir l'historique des versions
CREATE OR REPLACE VIEW prompt_version_history AS
SELECT 
  p.id,
  p.name,
  p.version,
  p.is_active,
  p.is_default,
  p.usage_count,
  p.success_rate,
  p.avg_confidence,
  p.created_at,
  p.updated_at,
  parent.version AS parent_version,
  (
    SELECT COUNT(*) 
    FROM public.chat_prompts child 
    WHERE child.parent_version_id = p.id
  ) AS child_versions_count
FROM public.chat_prompts p
LEFT JOIN public.chat_prompts parent ON p.parent_version_id = parent.id
ORDER BY p.name, p.created_at DESC;

-- Commentaires
COMMENT ON COLUMN public.chat_prompts.parent_version_id IS 'Référence à la version parente si ce prompt est une évolution';
COMMENT ON COLUMN public.chat_prompts.is_default IS 'Indique si c''est la version par défaut à utiliser pour ce nom de prompt';
COMMENT ON COLUMN public.chat_prompts.usage_count IS 'Nombre de fois que ce prompt a été utilisé';
COMMENT ON COLUMN public.chat_prompts.success_rate IS 'Taux de succès en pourcentage (0-100)';
COMMENT ON COLUMN public.chat_prompts.avg_confidence IS 'Score de confiance moyen (0-1)';
COMMENT ON FUNCTION get_active_prompt IS 'Récupère le prompt actif par défaut pour un nom donné';
COMMENT ON FUNCTION increment_prompt_usage IS 'Incrémente le compteur d''usage d''un prompt';
COMMENT ON FUNCTION update_prompt_metrics IS 'Met à jour les métriques (success_rate, avg_confidence) d''un prompt';
COMMENT ON VIEW prompt_version_history IS 'Vue de l''historique des versions des prompts';
