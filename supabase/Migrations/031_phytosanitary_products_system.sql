-- Migration 031: Système de gestion des produits phytosanitaires
-- Données E-Phy - Anses
-- Date: 2026-01-22

-- ============================================================================
-- Table: phytosanitary_products
-- Stocke les produits phytosanitaires autorisés (données E-Phy) et personnalisés
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.phytosanitary_products (
    amm TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type_produit TEXT,
    secondary_names TEXT,
    holder TEXT,
    commercial_type TEXT,
    usage_range TEXT,
    authorized_mentions TEXT,
    usage_restrictions TEXT,
    usage_restrictions_label TEXT,
    active_substances TEXT,
    functions TEXT,
    formulations TEXT,
    authorization_state TEXT,
    withdrawal_date DATE,
    first_authorization_date DATE,
    reference_amm TEXT,
    reference_product_name TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    farm_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key pour produits personnalisés
    CONSTRAINT fk_phytosanitary_farm FOREIGN KEY (farm_id) 
        REFERENCES public.farms(id) ON DELETE CASCADE
);

-- Index pour recherche et filtrage
CREATE INDEX IF NOT EXISTS idx_phytosanitary_products_name_trgm 
    ON public.phytosanitary_products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_phytosanitary_products_functions 
    ON public.phytosanitary_products USING gin (to_tsvector('french', functions));

CREATE INDEX IF NOT EXISTS idx_phytosanitary_products_state 
    ON public.phytosanitary_products (authorization_state);

CREATE INDEX IF NOT EXISTS idx_phytosanitary_products_farm 
    ON public.phytosanitary_products (farm_id) WHERE farm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_phytosanitary_products_custom 
    ON public.phytosanitary_products (is_custom);

-- ============================================================================
-- Table: phytosanitary_usages
-- Stocke les usages autorisés pour chaque produit (données E-Phy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.phytosanitary_usages (
    id BIGSERIAL PRIMARY KEY,
    amm TEXT NOT NULL,
    usage_id TEXT,
    usage_lib_short TEXT,
    target_culture TEXT,
    treated_part TEXT,
    target_pest TEXT,
    decision_date DATE,
    cultural_stage_min TEXT,
    cultural_stage_max TEXT,
    usage_state TEXT,
    retained_dose NUMERIC,
    retained_dose_unit TEXT,
    harvest_delay_days INTEGER,
    harvest_delay_bbch TEXT,
    max_applications INTEGER,
    end_distribution_date DATE,
    end_use_date DATE,
    employment_condition TEXT,
    znt_aquatic_m NUMERIC,
    znt_arthropods_m NUMERIC,
    znt_plants_m NUMERIC,
    authorized_mentions TEXT,
    min_interval_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key vers produits
    CONSTRAINT fk_phytosanitary_usage_product FOREIGN KEY (amm) 
        REFERENCES public.phytosanitary_products(amm) ON DELETE CASCADE
);

-- Index pour recherche par culture et bioagresseur
CREATE INDEX IF NOT EXISTS idx_phytosanitary_usages_amm 
    ON public.phytosanitary_usages (amm);

CREATE INDEX IF NOT EXISTS idx_phytosanitary_usages_culture 
    ON public.phytosanitary_usages USING gin (to_tsvector('french', target_culture));

CREATE INDEX IF NOT EXISTS idx_phytosanitary_usages_pest 
    ON public.phytosanitary_usages USING gin (to_tsvector('french', target_pest));

CREATE INDEX IF NOT EXISTS idx_phytosanitary_usages_state 
    ON public.phytosanitary_usages (usage_state);

-- ============================================================================
-- Table: user_phytosanitary_preferences
-- Stocke les préférences utilisateur (produits sélectionnés, filtres)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_phytosanitary_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    farm_id INTEGER NOT NULL,
    product_amms TEXT[] DEFAULT ARRAY[]::TEXT[],
    culture_filter TEXT[] DEFAULT ARRAY[]::TEXT[],
    function_filter TEXT[] DEFAULT ARRAY[]::TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_phyto_pref_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_phyto_pref_farm FOREIGN KEY (farm_id) 
        REFERENCES public.farms(id) ON DELETE CASCADE,
    
    -- Une seule préférence par utilisateur/ferme
    CONSTRAINT unique_user_farm_phyto_prefs UNIQUE (user_id, farm_id)
);

-- Index pour accès rapide
CREATE INDEX IF NOT EXISTS idx_user_phyto_prefs_user_farm 
    ON public.user_phytosanitary_preferences (user_id, farm_id);

CREATE INDEX IF NOT EXISTS idx_user_phyto_prefs_farm 
    ON public.user_phytosanitary_preferences (farm_id);

-- ============================================================================
-- Fonction de mise à jour du timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_phytosanitary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mise à jour automatique
CREATE TRIGGER update_phytosanitary_products_timestamp
    BEFORE UPDATE ON public.phytosanitary_products
    FOR EACH ROW
    EXECUTE FUNCTION update_phytosanitary_updated_at();

CREATE TRIGGER update_phyto_preferences_timestamp
    BEFORE UPDATE ON public.user_phytosanitary_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_phytosanitary_updated_at();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Activer RLS
ALTER TABLE public.phytosanitary_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phytosanitary_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phytosanitary_preferences ENABLE ROW LEVEL SECURITY;

-- Policies pour phytosanitary_products
-- Tout le monde peut lire les produits officiels (E-Phy)
CREATE POLICY "Anyone can read official phyto products"
    ON public.phytosanitary_products
    FOR SELECT
    USING (is_custom = FALSE OR is_custom IS NULL);

-- Les utilisateurs peuvent lire leurs propres produits personnalisés
CREATE POLICY "Users can read their own custom phyto products"
    ON public.phytosanitary_products
    FOR SELECT
    USING (
        is_custom = TRUE AND 
        farm_id IN (
            SELECT farm_id FROM public.farm_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Les utilisateurs peuvent créer des produits personnalisés pour leurs fermes
CREATE POLICY "Users can create custom phyto products for their farms"
    ON public.phytosanitary_products
    FOR INSERT
    WITH CHECK (
        is_custom = TRUE AND
        farm_id IN (
            SELECT farm_id FROM public.farm_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Les utilisateurs peuvent supprimer leurs propres produits personnalisés
CREATE POLICY "Users can delete their own custom phyto products"
    ON public.phytosanitary_products
    FOR DELETE
    USING (
        is_custom = TRUE AND
        farm_id IN (
            SELECT farm_id FROM public.farm_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Policies pour phytosanitary_usages
-- Tout le monde peut lire les usages (associés aux produits officiels)
CREATE POLICY "Anyone can read phyto usages"
    ON public.phytosanitary_usages
    FOR SELECT
    USING (TRUE);

-- Policies pour user_phytosanitary_preferences
-- Les utilisateurs peuvent lire leurs propres préférences
CREATE POLICY "Users can read their own phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR SELECT
    USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs préférences
CREATE POLICY "Users can create their own phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        farm_id IN (
            SELECT farm_id FROM public.farm_members 
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Les utilisateurs peuvent mettre à jour leurs préférences
CREATE POLICY "Users can update their own phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs préférences
CREATE POLICY "Users can delete their own phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- Commentaires pour documentation
-- ============================================================================
COMMENT ON TABLE public.phytosanitary_products IS 
    'Produits phytosanitaires autorisés (E-Phy - Anses) et produits personnalisés. Source: https://ephy.anses.fr/';

COMMENT ON TABLE public.phytosanitary_usages IS 
    'Usages autorisés des produits phytosanitaires (E-Phy - Anses)';

COMMENT ON TABLE public.user_phytosanitary_preferences IS 
    'Préférences utilisateur pour les produits phytosanitaires (liste personnalisée, filtres)';

COMMENT ON COLUMN public.phytosanitary_products.amm IS 
    'Numéro AMM (Autorisation de Mise sur le Marché) - Identifiant unique';

COMMENT ON COLUMN public.phytosanitary_products.is_custom IS 
    'TRUE si produit créé par utilisateur (non autorisé), FALSE si produit officiel E-Phy';

COMMENT ON COLUMN public.phytosanitary_usages.target_culture IS 
    'Culture cible extraite de "identifiant usage lib court"';

COMMENT ON COLUMN public.phytosanitary_usages.treated_part IS 
    'Partie traitée extraite de "identifiant usage lib court"';

COMMENT ON COLUMN public.phytosanitary_usages.target_pest IS 
    'Bioagresseur concerné extrait de "identifiant usage lib court"';

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phytosanitary_products TO authenticated;
GRANT SELECT ON public.phytosanitary_usages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_phytosanitary_preferences TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.phytosanitary_usages_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_phytosanitary_preferences_id_seq TO authenticated;
