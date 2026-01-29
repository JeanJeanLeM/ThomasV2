-- ============================================
-- THOMAS V2 - MIGRATION COMPLÈTE ENVIRONNEMENT DEV
-- Version: 2.0.0 - ENV: DEVELOPMENT
-- Date: $(date)
-- ============================================

-- Extension PostgreSQL pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour recherche floue

-- ============================================
-- 1. EXTENSIONS TABLES EXISTANTES
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Extension des tables existantes...';
END $$;

-- Extension table plots pour optimisation LLM
ALTER TABLE plots ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';
ALTER TABLE plots ALTER COLUMN description TYPE TEXT;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS position JSONB DEFAULT '{}';
ALTER TABLE plots ADD COLUMN IF NOT EXISTS category CHARACTER VARYING DEFAULT 'production' 
    CHECK (category IN ('production', 'stockage', 'preparation'));

-- Extension table materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS llm_keywords TEXT[] DEFAULT '{}';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS usage_tracking TEXT;

-- Extension table tasks pour IA et quantités
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS action CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plants TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS surface_unit_ids INTEGER[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_quantity_value NUMERIC CHECK (user_quantity_value >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_quantity_unit CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS universal_quantity_value NUMERIC CHECK (universal_quantity_value >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS universal_quantity_unit CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC CHECK (conversion_rate > 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS conversion_source CHARACTER VARYING;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_source CHARACTER VARYING DEFAULT 'manual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS validation_status CHARACTER VARYING DEFAULT 'validee';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS chat_session_id UUID;

-- Mise à jour statuts tâches vers français
UPDATE tasks SET status = 
    CASE status
        WHEN 'en_attente' THEN 'en_attente'
        WHEN 'en_cours' THEN 'en_cours'  
        WHEN 'terminee' THEN 'terminee'
        ELSE 'terminee'
    END;

-- ============================================
-- 2. TABLE UNITÉS DE SURFACE (CRITIQUE LLM)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🚜 Création table surface_units pour parcelles...';
END $$;

CREATE TABLE IF NOT EXISTS surface_units (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    
    -- Identification flexible optimisée LLM
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
    position JSONB DEFAULT '{}',
    
    -- État cultural
    status CHARACTER VARYING DEFAULT 'active' 
        CHECK (status IN ('active', 'repos', 'preparation')),
    current_crop CHARACTER VARYING,
    planting_date DATE,
    
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
-- 3. SYSTÈME CHAT THOMAS (CŒUR PRODUIT)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '💬 Création système chat Thomas...';
END $$;

-- Sessions de chat unifiées
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Configuration chat
    chat_type CHARACTER VARYING DEFAULT 'general' 
        CHECK (chat_type IN ('general', 'task_focus', 'observation_focus', 'planning_focus', 'config_focus')),
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
    
    -- Métadonnées
    status CHARACTER VARYING DEFAULT 'active' 
        CHECK (status IN ('active', 'archived', 'deleted')),
    is_pinned BOOLEAN DEFAULT false,
    
    -- Statistiques
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    
    -- Focus metadata pour chats spécialisés
    focus_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Message
    role CHARACTER VARYING NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL CHECK (char_length(content) >= 1),
    message_type CHARACTER VARYING DEFAULT 'text' 
        CHECK (message_type IN ('text', 'audio', 'action_card', 'attachment')),
    
    -- Attachments et métadonnées
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- IA processing
    ai_processed BOOLEAN DEFAULT false,
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    tools_used TEXT[] DEFAULT '{}',
    processing_time_ms INTEGER,
    model_used CHARACTER VARYING DEFAULT 'gpt-4o-mini',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions générées par IA
CREATE TABLE IF NOT EXISTS generated_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    chat_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    
    -- Type d'action
    action_type CHARACTER VARYING NOT NULL 
        CHECK (action_type IN ('task_created', 'observation_created', 'plot_created', 
                              'material_added', 'planning_created', 'config_updated')),
    
    -- Données IA
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB NOT NULL DEFAULT '{}',
    entity_id TEXT,
    entity_table CHARACTER VARYING,
    
    -- Validation
    status CHARACTER VARYING DEFAULT 'pending' 
        CHECK (status IN ('pending', 'validated', 'rejected', 'modified')),
    validation_notes TEXT,
    
    -- Métriques IA
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    processing_time_ms INTEGER,
    prompt_used TEXT,
    model_used CHARACTER VARYING DEFAULT 'gpt-4o-mini',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SYSTÈME OBSERVATIONS CULTURES
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '👁️ Création système observations cultures...';
END $$;

CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Identification
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 200),
    
    -- Classification française
    category CHARACTER VARYING NOT NULL DEFAULT 'autre' 
        CHECK (category IN ('ravageurs', 'maladies', 'carences', 'degats_climatiques', 
                           'problemes_sol', 'croissance', 'maturation', 'autre')),
    nature TEXT NOT NULL CHECK (char_length(nature) >= 3),
    
    -- Quantification
    quantity_observed CHARACTER VARYING,
    quantity_unit CHARACTER VARYING,
    severity_level CHARACTER VARYING DEFAULT 'moyen' 
        CHECK (severity_level IN ('faible', 'moyen', 'eleve', 'critique')),
    
    -- Localisation
    crop CHARACTER VARYING,
    plot_ids INTEGER[] DEFAULT '{}',
    surface_unit_ids INTEGER[] DEFAULT '{}',
    location TEXT,
    raw_location_text TEXT, -- Texte original utilisateur
    
    -- Métadonnées
    comment TEXT,
    attachments JSONB DEFAULT '[]',
    weather_conditions JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    
    -- Statut et priorité
    status CHARACTER VARYING DEFAULT 'active' 
        CHECK (status IN ('active', 'resolved', 'ongoing', 'archived')),
    priority CHARACTER VARYING DEFAULT 'moyenne' 
        CHECK (priority IN ('basse', 'moyenne', 'haute', 'urgente')),
    
    -- IA analysis
    ai_confidence NUMERIC CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    detection_confidence NUMERIC CHECK (detection_confidence >= 0 AND detection_confidence <= 1),
    extraction_confidence NUMERIC CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
    
    -- Relations
    related_task_id UUID,
    chat_session_id UUID REFERENCES chat_sessions(id),
    chat_message_id UUID REFERENCES chat_messages(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SYSTÈME PLANNING AVANCÉ
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📅 Création système planning avancé...';
END $$;

-- Tâches planifiées (futures)
CREATE TABLE IF NOT EXISTS planned_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Détails tâche
    title CHARACTER VARYING NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 200),
    description TEXT,
    action CHARACTER VARYING,
    category CHARACTER VARYING CHECK (category IN ('production', 'marketing', 'administratif', 'general')),
    
    -- Planning
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
    
    -- Récurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type CHARACTER VARYING CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
    recurrence_details JSONB DEFAULT '{}',
    recurrence_end_date DATE,
    
    -- Agricultural data
    plants TEXT[] DEFAULT '{}',
    plot_ids INTEGER[] DEFAULT '{}',
    surface_unit_ids INTEGER[] DEFAULT '{}',
    material_ids INTEGER[] DEFAULT '{}',
    
    -- Resources
    number_of_people INTEGER DEFAULT 1 CHECK (number_of_people > 0),
    estimated_cost NUMERIC CHECK (estimated_cost >= 0),
    
    -- Status
    status CHARACTER VARYING DEFAULT 'planned' 
        CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    priority CHARACTER VARYING DEFAULT 'moyenne' 
        CHECK (priority IN ('basse', 'moyenne', 'haute', 'urgente')),
    
    -- Assigned
    assigned_to UUID,
    
    -- IA
    ai_generated BOOLEAN DEFAULT false,
    chat_session_id UUID REFERENCES chat_sessions(id),
    
    -- Tracking
    actual_task_id UUID, -- Reference to completed task
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SYSTÈME CONVERSIONS UTILISATEUR
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '⚖️ Création système conversions utilisateur...';
END $$;

CREATE TABLE IF NOT EXISTS user_conversion_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    
    -- Conversion personnalisée
    container_name CHARACTER VARYING NOT NULL CHECK (char_length(container_name) >= 1),
    crop_name CHARACTER VARYING NOT NULL CHECK (char_length(crop_name) >= 1),
    
    -- Valeurs conversion
    conversion_value NUMERIC NOT NULL CHECK (conversion_value > 0),
    conversion_unit CHARACTER VARYING NOT NULL 
        CHECK (conversion_unit IN ('kg', 'g', 'unites', 'bottes', 'bunches', 'pieces', 
                                  'caisses', 'crates', 'paniers', 'sacs', 'litres', 'ml')),
    
    -- Métadonnées
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte unicité par utilisateur/ferme/combo
    UNIQUE(user_id, farm_id, container_name, crop_name)
);

-- ============================================
-- 7. SYSTÈME OFFLINE ET SYNC
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📱 Création système offline/sync...';
END $$;

-- Queue de synchronisation offline
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    
    -- Type d'opération
    operation_type CHARACTER VARYING NOT NULL 
        CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name CHARACTER VARYING NOT NULL,
    entity_id TEXT NOT NULL,
    
    -- Données
    data JSONB NOT NULL DEFAULT '{}',
    original_data JSONB DEFAULT '{}', -- Pour rollback
    
    -- Status sync
    status CHARACTER VARYING DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Priorité (1 = max priority, 10 = min priority)
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    
    -- Constraint pour éviter doublons
    UNIQUE(table_name, entity_id, operation_type, created_at)
);

-- ============================================
-- 8. INDEX ET OPTIMISATIONS PERFORMANCE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '⚡ Création des index pour performances...';
END $$;

-- Index pour performance recherche LLM
CREATE INDEX IF NOT EXISTS idx_plots_llm_keywords ON plots USING gin(llm_keywords);
CREATE INDEX IF NOT EXISTS idx_plots_aliases ON plots USING gin(aliases);
CREATE INDEX IF NOT EXISTS idx_surface_units_llm_keywords ON surface_units USING gin(llm_keywords);
CREATE INDEX IF NOT EXISTS idx_surface_units_aliases ON surface_units USING gin(aliases);
CREATE INDEX IF NOT EXISTS idx_materials_llm_keywords ON materials USING gin(llm_keywords);

-- Index pour recherche textuelle
CREATE INDEX IF NOT EXISTS idx_plots_name_trgm ON plots USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_surface_units_name_trgm ON surface_units USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_name_trgm ON materials USING gin(name gin_trgm_ops);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_surface_units_plot ON surface_units(plot_id);
CREATE INDEX IF NOT EXISTS idx_surface_units_plot_type ON surface_units(plot_id, type);
CREATE INDEX IF NOT EXISTS idx_tasks_farm_date ON tasks(farm_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_surface_units ON tasks USING gin(surface_unit_ids);
CREATE INDEX IF NOT EXISTS idx_tasks_plants ON tasks USING gin(plants);
CREATE INDEX IF NOT EXISTS idx_observations_farm_date ON observations(farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_category ON observations(farm_id, category);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_farm_date ON planned_tasks(farm_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_status ON planned_tasks(farm_id, status, scheduled_date);

-- Index pour chat system
CREATE INDEX IF NOT EXISTS idx_chat_sessions_farm ON chat_sessions(farm_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_type ON chat_sessions(user_id, chat_type, status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_generated_actions_session ON generated_actions(chat_session_id, created_at);

-- Index pour sync offline
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync_queue(user_id, status);

-- Index pour conversions
CREATE INDEX IF NOT EXISTS idx_conversions_user_farm ON user_conversion_units(user_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_conversions_usage ON user_conversion_units(usage_count DESC, last_used_at DESC);

-- ============================================
-- 9. TRIGGERS ET FONCTIONS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔧 Création triggers et fonctions...';
END $$;

-- Fonction générique updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers updated_at pour nouvelles tables
CREATE TRIGGER update_surface_units_updated_at 
    BEFORE UPDATE ON surface_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observations_modified_at 
    BEFORE UPDATE ON observations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planned_tasks_updated_at 
    BEFORE UPDATE ON planned_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_conversion_units_updated_at 
    BEFORE UPDATE ON user_conversion_units 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction: Auto-génération aliases et keywords LLM
CREATE OR REPLACE FUNCTION generate_llm_aliases()
RETURNS TRIGGER AS $$
BEGIN
    -- Pour surface_units
    IF TG_TABLE_NAME = 'surface_units' THEN
        NEW.aliases = ARRAY[
            lower(NEW.name),
            lower(replace(NEW.name, ' ', '')),
            CASE WHEN NEW.code IS NOT NULL THEN lower(NEW.code) ELSE NULL END,
            CASE WHEN NEW.sequence_number IS NOT NULL THEN NEW.type || NEW.sequence_number::text ELSE NULL END
        ]::TEXT[];
        
        NEW.llm_keywords = ARRAY[
            NEW.type,
            lower(NEW.name),
            CASE WHEN NEW.sequence_number IS NOT NULL THEN NEW.sequence_number::text ELSE NULL END
        ]::TEXT[];
    END IF;
    
    -- Pour plots
    IF TG_TABLE_NAME = 'plots' THEN
        NEW.aliases = ARRAY[
            lower(NEW.name),
            lower(replace(NEW.name, ' ', '')),
            CASE WHEN NEW.code IS NOT NULL THEN lower(NEW.code) ELSE NULL END
        ]::TEXT[];
        
        NEW.llm_keywords = ARRAY[
            NEW.type,
            lower(NEW.name),
            'parcelle',
            CASE WHEN NEW.code IS NOT NULL THEN lower(NEW.code) ELSE NULL END
        ]::TEXT[];
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers pour auto-génération LLM
CREATE TRIGGER surface_units_generate_llm_data 
    BEFORE INSERT OR UPDATE ON surface_units 
    FOR EACH ROW EXECUTE FUNCTION generate_llm_aliases();

-- Trigger pour plots existants
CREATE TRIGGER plots_generate_llm_data 
    BEFORE INSERT OR UPDATE ON plots 
    FOR EACH ROW EXECUTE FUNCTION generate_llm_aliases();

-- Fonction: Update message count dans chat_sessions
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_sessions 
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            updated_at = NOW()
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chat_sessions 
        SET message_count = message_count - 1,
            updated_at = NOW()
        WHERE id = OLD.session_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER chat_messages_update_session_stats 
    AFTER INSERT OR DELETE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_chat_session_stats();

-- Fonction: Calcul automatique area pour surface_units
CREATE OR REPLACE FUNCTION calculate_surface_unit_area()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.length IS NOT NULL AND NEW.width IS NOT NULL THEN
        NEW.area = NEW.length * NEW.width;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER surface_units_calculate_area 
    BEFORE INSERT OR UPDATE ON surface_units 
    FOR EACH ROW EXECUTE FUNCTION calculate_surface_unit_area();

-- ============================================
-- 10. RLS (ROW LEVEL SECURITY)
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🔒 Configuration sécurité RLS...';
END $$;

-- Activer RLS sur nouvelles tables
ALTER TABLE surface_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversion_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- Helper function pour vérifier accès ferme
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

-- Policies pour surface_units
CREATE POLICY "Users can access surface units of their farms" ON surface_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM plots p 
            WHERE p.id = surface_units.plot_id 
            AND user_has_farm_access(p.farm_id)
        )
    );

-- Policies pour chat_sessions
CREATE POLICY "Users can access their farm chat sessions" ON chat_sessions
    FOR ALL USING (
        user_id = auth.uid() AND user_has_farm_access(farm_id)
    );

-- Policies pour chat_messages
CREATE POLICY "Users can access messages from their sessions" ON chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = chat_messages.session_id 
            AND cs.user_id = auth.uid()
        )
    );

-- Policies pour generated_actions
CREATE POLICY "Users can access their generated actions" ON generated_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = generated_actions.chat_session_id 
            AND cs.user_id = auth.uid()
        )
    );

-- Policies pour observations
CREATE POLICY "Users can access their farm observations" ON observations
    FOR ALL USING (
        user_id = auth.uid() AND user_has_farm_access(farm_id)
    );

-- Policies pour planned_tasks
CREATE POLICY "Users can access their farm planned tasks" ON planned_tasks
    FOR ALL USING (
        user_id = auth.uid() AND user_has_farm_access(farm_id)
    );

-- Policies pour user_conversion_units
CREATE POLICY "Users can access their conversion units" ON user_conversion_units
    FOR ALL USING (user_id = auth.uid());

-- Policies pour offline_sync_queue
CREATE POLICY "Users can access their sync queue" ON offline_sync_queue
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 11. VUES UTILES POUR DÉVELOPPEMENT
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '📊 Création vues utiles pour dev...';
END $$;

-- Vue: Fermes avec statistiques complètes
CREATE OR REPLACE VIEW farms_with_stats AS
SELECT 
    f.*,
    (SELECT COUNT(*) FROM plots WHERE farm_id = f.id AND is_active = true) as plots_count,
    (SELECT COUNT(*) FROM surface_units su 
     JOIN plots p ON su.plot_id = p.id 
     WHERE p.farm_id = f.id AND su.is_active = true) as surface_units_count,
    (SELECT COUNT(*) FROM materials WHERE farm_id = f.id AND is_active = true) as materials_count,
    (SELECT COUNT(*) FROM farm_members WHERE farm_id = f.id AND is_active = true) as members_count,
    (SELECT COUNT(*) FROM tasks WHERE farm_id = f.id AND date >= CURRENT_DATE - INTERVAL '7 days') as recent_tasks_count,
    (SELECT COUNT(*) FROM observations WHERE farm_id = f.id AND created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_observations_count
FROM farms f;

-- Vue: Tâches avec tous les détails
CREATE OR REPLACE VIEW tasks_with_details AS
SELECT 
    t.*,
    f.name as farm_name,
    p.first_name || ' ' || COALESCE(p.last_name, '') as user_name,
    (SELECT string_agg(plots.name, ', ') 
     FROM plots WHERE plots.id = ANY(t.plot_ids)) as plot_names,
    (SELECT string_agg(surface_units.name, ', ') 
     FROM surface_units WHERE surface_units.id = ANY(t.surface_unit_ids)) as surface_unit_names,
    (SELECT string_agg(materials.name, ', ') 
     FROM materials WHERE materials.id = ANY(t.material_ids)) as material_names
FROM tasks t
JOIN farms f ON t.farm_id = f.id
JOIN profiles p ON t.user_id = p.id;

-- Vue: Chat sessions avec statistiques
CREATE OR REPLACE VIEW chat_sessions_with_stats AS
SELECT 
    cs.*,
    f.name as farm_name,
    p.first_name || ' ' || COALESCE(p.last_name, '') as user_name,
    (SELECT COUNT(*) FROM generated_actions ga WHERE ga.chat_session_id = cs.id) as actions_count,
    (SELECT COUNT(*) FROM generated_actions ga WHERE ga.chat_session_id = cs.id AND ga.status = 'validated') as validated_actions_count
FROM chat_sessions cs
JOIN farms f ON cs.farm_id = f.id
JOIN profiles p ON cs.user_id = p.id;

-- Vue: Observations avec détails localisation
CREATE OR REPLACE VIEW observations_with_location_details AS
SELECT 
    o.*,
    f.name as farm_name,
    p.first_name || ' ' || COALESCE(p.last_name, '') as observer_name,
    (SELECT string_agg(plots.name, ', ') 
     FROM plots WHERE plots.id = ANY(o.plot_ids)) as plot_names,
    (SELECT string_agg(su.name, ', ') 
     FROM surface_units su WHERE su.id = ANY(o.surface_unit_ids)) as surface_unit_names
FROM observations o
JOIN farms f ON o.farm_id = f.id
JOIN profiles p ON o.user_id = p.id;

-- ============================================
-- 12. DONNÉES DE TEST POUR DÉVELOPPEMENT
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🧪 Insertion données de test...';
END $$;

-- Insérer des unités de surface test pour parcelles existantes
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, length, width, llm_keywords, description)
SELECT 
    p.id,
    'Planche ' || gs.i,
    'P' || gs.i,
    'planche',
    gs.i,
    20.0,
    1.2,
    ARRAY['planche', 'p' || gs.i::text, 'planche ' || gs.i::text],
    'Planche de culture n°' || gs.i
FROM plots p
CROSS JOIN generate_series(1, 6) AS gs(i)
WHERE p.is_active = true
ON CONFLICT (plot_id, code) DO NOTHING;

-- Insérer des rangs pour parcelles de plein champ
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, length, width, llm_keywords, description)
SELECT 
    p.id,
    'Rang ' || chr(64 + gs.i), -- A, B, C, etc.
    'R' || chr(64 + gs.i),
    'rang',
    gs.i,
    50.0,
    0.8,
    ARRAY['rang', 'r' || chr(64 + gs.i), 'rang ' || chr(64 + gs.i)],
    'Rang de culture ' || chr(64 + gs.i)
FROM plots p
CROSS JOIN generate_series(1, 4) AS gs(i)
WHERE p.type = 'plein_champ' AND p.is_active = true
ON CONFLICT (plot_id, code) DO NOTHING;

-- Données conversions test
INSERT INTO user_conversion_units (user_id, farm_id, container_name, crop_name, conversion_value, conversion_unit, description)
SELECT 
    fm.user_id,
    f.id,
    container,
    culture,
    valeur,
    unite,
    'Conversion automatique de test'
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
CROSS JOIN (VALUES
    ('caisse', 'tomate', 8.0, 'kg'),
    ('caisse', 'courgette', 6.0, 'kg'),
    ('botte', 'radis', 0.5, 'kg'),
    ('botte', 'carotte', 1.0, 'kg'),
    ('panier', 'salade', 2.0, 'kg'),
    ('seau', 'haricot', 3.0, 'kg')
) AS conv(container, culture, valeur, unite)
WHERE fm.is_active = true
ON CONFLICT (user_id, farm_id, container_name, crop_name) DO NOTHING;

-- Session de chat de test
INSERT INTO chat_sessions (farm_id, user_id, chat_type, title)
SELECT 
    f.id,
    fm.user_id,
    'general',
    'Chat Thomas - ' || f.name
FROM farms f
JOIN farm_members fm ON f.id = fm.farm_id
WHERE fm.is_active = true AND fm.role IN ('owner', 'manager')
ON CONFLICT DO NOTHING;

-- Messages de test
INSERT INTO chat_messages (session_id, role, content, ai_processed, ai_confidence)
SELECT 
    cs.id,
    'user',
    'Bonjour Thomas, j''ai planté des tomates dans la serre 1 aujourd''hui, planche 1 à 3. Durée: 2 heures.',
    true,
    0.95
FROM chat_sessions cs
LIMIT 3;

INSERT INTO chat_messages (session_id, role, content, message_type, metadata)
SELECT 
    cs.id,
    'assistant',
    'Parfait ! J''ai bien compris votre travail de plantation. Voulez-vous que je créé une tâche avec ces informations ?',
    'action_card',
    '{"suggested_action": "create_task", "confidence": 0.95, "extracted_data": {"action": "planter", "culture": "tomates", "duree": 120, "parcelle": "serre 1", "planches": [1,2,3]}}'
FROM chat_sessions cs
WHERE id IN (SELECT session_id FROM chat_messages WHERE role = 'user')
LIMIT 3;

-- ============================================
-- 13. FONCTIONS UTILITAIRES POUR IA
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '🤖 Création fonctions utilitaires IA...';
END $$;

-- Fonction: Recherche floue parcelles par nom/alias
CREATE OR REPLACE FUNCTION search_plots_fuzzy(
    p_farm_id INTEGER,
    p_search_text TEXT,
    p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id INTEGER,
    name CHARACTER VARYING,
    type CHARACTER VARYING,
    similarity_score REAL,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        GREATEST(
            similarity(p.name, p_search_text),
            COALESCE((SELECT MAX(similarity(alias, p_search_text)) FROM unnest(p.aliases) alias), 0)
        ) as similarity_score,
        CASE 
            WHEN p.name ILIKE '%' || p_search_text || '%' THEN 'exact_match'
            WHEN EXISTS(SELECT 1 FROM unnest(p.aliases) alias WHERE alias ILIKE '%' || p_search_text || '%') THEN 'alias_match'
            ELSE 'fuzzy_match'
        END as match_type
    FROM plots p
    WHERE p.farm_id = p_farm_id 
        AND p.is_active = true
        AND (
            similarity(p.name, p_search_text) > p_similarity_threshold
            OR p.name ILIKE '%' || p_search_text || '%'
            OR EXISTS(
                SELECT 1 FROM unnest(p.aliases) alias 
                WHERE alias ILIKE '%' || p_search_text || '%' 
                   OR similarity(alias, p_search_text) > p_similarity_threshold
            )
        )
    ORDER BY similarity_score DESC, match_type;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Recherche floue unités de surface
CREATE OR REPLACE FUNCTION search_surface_units_fuzzy(
    p_farm_id INTEGER,
    p_search_text TEXT,
    p_plot_context TEXT DEFAULT NULL,
    p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id INTEGER,
    name CHARACTER VARYING,
    code CHARACTER VARYING,
    type CHARACTER VARYING,
    plot_name CHARACTER VARYING,
    similarity_score REAL,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.id,
        su.name,
        su.code,
        su.type,
        p.name as plot_name,
        GREATEST(
            similarity(su.name, p_search_text),
            COALESCE(similarity(su.code, p_search_text), 0),
            COALESCE((SELECT MAX(similarity(alias, p_search_text)) FROM unnest(su.aliases) alias), 0)
        ) as similarity_score,
        CASE 
            WHEN su.name ILIKE '%' || p_search_text || '%' THEN 'exact_match'
            WHEN su.code ILIKE '%' || p_search_text || '%' THEN 'code_match'
            WHEN EXISTS(SELECT 1 FROM unnest(su.aliases) alias WHERE alias ILIKE '%' || p_search_text || '%') THEN 'alias_match'
            ELSE 'fuzzy_match'
        END as match_type
    FROM surface_units su
    JOIN plots p ON su.plot_id = p.id
    WHERE p.farm_id = p_farm_id 
        AND p.is_active = true
        AND su.is_active = true
        AND (p_plot_context IS NULL OR p.name ILIKE '%' || p_plot_context || '%')
        AND (
            similarity(su.name, p_search_text) > p_similarity_threshold
            OR similarity(COALESCE(su.code, ''), p_search_text) > p_similarity_threshold
            OR su.name ILIKE '%' || p_search_text || '%'
            OR su.code ILIKE '%' || p_search_text || '%'
            OR EXISTS(
                SELECT 1 FROM unnest(su.aliases) alias 
                WHERE alias ILIKE '%' || p_search_text || '%' 
                   OR similarity(alias, p_search_text) > p_similarity_threshold
            )
        )
    ORDER BY similarity_score DESC, match_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FINALISATION ET VÉRIFICATIONS
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Compter nouvelles tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('surface_units', 'chat_sessions', 'chat_messages', 'generated_actions', 
                       'observations', 'planned_tasks', 'user_conversion_units', 'offline_sync_queue');
    
    -- Compter index
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%llm%';
    
    -- Compter triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%updated_at%';
    
    RAISE NOTICE '✅ MIGRATION THOMAS V2 TERMINÉE AVEC SUCCÈS !';
    RAISE NOTICE '📊 Statistiques:';
    RAISE NOTICE '  - Tables ajoutées: %', table_count;
    RAISE NOTICE '  - Index LLM créés: %', index_count; 
    RAISE NOTICE '  - Triggers actifs: %', trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Fonctionnalités activées:';
    RAISE NOTICE '  ✅ Unités de surface avec reconnaissance LLM';
    RAISE NOTICE '  ✅ Chat Thomas multi-sessions';
    RAISE NOTICE '  ✅ Observations cultures IA';
    RAISE NOTICE '  ✅ Planning avancé avec récurrence';
    RAISE NOTICE '  ✅ Conversions utilisateur personnalisées';
    RAISE NOTICE '  ✅ Système offline/sync robuste';
    RAISE NOTICE '  ✅ Sécurité RLS multi-tenant';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Thomas V2 est prêt pour le développement !';
END $$;
