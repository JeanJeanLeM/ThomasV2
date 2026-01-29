-- ============================================================================
-- Migration 033: Ajout colonne phytosanitary_product_amm à la table tasks
-- ============================================================================
-- Description: Ajoute une colonne pour stocker l'AMM du produit phytosanitaire
--              utilisé dans une tâche, permettant le matching avec la table
--              phytosanitary_products tout en gardant le nom dans quantity_nature
-- Date: 2026-01-22
-- ============================================================================

-- Ajout de la colonne phytosanitary_product_amm
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS phytosanitary_product_amm TEXT;

-- Ajout de la contrainte FOREIGN KEY vers phytosanitary_products
-- ON DELETE SET NULL : si le produit est supprimé, garder la tâche mais mettre AMM à NULL
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_phytosanitary_product_amm_fkey 
FOREIGN KEY (phytosanitary_product_amm) 
REFERENCES public.phytosanitary_products(amm) 
ON DELETE SET NULL;

-- Index pour améliorer les performances des requêtes de filtrage par produit
CREATE INDEX IF NOT EXISTS idx_tasks_phytosanitary_product_amm 
ON public.tasks(phytosanitary_product_amm) 
WHERE phytosanitary_product_amm IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN public.tasks.phytosanitary_product_amm IS 
    'AMM (Autorisation de Mise sur le Marché) du produit phytosanitaire utilisé. 
     Rempli uniquement si quantity_type = ''produit_phyto''. 
     Permet le matching avec phytosanitary_products. 
     Le nom du produit reste dans quantity_nature pour l''affichage utilisateur.';

-- Log de la migration
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migration 033 appliquée: Ajout phytosanitary_product_amm à tasks';
  RAISE NOTICE '📊 Nouvelle colonne dans table tasks:';
  RAISE NOTICE '   - phytosanitary_product_amm: AMM du produit phytosanitaire (FK vers phytosanitary_products)';
  RAISE NOTICE '   - Index créé pour performance';
  RAISE NOTICE '   - Foreign key avec ON DELETE SET NULL';
END $$;
