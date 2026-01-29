-- Migration: Nettoyage Simple des Tâches Dupliquées
-- Date: 2026-01-08
-- Description: Désactiver les tâches en double créées lors de l'édition d'actions

-- ============================================================================
-- ÉTAPE 1: IDENTIFIER LES DOUBLONS
-- ============================================================================

-- Trouver les tâches avec le même titre, créées dans les 60 secondes
-- (Signe d'une édition qui a créé un doublon)
WITH duplicate_groups AS (
  SELECT 
    t1.id as old_task_id,
    t1.title,
    t1.action,
    t1.plants,
    t1.created_at as old_created_at,
    t2.id as new_task_id,
    t2.created_at as new_created_at,
    t1.user_id,
    t1.farm_id,
    EXTRACT(EPOCH FROM (t2.created_at - t1.created_at)) as seconds_diff
  FROM tasks t1
  INNER JOIN tasks t2 
    ON t1.user_id = t2.user_id 
    AND t1.farm_id = t2.farm_id
    AND t1.title = t2.title
    AND t1.action = t2.action
    AND t1.plants = t2.plants
    AND t1.status = t2.status
    AND t1.id != t2.id
    AND t2.created_at > t1.created_at  -- t2 est plus récente
    AND t2.created_at - t1.created_at < INTERVAL '60 seconds'
  WHERE t1.is_active = true 
    AND t2.is_active = true
    AND t1.created_at > '2026-01-08'::date  -- Seulement les tâches d'aujourd'hui
)
SELECT 
  old_task_id,
  title as "Titre",
  action as "Action",
  plants as "Cultures",
  old_created_at as "Créée (ancienne)",
  new_created_at as "Créée (nouvelle)",
  ROUND(seconds_diff::numeric, 1) as "Écart (secondes)"
FROM duplicate_groups
ORDER BY new_created_at DESC;

-- ============================================================================
-- ÉTAPE 2: DÉSACTIVER LES ANCIENNES TÂCHES (DÉCOMMENTER POUR EXÉCUTER)
-- ============================================================================

/*
-- Désactiver les anciennes tâches en double
WITH duplicate_groups AS (
  SELECT 
    t1.id as old_task_id
  FROM tasks t1
  INNER JOIN tasks t2 
    ON t1.user_id = t2.user_id 
    AND t1.farm_id = t2.farm_id
    AND t1.title = t2.title
    AND t1.action = t2.action
    AND t1.plants = t2.plants
    AND t1.status = t2.status
    AND t1.id != t2.id
    AND t2.created_at > t1.created_at
    AND t2.created_at - t1.created_at < INTERVAL '60 seconds'
  WHERE t1.is_active = true 
    AND t2.is_active = true
    AND t1.created_at > '2026-01-08'::date
)
UPDATE tasks
SET 
  is_active = false,
  updated_at = NOW(),
  notes = COALESCE(notes, '') || E'\n[AUTO-DÉSACTIVÉ le ' || NOW()::date || '] Doublon créé lors d''une édition'
WHERE id IN (SELECT old_task_id FROM duplicate_groups);

-- Afficher le résultat
SELECT 
  id,
  title,
  created_at,
  is_active
FROM tasks
WHERE notes LIKE '%AUTO-DÉSACTIVÉ%'
  AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
*/

-- ============================================================================
-- VÉRIFICATION : Compter les tâches actives par titre
-- ============================================================================

SELECT 
  title as "Titre",
  action as "Action",
  COUNT(*) as "Nombre de tâches actives",
  STRING_AGG(id::text, ', ' ORDER BY created_at) as "IDs",
  MIN(created_at) as "Première créée",
  MAX(created_at) as "Dernière créée"
FROM tasks
WHERE is_active = true
  AND created_at > '2026-01-08'::date
GROUP BY title, action
HAVING COUNT(*) > 1  -- Seulement les doublons
ORDER BY "Nombre de tâches actives" DESC, "Dernière créée" DESC;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

-- 1. Exécutez la première requête (ÉTAPE 1) pour voir les doublons
-- 2. Vérifiez que les tâches identifiées sont bien des doublons
-- 3. Si oui, décommentez et exécutez la requête de l'ÉTAPE 2
-- 4. Vérifiez le résultat avec la requête de VÉRIFICATION