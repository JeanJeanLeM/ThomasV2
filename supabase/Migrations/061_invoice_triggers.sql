-- Migration 061: Triggers et RLS pour facturation
-- Date: 2026-02-11
-- Description: Numérotation automatique factures, RLS policies

-- ============================================================================
-- 1. Fonction et trigger numérotation factures
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INTEGER;
  year_prefix VARCHAR(4);
BEGIN
  IF NEW.invoice_number IS NULL OR TRIM(NEW.invoice_number) = '' THEN
    year_prefix := EXTRACT(YEAR FROM NEW.invoice_date)::TEXT;
    SELECT COALESCE(MAX(SPLIT_PART(invoice_number, '-', 2)::INTEGER), 0) + 1
    INTO next_seq
    FROM invoices
    WHERE farm_id = NEW.farm_id
      AND invoice_number ~ ('^' || year_prefix || '-\d+$');
    IF next_seq IS NULL THEN
      next_seq := 1;
    END IF;
    NEW.invoice_number := year_prefix || '-' || LPAD(next_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ============================================================================
-- 2. Trigger recalcul totaux facture après modification lignes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    total_ht = (SELECT COALESCE(SUM(total_ht), 0) FROM invoice_lines WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    total_vat = (SELECT COALESCE(SUM(total_vat), 0) FROM invoice_lines WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    total_ttc = (SELECT COALESCE(SUM(total_ttc), 0) FROM invoice_lines WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoice_totals_on_line_change ON invoice_lines;
CREATE TRIGGER update_invoice_totals_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- ============================================================================
-- 3. RLS - Activer sur toutes les tables facturation
-- ============================================================================

ALTER TABLE seller_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

-- seller_info
CREATE POLICY "Farm members can access seller_info"
  ON seller_info FOR ALL
  USING (user_has_farm_access(farm_id))
  WITH CHECK (user_has_farm_access(farm_id));

-- customers
CREATE POLICY "Farm members can access customers"
  ON customers FOR ALL
  USING (user_has_farm_access(farm_id))
  WITH CHECK (user_has_farm_access(farm_id));

-- suppliers
CREATE POLICY "Farm members can access suppliers"
  ON suppliers FOR ALL
  USING (user_has_farm_access(farm_id))
  WITH CHECK (user_has_farm_access(farm_id));

-- products
CREATE POLICY "Farm members can access products"
  ON products FOR ALL
  USING (user_has_farm_access(farm_id))
  WITH CHECK (user_has_farm_access(farm_id));

-- invoices
CREATE POLICY "Farm members can access invoices"
  ON invoices FOR ALL
  USING (user_has_farm_access(farm_id))
  WITH CHECK (user_has_farm_access(farm_id));

-- invoice_lines (via invoice)
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
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 061: Triggers numérotation et RLS facturation appliqués';
END $$;
