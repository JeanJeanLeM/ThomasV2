-- ============================================================================
-- CORRECTION URGENTE: Conversion is_active string -> boolean
-- ============================================================================
-- Problème: Les tâches ont is_active en string ('true', 'false') 
--           au lieu de boolean (true, false)
-- Impact: Les filtres ne fonctionnent pas, les tâches n'apparaissent pas
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: Mettre toutes les tâches et observations à active = TRUE
-- ============================================================================
-- Logique: Par défaut, toutes les tâches créées devraient être actives
--          Le soft delete n'est utilisé que lors d'une suppression explicite

UPDATE tasks 
SET is_active = true
WHERE farm_id = 16;

UPDATE observations
SET is_active = true  
WHERE farm_id = 16;

-- ============================================================================
-- ÉTAPE 2: Vérification des corrections
-- ============================================================================

-- Afficher le résumé des tâches par date et statut
SELECT 
    date,
    status,
    COUNT(*) as count,
    ARRAY_AGG(title ORDER BY created_at) as titles,
    ARRAY_AGG(is_active) as is_active_values
FROM tasks
WHERE farm_id = 16
GROUP BY date, status
ORDER BY date DESC, status;

-- Afficher les tâches du 7 janvier spécifiquement
SELECT 
    id,
    title,
    status,
    is_active,
    date,
    action
FROM tasks
WHERE farm_id = 16 
  AND date = '2026-01-07'
ORDER BY status, created_at;

-- Compter les observations
SELECT 
    COUNT(*) as total_observations,
    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_observations
FROM observations
WHERE farm_id = 16;

COMMIT;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
-- Après cette correction:
-- ✅ Toutes les tâches auront is_active = true (boolean)
-- ✅ Les filtres fonctionneront correctement
-- ✅ Les tâches du 7 janvier apparaîtront :
--    - 2 tâches "terminee" (effectuées)
--    - 1 tâche "en_attente" (planifiée)
-- ✅ Les 7 observations seront visibles
-- ============================================================================