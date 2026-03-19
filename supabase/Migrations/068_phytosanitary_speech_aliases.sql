-- ============================================================
-- Migration 068 : Ajout speech_aliases sur phytosanitary_products
--
-- Permet d'associer des alias phonétiques à chaque produit
-- phytosanitaire pour améliorer la post-correction de la
-- dictée Web Speech (ex : "rideau mil" → "Ridomil Gold").
--
-- Niveau produit (pas user-dépendant) : les aliases sont
-- partagés par tous les membres de la ferme qui utilisent
-- ce produit.
-- ============================================================

ALTER TABLE phytosanitary_products
  ADD COLUMN IF NOT EXISTS speech_aliases TEXT[] NOT NULL DEFAULT '{}';

-- Index GIN pour requêtes sur le tableau (optionnel, utile si recherche future)
CREATE INDEX IF NOT EXISTS idx_phyto_speech_aliases
  ON phytosanitary_products USING gin(speech_aliases);

COMMENT ON COLUMN phytosanitary_products.speech_aliases IS
  'Alias phonétiques pour la correction de la dictée Web Speech. '
  'Exemple : ["rideau mil", "rido mil"] pour le produit Ridomil Gold. '
  'Insensibles à la casse lors de l''application.';
