-- Migration 063: Fix ambiguous farm_id in RLS policies
-- Date: 2026-02-13
-- Description: PostgreSQL erreur 42702 "column reference farm_id is ambiguous"
--   quand PostgREST joint des tables (ex: invoices + customers/suppliers via FK).
--   Qualifier explicitement: table.farm_id

-- ============================================================================
-- 1. invoices
-- ============================================================================

DROP POLICY IF EXISTS "Farm members can access invoices" ON invoices;

CREATE POLICY "Farm members can access invoices"
  ON invoices FOR ALL
  USING (user_has_farm_access(invoices.farm_id))
  WITH CHECK (user_has_farm_access(invoices.farm_id));

-- ============================================================================
-- 2. seller_info, customers, suppliers, products (cohérence)
-- ============================================================================

DROP POLICY IF EXISTS "Farm members can access seller_info" ON seller_info;
CREATE POLICY "Farm members can access seller_info"
  ON seller_info FOR ALL
  USING (user_has_farm_access(seller_info.farm_id))
  WITH CHECK (user_has_farm_access(seller_info.farm_id));

DROP POLICY IF EXISTS "Farm members can access customers" ON customers;
CREATE POLICY "Farm members can access customers"
  ON customers FOR ALL
  USING (user_has_farm_access(customers.farm_id))
  WITH CHECK (user_has_farm_access(customers.farm_id));

DROP POLICY IF EXISTS "Farm members can access suppliers" ON suppliers;
CREATE POLICY "Farm members can access suppliers"
  ON suppliers FOR ALL
  USING (user_has_farm_access(suppliers.farm_id))
  WITH CHECK (user_has_farm_access(suppliers.farm_id));

DROP POLICY IF EXISTS "Farm members can access products" ON products;
CREATE POLICY "Farm members can access products"
  ON products FOR ALL
  USING (user_has_farm_access(products.farm_id))
  WITH CHECK (user_has_farm_access(products.farm_id));

-- ============================================================================
-- Vérification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 063: Policies facturation - farm_id qualifié (table.farm_id)';
END $$;
