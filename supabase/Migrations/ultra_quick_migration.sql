-- THOMAS V2 - VERSION ULTRA-RAPIDE SANS ERREUR
-- Copier/coller dans Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensions tables existantes
ALTER TABLE plots ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS action CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plants TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS surface_unit_ids INTEGER[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1);

-- Table unités de surface (CRITIQUE)
CREATE TABLE IF NOT EXISTS surface_units (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    name CHARACTER VARYING NOT NULL,
    code CHARACTER VARYING,
    type CHARACTER VARYING DEFAULT 'planche',
    sequence_number INTEGER,
    length NUMERIC,
    width NUMERIC,
    area NUMERIC, -- Calculée par trigger
    llm_keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plot_id, code)
);

-- Table chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    chat_type CHARACTER VARYING DEFAULT 'general',
    title CHARACTER VARYING NOT NULL,
    status CHARACTER VARYING DEFAULT 'active',
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role CHARACTER VARYING NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    ai_confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table observations
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title CHARACTER VARYING NOT NULL,
    category CHARACTER VARYING DEFAULT 'autre',
    nature TEXT NOT NULL,
    crop CHARACTER VARYING,
    plot_ids INTEGER[] DEFAULT '{}',
    surface_unit_ids INTEGER[] DEFAULT '{}',
    status CHARACTER VARYING DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table conversions utilisateur
CREATE TABLE IF NOT EXISTS user_conversion_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id),
    container_name CHARACTER VARYING NOT NULL,
    crop_name CHARACTER VARYING NOT NULL,
    conversion_value NUMERIC NOT NULL,
    conversion_unit CHARACTER VARYING NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, farm_id, container_name, crop_name)
);

-- Trigger calcul surface automatique
CREATE OR REPLACE FUNCTION calculate_area()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.length IS NOT NULL AND NEW.width IS NOT NULL THEN
        NEW.area = NEW.length * NEW.width;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER surface_units_area 
    BEFORE INSERT OR UPDATE ON surface_units 
    FOR EACH ROW EXECUTE FUNCTION calculate_area();

-- Index performance
CREATE INDEX IF NOT EXISTS idx_surface_units_plot ON surface_units(plot_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_farm ON chat_sessions(farm_id);
CREATE INDEX IF NOT EXISTS idx_observations_farm ON observations(farm_id);

-- RLS Sécurité
ALTER TABLE surface_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
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
            EXISTS (SELECT 1 FROM farm_members fm WHERE fm.farm_id = farm_id AND fm.user_id = auth.uid() AND fm.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies essentielles
CREATE POLICY "farm_access_surface_units" ON surface_units FOR ALL USING (
    EXISTS (SELECT 1 FROM plots p WHERE p.id = surface_units.plot_id AND user_has_farm_access(p.farm_id))
);

CREATE POLICY "farm_access_chat_sessions" ON chat_sessions FOR ALL USING (
    user_id = auth.uid() AND user_has_farm_access(farm_id)
);

CREATE POLICY "farm_access_observations" ON observations FOR ALL USING (
    user_id = auth.uid() AND user_has_farm_access(farm_id)
);

CREATE POLICY "user_access_conversions" ON user_conversion_units FOR ALL USING (
    user_id = auth.uid()
);

-- Données test minimales
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, length, width, llm_keywords)
SELECT 
    p.id,
    'Planche ' || gs.i,
    'P' || gs.i,
    'planche',
    gs.i,
    20.0,
    1.2,
    ARRAY['planche', 'p' || gs.i::text]
FROM plots p
CROSS JOIN generate_series(1, 3) AS gs(i)
WHERE p.is_active = true
ON CONFLICT (plot_id, code) DO NOTHING;

-- Sessions chat test
INSERT INTO chat_sessions (farm_id, user_id, title)
SELECT f.id, fm.user_id, 'Chat Thomas - ' || f.name
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
WHERE fm.is_active = true
LIMIT 5;

-- Conversions test
INSERT INTO user_conversion_units (user_id, farm_id, container_name, crop_name, conversion_value, conversion_unit)
SELECT fm.user_id, f.id, 'caisse', 'tomate', 8.0, 'kg'
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
WHERE fm.is_active = true
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ THOMAS V2 MIGRATION RÉUSSIE !';
    RAISE NOTICE '📊 Tables créées: surface_units, chat_sessions, chat_messages, observations, user_conversion_units';
    RAISE NOTICE '🚀 Prêt pour le développement !';
END $$;
