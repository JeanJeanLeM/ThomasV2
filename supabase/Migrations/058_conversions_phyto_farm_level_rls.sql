-- Migration: Conversions et préférences phyto au niveau ferme (partagés entre membres)
-- Les membres d'une ferme voient et gèrent les mêmes conversions et la même liste phyto pour la ferme.
-- Nécessite que user_has_farm_access (migration 004) existe.

-- ============================================================================
-- 1. user_conversion_units : accès par ferme (tout membre peut lire/écrire)
-- ============================================================================

DROP POLICY IF EXISTS "Users can access their conversion units" ON public.user_conversion_units;

CREATE POLICY "Farm members can access farm conversion units"
    ON public.user_conversion_units
    FOR ALL
    USING (user_has_farm_access(farm_id))
    WITH CHECK (user_has_farm_access(farm_id));

COMMENT ON POLICY "Farm members can access farm conversion units" ON public.user_conversion_units IS
    'Conversions partagées au niveau ferme : tout membre peut lire/modifier les conversions de la ferme.';

-- ============================================================================
-- 2. user_phytosanitary_preferences : accès par ferme (tout membre peut lire/écrire)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read their own phyto preferences"
    ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Users can create their own phyto preferences"
    ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Users can update their own phyto preferences"
    ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Users can delete their own phyto preferences"
    ON public.user_phytosanitary_preferences;

CREATE POLICY "Farm members can read farm phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR SELECT
    USING (user_has_farm_access(farm_id));

CREATE POLICY "Farm members can insert farm phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR INSERT
    WITH CHECK (user_has_farm_access(farm_id));

CREATE POLICY "Farm members can update farm phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR UPDATE
    USING (user_has_farm_access(farm_id))
    WITH CHECK (user_has_farm_access(farm_id));

CREATE POLICY "Farm members can delete farm phyto preferences"
    ON public.user_phytosanitary_preferences
    FOR DELETE
    USING (user_has_farm_access(farm_id));

COMMENT ON TABLE public.user_phytosanitary_preferences IS
    'Préférences phytosanitaires au niveau ferme (partagées entre membres). Liste de produits et filtres pour la ferme.';

-- ============================================================================
-- Fin migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 058: Conversions et préférences phyto passées au niveau ferme (RLS partagé).';
END $$;
