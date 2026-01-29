-- ============================================
-- FONCTIONS LLM CORRIGÉES POUR SCHÉMA ACTUEL
-- Compatible avec votre base de données existante
-- ============================================

-- Extension pg_trgm pour recherche floue
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- AJOUT COLONNE MANQUANTE SI NÉCESSAIRE
-- ============================================

-- Ajouter colonne aliases à surface_units si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surface_units' 
        AND column_name = 'aliases'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE surface_units ADD COLUMN aliases TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Colonne aliases ajoutée à surface_units';
    ELSE
        RAISE NOTICE 'Colonne aliases existe déjà dans surface_units';
    END IF;
END $$;

-- ============================================
-- FONCTION PRINCIPALE: RECHERCHE LOCALISATION
-- ============================================

CREATE OR REPLACE FUNCTION find_location(
    p_farm_id INTEGER,
    p_text TEXT
)
RETURNS TABLE (
    location_description TEXT,
    plot_id INTEGER,
    surface_unit_id INTEGER,
    confidence REAL,
    match_type TEXT
) AS $$
DECLARE
    search_text TEXT := lower(trim(p_text));
    keywords TEXT[];
BEGIN
    -- Extraire mots-clés du texte
    keywords := string_to_array(regexp_replace(search_text, '[^\w\s]', ' ', 'g'), ' ');
    keywords := array_remove(keywords, '');
    
    RETURN QUERY
    WITH 
    -- Étape 1: Scores parcelles
    plot_scores AS (
        SELECT 
            p.id,
            p.name,
            p.type,
            -- Score basé sur nom, aliases et keywords
            GREATEST(
                -- Nom exact ou partiel
                CASE 
                    WHEN lower(p.name) = search_text THEN 1.0
                    WHEN lower(p.name) LIKE '%' || search_text || '%' THEN 0.9
                    WHEN similarity(lower(p.name), search_text) > 0.5 THEN similarity(lower(p.name), search_text)
                    ELSE 0.0
                END,
                -- Aliases match (vérification sécurisée)
                CASE 
                    WHEN p.aliases IS NOT NULL AND p.aliases @> ARRAY[search_text] THEN 0.95
                    WHEN p.aliases IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(p.aliases) alias 
                        WHERE alias LIKE '%' || search_text || '%'
                    ) THEN 0.8
                    ELSE 0.0
                END,
                -- Keywords match (vérification sécurisée)
                CASE 
                    WHEN p.llm_keywords IS NOT NULL AND p.llm_keywords && keywords THEN 0.7
                    ELSE 0.0
                END
            ) as plot_score
        FROM plots p
        WHERE p.farm_id = p_farm_id AND p.is_active = true
    ),
    
    -- Étape 2: Scores unités de surface
    surface_scores AS (
        SELECT 
            su.id as surface_id,
            su.plot_id,
            su.name as surface_name,
            su.code as surface_code,
            p.id as p_id,
            p.name as p_name,
            p.type as p_type,
            ps.plot_score,
            -- Score unité surface
            GREATEST(
                -- Nom exact ou partiel
                CASE 
                    WHEN lower(su.name) = search_text THEN 1.0
                    WHEN lower(su.name) LIKE '%' || search_text || '%' THEN 0.9
                    ELSE 0.0
                END,
                -- Code exact (P3, RA, etc.) - vérification NULL
                CASE 
                    WHEN su.code IS NOT NULL AND lower(su.code) = search_text THEN 1.0
                    WHEN su.code IS NOT NULL AND search_text LIKE '%' || lower(su.code) || '%' THEN 0.8
                    ELSE 0.0
                END,
                -- Pattern numérique (planche 3, rang 5)
                CASE 
                    WHEN su.sequence_number IS NOT NULL 
                         AND search_text ~ (su.type || '\s*' || su.sequence_number::text) THEN 0.8
                    ELSE 0.0
                END,
                -- Similarité textuelle
                similarity(lower(su.name), search_text),
                -- Aliases match (vérification sécurisée)
                CASE 
                    WHEN su.aliases IS NOT NULL AND su.aliases @> ARRAY[search_text] THEN 0.85
                    ELSE 0.0
                END
            ) as surface_score
        FROM surface_units su
        JOIN plots p ON su.plot_id = p.id
        LEFT JOIN plot_scores ps ON p.id = ps.id
        WHERE p.farm_id = p_farm_id AND su.is_active = true
    ),
    
    -- Étape 3: Résultats combinés
    all_matches AS (
        -- Matches avec parcelle ET unité surface
        SELECT 
            p_name || ' > ' || surface_name as location_description,
            p_id as plot_id,
            surface_id as surface_unit_id,
            CASE 
                -- Boost si les deux contextes matchent
                WHEN COALESCE(plot_score, 0) > 0.3 AND surface_score > 0.3 
                THEN (COALESCE(plot_score, 0) + surface_score) / 2 + 0.2
                ELSE GREATEST(COALESCE(plot_score, 0), surface_score)
            END as confidence,
            'plot_and_surface' as match_type
        FROM surface_scores
        WHERE surface_score > 0.2
        
        UNION ALL
        
        -- Matches parcelle seule
        SELECT 
            ps.name as location_description,
            ps.id as plot_id,
            NULL as surface_unit_id,
            ps.plot_score as confidence,
            'plot_only' as match_type
        FROM plot_scores ps
        WHERE ps.plot_score > 0.3
        -- Éviter doublons avec surface_scores
        AND NOT EXISTS (
            SELECT 1 FROM surface_scores ss 
            WHERE ss.p_id = ps.id AND ss.surface_score > 0.2
        )
    )
    
    SELECT 
        am.location_description,
        am.plot_id,
        am.surface_unit_id,
        am.confidence,
        am.match_type
    FROM all_matches am
    WHERE am.confidence > 0.2
    ORDER BY am.confidence DESC, 
             CASE am.match_type WHEN 'plot_and_surface' THEN 1 ELSE 2 END
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION RECHERCHE PARCELLES SIMPLES
-- ============================================

CREATE OR REPLACE FUNCTION find_plots(
    p_farm_id INTEGER,
    p_text TEXT DEFAULT NULL
)
RETURNS TABLE (
    plot_id INTEGER,
    plot_name TEXT,
    plot_type TEXT,
    confidence REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        CASE 
            WHEN p_text IS NULL THEN 1.0 -- Toutes les parcelles
            WHEN lower(p.name) LIKE '%' || lower(p_text) || '%' THEN 0.9
            WHEN p.aliases IS NOT NULL AND p.aliases @> ARRAY[lower(p_text)] THEN 0.8
            WHEN similarity(lower(p.name), lower(p_text)) > 0.4 THEN similarity(lower(p.name), lower(p_text))
            ELSE 0.0
        END as confidence
    FROM plots p
    WHERE p.farm_id = p_farm_id 
      AND p.is_active = true
      AND (p_text IS NULL OR (
          lower(p.name) LIKE '%' || lower(p_text) || '%' OR
          (p.aliases IS NOT NULL AND p.aliases @> ARRAY[lower(p_text)]) OR
          similarity(lower(p.name), lower(p_text)) > 0.4
      ))
    ORDER BY confidence DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION RECHERCHE UNITÉS SURFACE  
-- ============================================

CREATE OR REPLACE FUNCTION find_surface_units(
    p_farm_id INTEGER,
    p_plot_id INTEGER DEFAULT NULL,
    p_text TEXT DEFAULT NULL
)
RETURNS TABLE (
    surface_unit_id INTEGER,
    surface_unit_name TEXT,
    surface_unit_code TEXT,
    plot_name TEXT,
    confidence REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.id,
        su.name,
        COALESCE(su.code, ''),
        p.name,
        CASE 
            WHEN p_text IS NULL THEN 1.0 -- Toutes les unités
            WHEN lower(su.name) LIKE '%' || lower(p_text) || '%' THEN 0.9
            WHEN su.code IS NOT NULL AND lower(su.code) = lower(p_text) THEN 0.95
            WHEN similarity(lower(su.name), lower(p_text)) > 0.4 THEN similarity(lower(su.name), lower(p_text))
            ELSE 0.0
        END as confidence
    FROM surface_units su
    JOIN plots p ON su.plot_id = p.id
    WHERE p.farm_id = p_farm_id 
      AND su.is_active = true
      AND (p_plot_id IS NULL OR su.plot_id = p_plot_id)
      AND (p_text IS NULL OR (
          lower(su.name) LIKE '%' || lower(p_text) || '%' OR
          (su.code IS NOT NULL AND lower(su.code) = lower(p_text)) OR
          similarity(lower(su.name), lower(p_text)) > 0.4
      ))
    ORDER BY confidence DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION MISE À JOUR KEYWORDS
-- ============================================

CREATE OR REPLACE FUNCTION update_location_keywords()
RETURNS TEXT AS $$
DECLARE
    plots_updated INTEGER;
    surfaces_updated INTEGER;
BEGIN
    -- Mise à jour plots
    UPDATE plots SET 
        aliases = COALESCE(aliases, '{}') || ARRAY[
            lower(name), 
            lower(regexp_replace(name, '\s+', '', 'g'))
        ],
        llm_keywords = COALESCE(llm_keywords, '{}') || ARRAY[
            lower(name),
            type,
            'parcelle',
            split_part(lower(name), ' ', 1)
        ];
    
    GET DIAGNOSTICS plots_updated = ROW_COUNT;
    
    -- Mise à jour surface_units
    UPDATE surface_units SET 
        aliases = COALESCE(aliases, '{}') || ARRAY[
            lower(name), 
            lower(COALESCE(code, name))
        ],
        llm_keywords = COALESCE(llm_keywords, '{}') || ARRAY[
            type,
            lower(name),
            lower(COALESCE(code, '')),
            COALESCE(sequence_number::text, ''),
            split_part(lower(name), ' ', 1)
        ];
    
    GET DIAGNOSTICS surfaces_updated = ROW_COUNT;
    
    RETURN format('Keywords mis à jour: %s parcelles, %s unités surface', plots_updated, surfaces_updated);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEX OPTIMISÉS POUR VOTRE SCHÉMA
-- ============================================

-- Index pour recherche textuelle
CREATE INDEX IF NOT EXISTS idx_plots_name_lower ON plots(lower(name));
CREATE INDEX IF NOT EXISTS idx_plots_aliases_gin ON plots USING gin(aliases) WHERE aliases IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plots_llm_keywords_gin ON plots USING gin(llm_keywords) WHERE llm_keywords IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surface_units_name_lower ON surface_units(lower(name));
CREATE INDEX IF NOT EXISTS idx_surface_units_code_lower ON surface_units(lower(code)) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surface_units_aliases_gin ON surface_units USING gin(aliases) WHERE aliases IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_surface_units_llm_keywords_gin ON surface_units USING gin(llm_keywords) WHERE llm_keywords IS NOT NULL;

-- Index pour jointures
CREATE INDEX IF NOT EXISTS idx_surface_units_plot_active ON surface_units(plot_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_plots_farm_active ON plots(farm_id) WHERE is_active = true;

-- ============================================
-- INITIALISATION AUTOMATIQUE
-- ============================================

-- Générer keywords pour données existantes
SELECT update_location_keywords();

-- Message de succès
DO $$
DECLARE
    plots_count INTEGER;
    surface_units_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plots_count FROM plots;
    SELECT COUNT(*) INTO surface_units_count FROM surface_units;
    
    RAISE NOTICE '✅ FONCTIONS LLM INSTALLÉES AVEC SUCCÈS !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Base de données analysée:';
    RAISE NOTICE '  • % parcelles trouvées', plots_count;
    RAISE NOTICE '  • % unités de surface trouvées', surface_units_count;
    RAISE NOTICE '  • Colonne aliases ajoutée à surface_units';
    RAISE NOTICE '  • Keywords LLM générés automatiquement';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Fonctions disponibles:';
    RAISE NOTICE '  • find_location(farm_id, text) - Recherche intelligente';
    RAISE NOTICE '  • find_plots(farm_id, text) - Recherche parcelles';
    RAISE NOTICE '  • find_surface_units(farm_id, plot_id, text) - Recherche unités';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Exemple d''usage:';
    RAISE NOTICE '  SELECT * FROM find_location(1, ''planche 3 serre 1'');';
END $$;




