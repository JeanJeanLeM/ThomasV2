-- ============================================================================
-- Migration 032: Ajout champs nature et type de quantité
-- ============================================================================
-- Description: Ajoute quantity_nature et quantity_type à la table tasks
--              pour mieux qualifier les quantités (compost, bouillie, etc.)
-- Date: 2026-01-07
-- ============================================================================

-- Ajout des nouveaux champs
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS quantity_nature VARCHAR(200),
ADD COLUMN IF NOT EXISTS quantity_type VARCHAR(50);

-- Commentaires pour documentation
COMMENT ON COLUMN tasks.quantity_nature IS 'Nature spécifique de la quantité (ex: compost, bouillie bordelaise, tomates, plants de laitue)';
COMMENT ON COLUMN tasks.quantity_type IS 'Type de quantité: engrais, produit_phyto, recolte, plantation, vente';

-- Ajouter une contrainte CHECK pour quantity_type
ALTER TABLE tasks
ADD CONSTRAINT tasks_quantity_type_check 
CHECK (quantity_type IS NULL OR quantity_type IN (
  'engrais',
  'produit_phyto',
  'recolte',
  'plantation',
  'vente',
  'autre'
));

-- Index pour améliorer les requêtes par type
CREATE INDEX IF NOT EXISTS idx_tasks_quantity_type ON tasks(quantity_type) WHERE quantity_type IS NOT NULL;

-- Log de la migration
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 032 appliquée: Ajout quantity_nature et quantity_type';
  RAISE NOTICE '📊 Nouveaux champs dans table tasks:';
  RAISE NOTICE '   - quantity_nature: Nature spécifique (compost, bouillie, etc.)';
  RAISE NOTICE '   - quantity_type: Type (engrais, produit_phyto, recolte, plantation, vente)';
END $$;

