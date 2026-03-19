-- Migration 064: Fix ambiguous farm_id (RLS + function parameter)
-- Date: 2026-02-13
-- Erreur 42702: "column reference farm_id is ambiguous" sur customers/invoices
-- (GET 400, INSERT 400). Cause: policies avec farm_id non qualifié + paramètre
-- de fonction homonyme. Ce script est idempotent.

-- ============================================================================
-- 1. Fonction user_has_farm_access : inchangée (signature farm_id INTEGER)
--    On ne DROP pas : trop de policies en dépendent. Le correctif est uniquement
--    les policies RLS avec table.farm_id qualifié ci-dessous.
-- ============================================================================
-- (aucune modification de la fonction)

-- ============================================================================
-- 2. RLS policies : qualifier explicitement table.farm_id (invariants avec 063)
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

-- invoice_lines (déjà qualifié i.farm_id, on garde tel quel)
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
-- Vérification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '064: user_has_farm_access(p_farm_id) + RLS policies farm_id qualifiées (customers, invoices, etc.)';
END $$;
