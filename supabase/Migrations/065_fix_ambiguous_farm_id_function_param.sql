-- Migration 065: Fix ambiguous farm_id — function parameter + RLS policies
-- Date: 2026-02-13
-- Erreur 42702 "column reference farm_id is ambiguous" sur GET invoices/customers.
-- Cause possible: paramètre de fonction user_has_farm_access(farm_id) en conflit
-- avec la colonne lors de l'évaluation RLS. Ce script est idempotent.
-- PostgreSQL n'autorise pas de renommer un paramètre avec CREATE OR REPLACE :
-- il faut DROP FUNCTION avant, donc on drop d'abord toutes les policies qui en dépendent.

-- ============================================================================
-- 0. Supprimer toutes les policies qui utilisent user_has_farm_access
--    (tables optionnelles 004 : seulement si la relation existe)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'surface_units') THEN
    DROP POLICY IF EXISTS "Users can access surface units of their farms" ON surface_units;
    DROP POLICY IF EXISTS "farm_access_surface_units" ON surface_units;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    DROP POLICY IF EXISTS "Users can access their farm chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "farm_access_chat_sessions" ON chat_sessions;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'observations') THEN
    DROP POLICY IF EXISTS "Users can access their farm observations" ON observations;
    DROP POLICY IF EXISTS "farm_access_observations" ON observations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'planned_tasks') THEN
    DROP POLICY IF EXISTS "Users can access their farm planned tasks" ON planned_tasks;
  END IF;
END $$;

-- user_conversion_units
DROP POLICY IF EXISTS "Farm members can access farm conversion units" ON public.user_conversion_units;
DROP POLICY IF EXISTS "Users can access their conversion units" ON public.user_conversion_units;
-- user_phytosanitary_preferences
DROP POLICY IF EXISTS "Farm members can read farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can insert farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can update farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can delete farm phyto preferences" ON public.user_phytosanitary_preferences;
-- commerce / facturation
DROP POLICY IF EXISTS "Farm members can access seller_info" ON seller_info;
DROP POLICY IF EXISTS "Farm members can access customers" ON customers;
DROP POLICY IF EXISTS "Farm members can access suppliers" ON suppliers;
DROP POLICY IF EXISTS "Farm members can access products" ON products;
DROP POLICY IF EXISTS "Farm members can access invoices" ON invoices;
DROP POLICY IF EXISTS "Farm members can access invoice_lines" ON invoice_lines;

-- ============================================================================
-- 1. Supprimer la fonction puis la recréer avec paramètre p_farm_id
-- ============================================================================

DROP FUNCTION IF EXISTS user_has_farm_access(integer);

CREATE OR REPLACE FUNCTION user_has_farm_access(p_farm_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM farms f
        WHERE f.id = p_farm_id AND (
            f.owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM farm_members fm
                WHERE fm.farm_id = p_farm_id
                AND fm.user_id = auth.uid()
                AND fm.is_active = true
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_has_farm_access(INTEGER) IS 'Vérifie que l''utilisateur courant a accès à la ferme (propriétaire ou membre actif). Paramètre p_farm_id pour éviter ambiguïté 42702 en RLS.';

-- ============================================================================
-- 2. RLS policies : qualifier table.farm_id (commerce + facturation)
-- ============================================================================

-- seller_info
DROP POLICY IF EXISTS "Farm members can access seller_info" ON seller_info;
CREATE POLICY "Farm members can access seller_info"
  ON seller_info FOR ALL
  USING (user_has_farm_access(seller_info.farm_id))
  WITH CHECK (user_has_farm_access(seller_info.farm_id));

-- customers
DROP POLICY IF EXISTS "Farm members can access customers" ON customers;
CREATE POLICY "Farm members can access customers"
  ON customers FOR ALL
  USING (user_has_farm_access(customers.farm_id))
  WITH CHECK (user_has_farm_access(customers.farm_id));

-- suppliers
DROP POLICY IF EXISTS "Farm members can access suppliers" ON suppliers;
CREATE POLICY "Farm members can access suppliers"
  ON suppliers FOR ALL
  USING (user_has_farm_access(suppliers.farm_id))
  WITH CHECK (user_has_farm_access(suppliers.farm_id));

-- products
DROP POLICY IF EXISTS "Farm members can access products" ON products;
CREATE POLICY "Farm members can access products"
  ON products FOR ALL
  USING (user_has_farm_access(products.farm_id))
  WITH CHECK (user_has_farm_access(products.farm_id));

-- invoices
DROP POLICY IF EXISTS "Farm members can access invoices" ON invoices;
CREATE POLICY "Farm members can access invoices"
  ON invoices FOR ALL
  USING (user_has_farm_access(invoices.farm_id))
  WITH CHECK (user_has_farm_access(invoices.farm_id));

-- invoice_lines
DROP POLICY IF EXISTS "Farm members can access invoice_lines" ON invoice_lines;
CREATE POLICY "Farm members can access invoice_lines"
  ON invoice_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_lines.invoice_id
        AND user_has_farm_access(i.farm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_lines.invoice_id
        AND user_has_farm_access(i.farm_id)
    )
  );

-- ============================================================================
-- 3. Policies avec farm_id qualifié (user_conversion_units, user_phytosanitary_preferences)
-- ============================================================================

-- user_conversion_units
DROP POLICY IF EXISTS "Farm members can access farm conversion units" ON public.user_conversion_units;
CREATE POLICY "Farm members can access farm conversion units"
    ON public.user_conversion_units
    FOR ALL
    USING (user_has_farm_access(user_conversion_units.farm_id))
    WITH CHECK (user_has_farm_access(user_conversion_units.farm_id));

-- user_phytosanitary_preferences
DROP POLICY IF EXISTS "Farm members can read farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can insert farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can update farm phyto preferences" ON public.user_phytosanitary_preferences;
DROP POLICY IF EXISTS "Farm members can delete farm phyto preferences" ON public.user_phytosanitary_preferences;

CREATE POLICY "Farm members can read farm phyto preferences"
    ON public.user_phytosanitary_preferences FOR SELECT
    USING (user_has_farm_access(user_phytosanitary_preferences.farm_id));

CREATE POLICY "Farm members can insert farm phyto preferences"
    ON public.user_phytosanitary_preferences FOR INSERT
    WITH CHECK (user_has_farm_access(user_phytosanitary_preferences.farm_id));

CREATE POLICY "Farm members can update farm phyto preferences"
    ON public.user_phytosanitary_preferences FOR UPDATE
    USING (user_has_farm_access(user_phytosanitary_preferences.farm_id))
    WITH CHECK (user_has_farm_access(user_phytosanitary_preferences.farm_id));

CREATE POLICY "Farm members can delete farm phyto preferences"
    ON public.user_phytosanitary_preferences FOR DELETE
    USING (user_has_farm_access(user_phytosanitary_preferences.farm_id));

-- ============================================================================
-- 4. Recreate policies (004) : surface_units, chat_sessions, observations, planned_tasks
--    Uniquement si les tables existent (certains projets n'ont pas planned_tasks)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'surface_units') THEN
    CREATE POLICY "Users can access surface units of their farms"
      ON surface_units FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM plots p
          WHERE p.id = surface_units.plot_id AND user_has_farm_access(p.farm_id)
        )
      );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    CREATE POLICY "Users can access their farm chat sessions"
      ON chat_sessions FOR ALL
      USING (user_id = auth.uid() AND user_has_farm_access(chat_sessions.farm_id));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'observations') THEN
    CREATE POLICY "Users can access their farm observations"
      ON observations FOR ALL
      USING (user_id = auth.uid() AND user_has_farm_access(observations.farm_id));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'planned_tasks') THEN
    CREATE POLICY "Users can access their farm planned tasks"
      ON planned_tasks FOR ALL
      USING (user_id = auth.uid() AND user_has_farm_access(planned_tasks.farm_id));
  END IF;
END $$;

-- ============================================================================
-- Vérification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '065: user_has_farm_access(p_farm_id) + RLS policies avec table.farm_id (commerce, facturation, conversions, phyto).';
END $$;
