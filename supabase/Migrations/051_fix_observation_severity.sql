-- Migration 051: Ajouter colonne severity aux observations
-- Date: 2026-02-05
-- Description: Ajouter colonne severity alignée avec prompt observation_extraction

-- ============================================================================
-- 1. AJOUTER LA COLONNE severity
-- ============================================================================

ALTER TABLE observations 
  ADD COLUMN IF NOT EXISTS severity CHARACTER VARYING DEFAULT 'moyen'
  CHECK (severity IN ('basse', 'moyen', 'haute'));

-- ============================================================================
-- 2. METTRE À JOUR LA CONTRAINTE CHECK DES CATÉGORIES
-- ============================================================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE observations DROP CONSTRAINT IF EXISTS observations_category_check;

-- Migrer les catégories invalides vers des valeurs autorisées (AVANT d'ajouter la contrainte)
UPDATE observations 
SET category = CASE 
  WHEN category IN ('ravageurs', 'maladies', 'carences', 'degats_climatiques', 
                   'degats_materiel', 'humain', 'problemes_sol', 'croissance', 
                   'maturation', 'autre') THEN category
  WHEN category IN ('maladie_ravageur', 'maladie') THEN 'ravageurs'
  ELSE 'autre'
END
WHERE category IS NOT NULL;

-- Ajouter contrainte avec toutes les catégories du prompt observation_extraction
ALTER TABLE observations 
  ADD CONSTRAINT observations_category_check 
  CHECK (category IN (
    'ravageurs',
    'maladies', 
    'carences',
    'degats_climatiques',
    'degats_materiel',
    'humain',
    'problemes_sol',
    'croissance',
    'maturation',
    'autre'
  ));

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
DECLARE
  severity_col_exists BOOLEAN;
BEGIN
  -- Vérifier que severity existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'observations' 
      AND column_name = 'severity'
  ) INTO severity_col_exists;
  
  IF severity_col_exists THEN
    RAISE NOTICE '✅ Colonne severity ajoutée avec succès';
  ELSE
    RAISE WARNING '⚠️ Erreur: colonne severity non créée';
  END IF;
END $$;
