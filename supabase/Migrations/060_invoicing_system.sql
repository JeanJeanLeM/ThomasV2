-- Migration 060: Système de facturation
-- Date: 2026-02-11
-- Description: Tables seller_info, customers, suppliers, products, invoices, invoice_lines

-- ============================================================================
-- 1. TABLE seller_info (informations vendeur)
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID,
  company_name VARCHAR(255) NOT NULL,
  legal_status VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(50) DEFAULT 'France',
  siret VARCHAR(14),
  siren VARCHAR(9),
  vat_number VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  logo_url TEXT,
  vat_not_applicable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(farm_id)
);

-- ============================================================================
-- 2. TABLE customers (clients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(50) DEFAULT 'France',
  siret VARCHAR(14),
  siren VARCHAR(9),
  vat_number VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_farm_id ON customers(farm_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(farm_id, company_name);

-- ============================================================================
-- 3. TABLE suppliers (fournisseurs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(50) DEFAULT 'France',
  siret VARCHAR(14),
  siren VARCHAR(9),
  vat_number VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_farm_id ON suppliers(farm_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(farm_id, company_name);

-- ============================================================================
-- 4. TABLE products (produits commerciaux)
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  culture_id INTEGER REFERENCES cultures(id),
  unit VARCHAR(50) NOT NULL,
  default_price_ht NUMERIC(10,2),
  default_vat_rate NUMERIC(5,2) DEFAULT 5.5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_farm_id ON products(farm_id);
CREATE INDEX IF NOT EXISTS idx_products_culture_id ON products(culture_id);

-- ============================================================================
-- 5. TABLE invoices (factures sortantes ET entrantes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL DEFAULT '',
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice', 'delivery_note', 'invoice_with_delivery')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_location TEXT,
  payment_due_date DATE,
  total_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_vat NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_invoice_counterparty CHECK (
    (direction = 'outgoing' AND customer_id IS NOT NULL AND supplier_id IS NULL) OR
    (direction = 'incoming' AND supplier_id IS NOT NULL AND customer_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_farm_number ON invoices(farm_id, invoice_number) WHERE invoice_number != '';
CREATE INDEX IF NOT EXISTS idx_invoices_farm_id ON invoices(farm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- 6. TABLE invoice_lines (lignes de facture)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  unit_price_ht NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL,
  total_ht NUMERIC(10,2) GENERATED ALWAYS AS (ROUND((quantity * unit_price_ht)::NUMERIC, 2)) STORED,
  total_vat NUMERIC(10,2) GENERATED ALWAYS AS (ROUND((quantity * unit_price_ht * vat_rate / 100)::NUMERIC, 2)) STORED,
  total_ttc NUMERIC(10,2) GENERATED ALWAYS AS (ROUND((quantity * unit_price_ht * (1 + vat_rate / 100))::NUMERIC, 2)) STORED,
  line_order INTEGER DEFAULT 0,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);

-- ============================================================================
-- 7. Triggers updated_at
-- ============================================================================

CREATE TRIGGER update_seller_info_updated_at
  BEFORE UPDATE ON seller_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure update_updated_at_column exists (from 004)
DO $migration060$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $migration060$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $migration060$
BEGIN
  RAISE NOTICE '✅ Migration 060: Tables facturation créées (seller_info, customers, suppliers, products, invoices, invoice_lines)';
END $migration060$;
