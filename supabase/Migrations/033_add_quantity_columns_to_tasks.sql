-- ============================================================================
-- Migration 033: Ajout colonnes quantité dédiées dans tasks
-- ============================================================================
-- Description: Ajoute des colonnes structurées pour les quantités au lieu
--              de les stocker uniquement dans notes
-- Date: 2026-01-07
-- ============================================================================

-- Ajout des colonnes de quantité
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS quantity_value NUMERIC,
ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS quantity_converted_value NUMERIC,
ADD COLUMN IF NOT EXISTS quantity_converted_unit VARCHAR(50);

-- Commentaires pour documentation
COMMENT ON COLUMN tasks.quantity_value IS 'Valeur de la quantité utilisateur (ex: 3 pour "3 caisses")';
COMMENT ON COLUMN tasks.quantity_unit IS 'Unité de la quantité utilisateur (ex: "caisses", "kg", "L")';
COMMENT ON COLUMN tasks.quantity_converted_value IS 'Valeur convertie en unité universelle (ex: 15 pour "15 kg" si 1 caisse = 5 kg)';
COMMENT ON COLUMN tasks.quantity_converted_unit IS 'Unité universelle de conversion (ex: "kg", "L")';

-- Index pour améliorer les requêtes sur les quantités
CREATE INDEX IF NOT EXISTS idx_tasks_quantity_value ON tasks(quantity_value) WHERE quantity_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_quantity_unit ON tasks(quantity_unit) WHERE quantity_unit IS NOT NULL;

-- Log de la migration
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 033 appliquée: Colonnes quantité ajoutées à tasks';
  RAISE NOTICE '📊 Nouvelles colonnes:';
  RAISE NOTICE '   - quantity_value (NUMERIC)';
  RAISE NOTICE '   - quantity_unit (VARCHAR 50)';
  RAISE NOTICE '   - quantity_converted_value (NUMERIC)';
  RAISE NOTICE '   - quantity_converted_unit (VARCHAR 50)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Les quantités sont maintenant stockées structurées';
  RAISE NOTICE '   au lieu d''être dans le champ notes uniquement';
END $$;

