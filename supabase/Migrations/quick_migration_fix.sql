-- ============================================
-- THOMAS V2 - MIGRATION RAPIDE CORRIGÉE
-- Fix erreur chr() + version simplifiée
-- ============================================

-- Extension PostgreSQL pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$
BEGIN
    RAISE NOTICE '🚀 DÉMARRAGE MIGRATION THOMAS V2 CORRIGÉE...';
END $$;

-- ============================================
-- 1. EXTENSIONS TABLES EXISTANTES
-- ============================================

-- Extension table plots pour optimisation LLM
ALTER TABLE plots ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS position JSONB DEFAULT '{}';

-- Extension table materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';

-- Extension table tasks pour IA
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS action CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plants TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS surface_unit_ids INTEGER[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS chat_session_id UUID;

-- ============================================
-- 2. TABLE UNITÉS DE SURFACE (CRITIQUE LLM)
-- ============================================

CREATE TABLE IF NOT EXISTS surface_units (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    
    -- Identification optimisée LLM
    name CHARACTER VARYING NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
    code CHARACTER VARYING,
    aliases TEXT[] DEFAULT '{}',
    
    -- Type et séquence
    type CHARACTER VARYING NOT NULL DEFAULT 'planche' 
        CHECK (type IN ('planche', 'rang', 'ligne', 'carre', 'zone', 'plate_bande')),
    sequence_number INTEGER,
    
    -- Dimensions
    length NUMERIC CHECK (length > 0),
    width NUMERIC CHECK (width > 0),
    area NUMERIC,
    
    -- État cultural
    status CHARACTER VARYING DEFAULT 'active',
    current_crop CHARACTER VARYING,
    
    -- Optimisation LLM
    llm_keywords TEXT[] DEFAULT '{}',
    description TEXT,
    
    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(plot_id, code)
);

-- ============================================
-- 3. SYSTÈME CHAT THOMAS
-- ============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Configuration chat
    chat_type CHARACTER VARYING DEFAULT 'general' 
        CHECK (chat_type IN ('general', 'task_focus', 'observation_focus', 'planning_focus')),
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    
    -- Métadonnées
    status CHARACTER VARYING DEFAULT 'active',
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message
    role CHARACTER VARYING NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL CHECK (char_length(content) >= 1),
    message_type CHARACTER VARYING DEFAULT 'text',
    
    -- IA processing
    ai_processed BOOLEAN DEFAULT false,
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SYSTÈME OBSERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Identification
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 200),
    
    -- Classification française
    category CHARACTER VARYING NOT NULL DEFAULT 'autre' 
        CHECK (category IN ('ravageurs', 'maladies', 'carences', 'croissance', 'autre')),
    nature TEXT NOT NULL CHECK (char_length(nature) >= 3),
    
    -- Localisation
    crop CHARACTER VARYING,
    plot_ids INTEGER[] DEFAULT '{}',
    surface_unit_ids INTEGER[] DEFAULT '{}',
    
    -- Statut
    status CHARACTER VARYING DEFAULT 'active',
    severity_level CHARACTER VARYING DEFAULT 'moyen',
    
    -- Relations
    chat_session_id UUID REFERENCES chat_sessions(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CONVERSIONS UTILISATEUR
-- ============================================

CREATE TABLE IF NOT EXISTS user_conversion_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    
    -- Conversion personnalisée
    container_name CHARACTER VARYING NOT NULL,
    crop_name CHARACTER VARYING NOT NULL,
    conversion_value NUMERIC NOT NULL CHECK (conversion_value > 0),
    conversion_unit CHARACTER VARYING NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, farm_id, container_name, crop_name)
);

-- ============================================
-- 6. INDEX PERFORMANCE
-- ============================================

-- Index pour recherche LLM
CREATE INDEX IF NOT EXISTS idx_surface_units_plot ON surface_units(plot_id);
CREATE INDEX IF NOT EXISTS idx_tasks_surface_units ON tasks USING gin(surface_unit_ids);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_farm ON chat_sessions(farm_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_farm ON observations(farm_id, created_at DESC);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Fonction générique updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers pour nouvelles tables
CREATE TRIGGER update_surface_units_updated_at 
    BEFORE UPDATE ON surface_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. RLS SÉCURITÉ
-- ============================================

-- Activer RLS
ALTER TABLE surface_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversion_units ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION user_has_farm_access(farm_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM farms f
        WHERE f.id = farm_id AND (
            f.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM farm_members fm 
                WHERE fm.farm_id = farm_id 
                AND fm.user_id = auth.uid() 
                AND fm.is_active = true
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies essentielles
CREATE POLICY "Users can access surface units of their farms" ON surface_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM plots p 
            WHERE p.id = surface_units.plot_id 
            AND user_has_farm_access(p.farm_id)
        )
    );

CREATE POLICY "Users can access their farm chat sessions" ON chat_sessions
    FOR ALL USING (user_id = auth.uid() AND user_has_farm_access(farm_id));

CREATE POLICY "Users can access their farm observations" ON observations
    FOR ALL USING (user_id = auth.uid() AND user_has_farm_access(farm_id));

CREATE POLICY "Users can access their conversion units" ON user_conversion_units
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 9. DONNÉES TEST MINIMALES
-- ============================================

-- Unités de surface test (VERSION CORRIGÉE avec chr())
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, llm_keywords)
SELECT 
    p.id,
    'Planche ' || gs.i,
    'P' || gs.i,
    'planche',
    gs.i,
    ARRAY['planche', 'p' || gs.i::text]
FROM plots p
CROSS JOIN generate_series(1, 3) AS gs(i)
WHERE p.is_active = true
ON CONFLICT (plot_id, code) DO NOTHING;

-- Rangs test (CORRIGÉ avec chr())
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, llm_keywords)
SELECT 
    p.id,
    'Rang ' || chr(64 + gs.i), -- A, B, C - CORRIGÉ !
    'R' || chr(64 + gs.i),
    'rang',
    gs.i,
    ARRAY['rang', 'r' || chr(64 + gs.i)]
FROM plots p
CROSS JOIN generate_series(1, 3) AS gs(i)
WHERE p.type = 'plein_champ' AND p.is_active = true
ON CONFLICT (plot_id, code) DO NOTHING;

-- Conversions test
INSERT INTO user_conversion_units (user_id, farm_id, container_name, crop_name, conversion_value, conversion_unit)
SELECT 
    fm.user_id,
    f.id,
    'caisse',
    'tomate',
    8.0,
    'kg'
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
WHERE fm.is_active = true
ON CONFLICT DO NOTHING;

-- Session chat test
INSERT INTO chat_sessions (farm_id, user_id, title)
SELECT 
    f.id,
    fm.user_id,
    'Chat Thomas - ' || f.name
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
WHERE fm.is_active = true
LIMIT 3;

-- ============================================
-- FINALISATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ MIGRATION THOMAS V2 RÉUSSIE !';
    RAISE NOTICE '📊 Nouvelles tables: surface_units, chat_sessions, chat_messages, observations, user_conversion_units';
    RAISE NOTICE '🔧 Extensions: plots, materials, tasks avec colonnes IA';  
    RAISE NOTICE '🤖 Données test chargées avec chr() corrigé';
    RAISE NOTICE '🔒 Sécurité RLS activée';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Thomas V2 est opérationnel pour le développement !';
END $$;
