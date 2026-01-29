-- Migration 009: Système de Soft Delete Conforme au Guide
-- Implémentation complète du soft delete selon SOFT_DELETE_SYSTEM_GUIDE.md

-- ========================================
-- CONVERSIONS - Table principale
-- ========================================

-- Créer la table des conversions si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('recolte', 'intrant', 'custom')),
  from_unit VARCHAR(100) NOT NULL,
  to_unit VARCHAR(100) NOT NULL,
  factor DECIMAL(10,4) NOT NULL CHECK (factor > 0),
  description TEXT,
  culture_id INTEGER REFERENCES cultures(id) ON DELETE SET NULL,
  variety_id INTEGER REFERENCES culture_varieties(id) ON DELETE SET NULL,
  container_id INTEGER REFERENCES containers(id) ON DELETE SET NULL,
  slugs TEXT[] DEFAULT '{}',
  -- ✅ SOFT DELETE CONFORME AU GUIDE
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Métadonnées
  user_id uuid NOT NULL,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances (conforme au guide)
CREATE INDEX IF NOT EXISTS idx_user_conversions_is_active ON user_conversions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_conversions_farm_active ON user_conversions(farm_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_conversions_category_active ON user_conversions(category, is_active);

-- ========================================
-- LEGACY TABLE - Migration
-- ========================================

-- Ajouter is_active à l'ancienne table si elle existe
ALTER TABLE user_conversion_units 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index pour l'ancienne table
CREATE INDEX IF NOT EXISTS idx_user_conversion_units_is_active ON user_conversion_units(is_active);

-- ========================================
-- AUTRES TABLES - Soft Delete
-- ========================================

-- Cultures
ALTER TABLE cultures 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Variétés de cultures
ALTER TABLE culture_varieties 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Contenants
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_cultures_is_active ON cultures(is_active);
CREATE INDEX IF NOT EXISTS idx_culture_varieties_is_active ON culture_varieties(is_active);
CREATE INDEX IF NOT EXISTS idx_containers_is_active ON containers(is_active);

-- ========================================
-- TRIGGER pour updated_at
-- ========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour user_conversions
DROP TRIGGER IF EXISTS update_user_conversions_updated_at ON user_conversions;
CREATE TRIGGER update_user_conversions_updated_at 
    BEFORE UPDATE ON user_conversions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS (Row Level Security)
-- ========================================

-- Activer RLS sur user_conversions
ALTER TABLE user_conversions ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les conversions de sa ferme (actives et inactives)
CREATE POLICY "Conversions visibles par les membres de la ferme" ON user_conversions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = user_conversions.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

-- Politique pour créer des conversions
CREATE POLICY "Création conversions par les membres" ON user_conversions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM farm_members 
      WHERE farm_members.farm_id = user_conversions.farm_id 
      AND farm_members.user_id = auth.uid() 
      AND farm_members.is_active = true
    )
  );

-- Politique pour modifier ses conversions (y compris soft delete)
CREATE POLICY "Modification conversions par le créateur" ON user_conversions
  FOR UPDATE USING (user_id = auth.uid());

-- ========================================
-- DONNÉES D'EXEMPLE (optionnel)
-- ========================================

-- Insérer quelques conversions d'exemple si la table est vide
INSERT INTO user_conversions (name, category, from_unit, to_unit, factor, description, user_id, farm_id, is_active)
SELECT 
  'Caisse tomate standard',
  'recolte',
  'caisse',
  'kg',
  10.0,
  'Caisse plastique standard de tomates',
  '00000000-0000-0000-0000-000000000000'::uuid,
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM user_conversions LIMIT 1);

-- ========================================
-- COMMENTAIRES POUR LA DOCUMENTATION
-- ========================================

COMMENT ON TABLE user_conversions IS 'Table des conversions utilisateur avec soft delete conforme au guide SOFT_DELETE_SYSTEM_GUIDE.md';
COMMENT ON COLUMN user_conversions.is_active IS 'Soft delete: true=actif, false=inactif (conservé pour historique)';
COMMENT ON INDEX idx_user_conversions_is_active IS 'Index pour filtrage rapide actif/inactif';
COMMENT ON INDEX idx_user_conversions_farm_active IS 'Index composite pour requêtes par ferme et statut';
