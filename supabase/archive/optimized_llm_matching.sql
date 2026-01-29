-- ============================================
-- FONCTIONS LLM OPTIMISÉES POUR MATCHING INTELLIGENT
-- Deux tables mais recherche unifiée !
-- ============================================

-- Fonction: Matching unifié plots + surface_units en une seule requête
CREATE OR REPLACE FUNCTION smart_location_matching(
    p_farm_id INTEGER,
    p_user_text TEXT, -- "planche 3 de la serre 1" ou "rang A du tunnel"
    p_similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    match_type TEXT, -- 'plot_only', 'surface_unit', 'plot_and_surface_unit'
    plot_id INTEGER,
    plot_name TEXT,
    plot_type TEXT,
    surface_unit_id INTEGER,
    surface_unit_name TEXT,
    surface_unit_code TEXT,
    full_location TEXT, -- "Serre 1 > Planche 3"
    confidence_score REAL,
    match_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Étape 1: Extraire mots-clés du texte utilisateur
    user_keywords AS (
        SELECT unnest(string_to_array(lower(regexp_replace(p_user_text, '[^\w\s]', ' ', 'g')), ' ')) as keyword
    ),
    
    -- Étape 2: Matching plots
    plot_matches AS (
        SELECT 
            p.id,
            p.name,
            p.type,
            -- Score basé sur mots-clés + similarité textuelle
            GREATEST(
                -- Matching exact sur aliases
                CASE WHEN EXISTS(
                    SELECT 1 FROM unnest(p.aliases) alias 
                    WHERE alias IN (SELECT keyword FROM user_keywords WHERE length(keyword) > 2)
                ) THEN 1.0 ELSE 0.0 END,
                
                -- Matching partiel sur nom
                CASE WHEN EXISTS(
                    SELECT 1 FROM user_keywords uk 
                    WHERE length(uk.keyword) > 2 AND p.name ILIKE '%' || uk.keyword || '%'
                ) THEN 0.8 ELSE 0.0 END,
                
                -- Similarité textuelle
                similarity(p.name, p_user_text),
                
                -- Keywords LLM overlap
                CASE WHEN EXISTS(
                    SELECT 1 FROM user_keywords uk 
                    WHERE length(uk.keyword) > 2 AND p.llm_keywords @> ARRAY[uk.keyword]
                ) THEN 0.6 ELSE 0.0 END
            ) as plot_score
        FROM plots p
        WHERE p.farm_id = p_farm_id AND p.is_active = true
    ),
    
    -- Étape 3: Matching surface_units avec contexte plot
    surface_unit_matches AS (
        SELECT 
            su.id as su_id,
            su.plot_id,
            su.name as su_name,
            su.code as su_code,
            p.id as p_id,
            p.name as p_name,
            p.type as p_type,
            pm.plot_score,
            -- Score surface unit
            GREATEST(
                -- Code exact (P3, RA, etc.)
                CASE WHEN EXISTS(
                    SELECT 1 FROM user_keywords uk 
                    WHERE uk.keyword = lower(su.code) OR uk.keyword = lower(su.name)
                ) THEN 1.0 ELSE 0.0 END,
                
                -- Aliases surface unit
                CASE WHEN EXISTS(
                    SELECT 1 FROM unnest(su.aliases) alias, user_keywords uk
                    WHERE alias = uk.keyword
                ) THEN 0.9 ELSE 0.0 END,
                
                -- Pattern matching numérique (planche 3, rang 5)
                CASE WHEN p_user_text ~* (su.type || '\s*' || COALESCE(su.sequence_number::text, '\d+'))
                THEN 0.8 ELSE 0.0 END,
                
                -- Similarité nom
                similarity(su.name, p_user_text)
            ) as su_score
        FROM surface_units su
        JOIN plots p ON su.plot_id = p.id
        LEFT JOIN plot_matches pm ON p.id = pm.id
        WHERE p.farm_id = p_farm_id AND su.is_active = true
    ),
    
    -- Étape 4: Combinaison intelligente des scores
    combined_results AS (
        -- Surface units avec contexte plot
        SELECT 
            'plot_and_surface_unit' as match_type,
            p_id as plot_id,
            p_name as plot_name,  
            p_type as plot_type,
            su_id as surface_unit_id,
            su_name as surface_unit_name,
            su_code as surface_unit_code,
            p_name || ' > ' || su_name as full_location,
            -- Score combiné avec boost si plot mentionnée
            CASE 
                WHEN COALESCE(plot_score, 0) > 0.3 AND su_score > 0.3 
                THEN (COALESCE(plot_score, 0) + su_score) / 2 + 0.2 -- Boost si les deux matchent
                ELSE GREATEST(COALESCE(plot_score, 0), su_score)
            END as confidence_score,
            jsonb_build_object(
                'plot_score', COALESCE(plot_score, 0),
                'surface_unit_score', su_score,
                'has_plot_context', COALESCE(plot_score, 0) > 0.3,
                'keywords_found', (SELECT COALESCE(array_agg(keyword), '{}') FROM user_keywords WHERE length(keyword) > 2)
            ) as match_details
        FROM surface_unit_matches
        WHERE su_score > p_similarity_threshold
        
        UNION ALL
        
        -- Plots seules (si pas de surface unit pertinente)
        SELECT 
            'plot_only' as match_type,
            pm.id as plot_id,
            pm.name as plot_name,
            pm.type as plot_type,
            NULL as surface_unit_id,
            NULL as surface_unit_name,
            NULL as surface_unit_code,
            pm.name as full_location,
            pm.plot_score as confidence_score,
            jsonb_build_object(
                'plot_score', pm.plot_score,
                'surface_unit_score', NULL,
                'match_reason', 'plot_only',
                'keywords_found', (SELECT COALESCE(array_agg(keyword), '{}') FROM user_keywords WHERE length(keyword) > 2)
            ) as match_details
        FROM plot_matches pm
        WHERE pm.plot_score > p_similarity_threshold
        -- Et pas déjà incluse dans surface_unit_matches
        AND NOT EXISTS (
            SELECT 1 FROM surface_unit_matches sum 
            WHERE sum.p_id = pm.id AND sum.su_score > p_similarity_threshold
        )
    )
    
    SELECT * FROM combined_results
    WHERE confidence_score > p_similarity_threshold
    ORDER BY confidence_score DESC, match_type DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FONCTION SIMPLIFIÉE POUR USAGE COURANT
-- ============================================

-- Version simple pour 95% des cas
CREATE OR REPLACE FUNCTION find_location(
    p_farm_id INTEGER,
    p_text TEXT
)
RETURNS TABLE (
    location_description TEXT,
    plot_id INTEGER,
    surface_unit_id INTEGER,
    confidence REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        slm.full_location as location_description,
        slm.plot_id,
        slm.surface_unit_id,
        slm.confidence_score as confidence
    FROM smart_location_matching(p_farm_id, p_text) slm
    ORDER BY slm.confidence_score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXEMPLES D'USAGE
-- ============================================

/*
-- Test avec vos données
SELECT * FROM find_location(1, 'planche 3 de la serre 1');
SELECT * FROM find_location(1, 'rang A du tunnel');  
SELECT * FROM find_location(1, 'serre principale');
SELECT * FROM find_location(1, 'p3 s1'); -- Codes courts
SELECT * FROM find_location(1, 'tunnel nord rang b');

-- Résultats attendus:
--   location_description    | plot_id | surface_unit_id | confidence
-- "Serre 1 > Planche 3"    |    1    |       5         |   0.95
-- "Tunnel Nord > Rang A"   |    2    |       12        |   0.88
-- "Serre Principale"       |    1    |      NULL       |   0.75
*/

-- ============================================
-- OPTIMISATIONS INDEX POUR PERFORMANCE
-- ============================================

-- Index spécialisés pour les fonctions LLM
CREATE INDEX IF NOT EXISTS idx_plots_name_gin_trgm ON plots USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_surface_units_name_gin_trgm ON surface_units USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_plots_llm_keywords_gin ON plots USING gin(llm_keywords);
CREATE INDEX IF NOT EXISTS idx_surface_units_llm_keywords_gin ON surface_units USING gin(llm_keywords);
CREATE INDEX IF NOT EXISTS idx_plots_aliases_gin ON plots USING gin(aliases);
CREATE INDEX IF NOT EXISTS idx_surface_units_aliases_gin ON surface_units USING gin(aliases);

-- Index composé pour jointures fréquentes
CREATE INDEX IF NOT EXISTS idx_surface_units_plot_active ON surface_units(plot_id, is_active);

-- ============================================
-- FONCTION BONUS: AUTO-GÉNÉRATION KEYWORDS
-- ============================================

-- Met à jour automatiquement les keywords LLM selon les patterns
CREATE OR REPLACE FUNCTION update_llm_keywords()
RETURNS VOID AS $$
BEGIN
    -- Plots keywords
    UPDATE plots SET llm_keywords = ARRAY[
        lower(name),
        type,
        'parcelle',
        split_part(lower(name), ' ', 1), -- Premier mot
        CASE WHEN name ~* '\d+' THEN regexp_replace(lower(name), '[^\d]', '', 'g') ELSE NULL END -- Numéros
    ]::TEXT[];
    
    -- Surface units keywords  
    UPDATE surface_units SET llm_keywords = ARRAY[
        type,
        lower(name),
        CASE WHEN code IS NOT NULL THEN lower(code) ELSE NULL END,
        CASE WHEN sequence_number IS NOT NULL THEN sequence_number::text ELSE NULL END,
        split_part(lower(name), ' ', 1) -- Premier mot (planche, rang, etc.)
    ]::TEXT[];
    
    RAISE NOTICE 'Keywords LLM mis à jour pour % plots et % surface_units', 
        (SELECT COUNT(*) FROM plots),
        (SELECT COUNT(*) FROM surface_units);
END;
$$ LANGUAGE plpgsql;

-- Exécuter maintenant
SELECT update_llm_keywords();
