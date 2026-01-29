-- Migration pour le système de chat IA agricole
-- 005_ai_chat_system.sql

-- Table pour stocker les prompts système versionnés
CREATE TABLE public.ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL, -- 'analyze_message', 'decompose_actions', etc.
    version VARCHAR NOT NULL DEFAULT 'v1.0',
    role VARCHAR NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '{}'::jsonb, -- Variables à remplacer dans le prompt
    examples JSONB DEFAULT '[]'::jsonb, -- Exemples few-shot
    metrics JSONB DEFAULT '{
        "usage_count": 0,
        "success_rate": 0,
        "avg_confidence": 0
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(name, version)
);

-- Table pour les analyses de messages par l'IA
CREATE TABLE public.message_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    prompt_version VARCHAR NOT NULL,
    raw_response TEXT NOT NULL, -- Réponse brute de l'IA
    parsed_actions JSONB DEFAULT '[]'::jsonb, -- Actions structurées extraites
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    processing_time_ms INTEGER,
    model_used VARCHAR DEFAULT 'gpt-4o-mini',
    tokens_used INTEGER,
    status VARCHAR DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les actions décomposées et contextualisées
CREATE TABLE public.analyzed_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES public.message_analyses(id) ON DELETE CASCADE,
    farm_id INTEGER NOT NULL REFERENCES public.farms(id),
    user_id UUID NOT NULL,
    
    -- Classification de l'action
    action_type VARCHAR NOT NULL CHECK (action_type IN (
        'help', 'task_done', 'task_planned', 'observation', 'config'
    )),
    
    -- Contenu de l'action
    original_text TEXT NOT NULL, -- Texte original de l'utilisateur
    decomposed_text TEXT NOT NULL, -- Phrase simple générée par l'IA
    
    -- Contexte extrait/associé
    context JSONB DEFAULT '{}'::jsonb, -- {plot_ids: [], surface_unit_ids: [], material_ids: [], etc.}
    
    -- Données spécifiques par type
    extracted_data JSONB DEFAULT '{}'::jsonb, -- Quantités, cultures, dates, etc.
    
    -- État de validation
    confidence_score DECIMAL(3,2),
    user_status VARCHAR DEFAULT 'pending' CHECK (user_status IN ('pending', 'validated', 'rejected', 'modified')),
    user_modifications JSONB DEFAULT '{}'::jsonb,
    
    -- Liens vers les entités créées
    created_task_id UUID REFERENCES public.tasks(id),
    created_observation_id UUID REFERENCES public.observations(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table pour les conversions personnalisées des utilisateurs
CREATE TABLE public.user_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES public.farms(id),
    
    -- Définition de la conversion
    from_unit VARCHAR NOT NULL, -- 'caisse', 'seau', 'botte', etc.
    to_unit VARCHAR NOT NULL,   -- 'kg', 'litres', 'unités', etc.
    conversion_factor DECIMAL(10,3) NOT NULL,
    
    -- Contexte optionnel (pour des conversions spécifiques)
    crop_specific VARCHAR, -- 'tomates', 'carottes', null pour général
    context_notes TEXT,
    
    -- Synonymes pour reconnaissance IA
    aliases TEXT[] DEFAULT '{}', -- ['caisses', 'casier', 'bac']
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, farm_id, from_unit, to_unit, crop_specific)
);

-- Table pour la configuration IA des utilisateurs
CREATE TABLE public.user_ai_preferences (
    user_id UUID PRIMARY KEY,
    farm_id INTEGER REFERENCES public.farms(id),
    
    -- Préférences d'analyse
    auto_validate_threshold DECIMAL(3,2) DEFAULT 0.85, -- Auto-valider si confiance > 85%
    preferred_units JSONB DEFAULT '{
        "weight": "kg",
        "volume": "litres",
        "area": "m2",
        "length": "m"
    }'::jsonb,
    
    -- Contextes par défaut
    default_plot_ids INTEGER[] DEFAULT '{}',
    default_material_ids INTEGER[] DEFAULT '{}',
    
    -- Personnalisation des prompts
    custom_crops TEXT[] DEFAULT '{}', -- Cultures spécifiques de l'utilisateur
    farm_terminology JSONB DEFAULT '{}'::jsonb, -- Termes spécifiques à l'exploitation
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Amélioration de la table chat_messages existante
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES public.message_analyses(id);

-- Index pour les performances
CREATE INDEX idx_message_analyses_message_id ON public.message_analyses(message_id);
CREATE INDEX idx_analyzed_actions_analysis_id ON public.analyzed_actions(analysis_id);
CREATE INDEX idx_analyzed_actions_farm_user ON public.analyzed_actions(farm_id, user_id);
CREATE INDEX idx_analyzed_actions_type_status ON public.analyzed_actions(action_type, user_status);
CREATE INDEX idx_user_conversions_farm_user ON public.user_conversions(farm_id, user_id);
CREATE INDEX idx_ai_prompts_name_active ON public.ai_prompts(name, is_active);

-- Fonctions utilitaires

-- Fonction pour obtenir le prompt actif
CREATE OR REPLACE FUNCTION get_active_prompt(prompt_name VARCHAR)
RETURNS TABLE(id UUID, content TEXT, variables JSONB, examples JSONB) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.content, p.variables, p.examples
    FROM public.ai_prompts p
    WHERE p.name = prompt_name 
    AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT 1;
END;
$$;

-- Fonction pour mettre à jour les métriques des prompts
CREATE OR REPLACE FUNCTION update_prompt_metrics(
    prompt_name VARCHAR,
    success BOOLEAN,
    confidence_score DECIMAL DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    current_metrics JSONB;
    new_usage_count INTEGER;
    new_success_rate DECIMAL;
BEGIN
    SELECT metrics INTO current_metrics 
    FROM public.ai_prompts 
    WHERE name = prompt_name AND is_active = true
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF current_metrics IS NULL THEN
        RETURN;
    END IF;
    
    new_usage_count := (current_metrics->>'usage_count')::INTEGER + 1;
    
    IF success THEN
        new_success_rate := ((current_metrics->>'success_rate')::DECIMAL * (new_usage_count - 1) + 1) / new_usage_count;
    ELSE
        new_success_rate := ((current_metrics->>'success_rate')::DECIMAL * (new_usage_count - 1)) / new_usage_count;
    END IF;
    
    UPDATE public.ai_prompts 
    SET 
        metrics = jsonb_set(
            jsonb_set(current_metrics, '{usage_count}', to_jsonb(new_usage_count)),
            '{success_rate}', to_jsonb(new_success_rate)
        ),
        updated_at = now()
    WHERE name = prompt_name AND is_active = true;
END;
$$;

-- RLS (Row Level Security)
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzed_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "AI prompts are viewable by authenticated users" ON public.ai_prompts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Message analyses are viewable by message owner" ON public.message_analyses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_messages cm 
            JOIN public.chat_sessions cs ON cm.session_id = cs.id
            WHERE cm.id = message_analyses.message_id 
            AND cs.user_id = auth.uid()
        )
    );

CREATE POLICY "Analyzed actions are manageable by farm members" ON public.analyzed_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.farm_members fm
            WHERE fm.farm_id = analyzed_actions.farm_id 
            AND fm.user_id = auth.uid()
            AND fm.is_active = true
        )
    );

CREATE POLICY "User conversions are manageable by owner" ON public.user_conversions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "User AI preferences are manageable by owner" ON public.user_ai_preferences
    FOR ALL USING (user_id = auth.uid());

-- Insertion des prompts système par défaut
INSERT INTO public.ai_prompts (name, role, content, variables, examples) VALUES
(
    'analyze_message',
    'system',
    'Tu es un assistant agricole expert qui analyse les messages des utilisateurs pour identifier les actions à effectuer.

Analyse ce message et identifie:
1. Le type d''actions (help, task_done, task_planned, observation, config)
2. Les éléments contextuels (cultures, parcelles, quantités, matériel)
3. La complexité (simple ou multiple actions)

Variables disponibles: {user_context}

Réponds UNIQUEMENT en JSON valide avec cette structure:
{
  "type": "simple|multiple",
  "actions": [
    {
      "action_type": "help|task_done|task_planned|observation|config",
      "original_text": "extrait du message original",
      "confidence": 0.95,
      "extracted_data": {
        "crop": "tomates",
        "quantity": {"value": 4, "unit": "kg"},
        "plots": ["parcelle nord"],
        "issue": "pucerons"
      }
    }
  ]
}',
    '{"user_context": "Contexte utilisateur avec parcelles, matériel, conversions"}',
    '[
        {
            "input": "j''ai observé des pucerons sur mes tomates",
            "output": {
                "type": "simple",
                "actions": [{
                    "action_type": "observation",
                    "original_text": "j''ai observé des pucerons sur mes tomates",
                    "confidence": 0.95,
                    "extracted_data": {
                        "crop": "tomates",
                        "issue": "pucerons",
                        "observation_type": "maladie_ravageur"
                    }
                }]
            }
        },
        {
            "input": "j''ai observé des pucerons sur mes tomates et mes laitues et j''ai récolté 4 kg de betterave",
            "output": {
                "type": "multiple", 
                "actions": [
                    {
                        "action_type": "observation",
                        "original_text": "observé des pucerons sur mes tomates",
                        "confidence": 0.90,
                        "extracted_data": {
                            "crop": "tomates",
                            "issue": "pucerons"
                        }
                    },
                    {
                        "action_type": "observation", 
                        "original_text": "observé des pucerons sur mes laitues",
                        "confidence": 0.90,
                        "extracted_data": {
                            "crop": "laitues", 
                            "issue": "pucerons"
                        }
                    },
                    {
                        "action_type": "task_done",
                        "original_text": "récolté 4 kg de betterave",
                        "confidence": 0.95,
                        "extracted_data": {
                            "crop": "betterave",
                            "action": "récolte",
                            "quantity": {"value": 4, "unit": "kg"}
                        }
                    }
                ]
            }
        }
    ]'
),
(
    'decompose_actions',
    'system', 
    'Réécris ces actions agricoles en phrases simples et claires.
Une phrase = une action.
Utilise la forme: "J''ai [verbe] [quoi] [où/comment]"

Variables: {actions_data}

Réponds en JSON:
{
  "decomposed_actions": [
    "J''ai observé des pucerons sur les tomates",
    "J''ai observé des pucerons sur les laitues", 
    "J''ai récolté 4 kg de betteraves"
  ]
}',
    '{"actions_data": "Actions extraites de l''analyse"}',
    '[
        {
            "input": {"actions": ["observé pucerons tomates", "récolté betteraves 4kg"]},
            "output": {
                "decomposed_actions": [
                    "J''ai observé des pucerons sur les tomates",
                    "J''ai récolté 4 kg de betteraves"
                ]
            }
        }
    ]'
);

-- Insertion des conversions par défaut courantes
INSERT INTO public.user_conversions (user_id, farm_id, from_unit, to_unit, conversion_factor, aliases) VALUES
-- Conversions universelles (seront dupliquées par utilisateur lors de l'onboarding)
('00000000-0000-0000-0000-000000000000', 1, 'caisse', 'kg', 5.0, ARRAY['caisses', 'casier', 'bac']),
('00000000-0000-0000-0000-000000000000', 1, 'seau', 'litres', 10.0, ARRAY['seaux', 'sceau']),
('00000000-0000-0000-0000-000000000000', 1, 'botte', 'unités', 10.0, ARRAY['bottes']);

COMMENT ON TABLE public.ai_prompts IS 'Prompts système versionnés pour l''IA';
COMMENT ON TABLE public.message_analyses IS 'Analyses des messages utilisateur par l''IA';  
COMMENT ON TABLE public.analyzed_actions IS 'Actions décomposées et contextualisées';
COMMENT ON TABLE public.user_conversions IS 'Conversions personnalisées des utilisateurs';
COMMENT ON TABLE public.user_ai_preferences IS 'Préférences et configuration IA par utilisateur';




