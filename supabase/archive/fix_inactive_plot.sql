-- Correction du problème de chargement des parcelles
-- La parcelle "Serre 1" était désactivée (is_active: false)
-- Ce script l'active pour qu'elle apparaisse dans les formulaires

-- Activer la parcelle "Serre 1" qui était désactivée
UPDATE plots 
SET 
  is_active = true,
  updated_at = NOW()
WHERE 
  id = 18 
  AND farm_id = 16 
  AND name = 'Serre 1'
  AND is_active = false;

-- Vérification du résultat
SELECT id, farm_id, name, code, is_active, updated_at 
FROM plots 
WHERE id = 18;

-- Afficher toutes les parcelles de la ferme 16 pour vérification
SELECT id, farm_id, name, code, type, is_active, created_at, updated_at
FROM plots 
WHERE farm_id = 16
ORDER BY name;

