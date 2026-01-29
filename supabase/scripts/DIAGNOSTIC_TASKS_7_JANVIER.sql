-- ============================================================================
-- Script de diagnostic - Tâches du 7 janvier 2026
-- ============================================================================
-- Objectif: Vérifier exactement ce qui se trouve dans la base de données
-- ============================================================================

-- Afficher toutes les tâches du 7 janvier 2026
SELECT 
    id,
    title,
    date,
    status,
    type as db_type,
    is_active,
    pg_typeof(is_active) as is_active_type,
    action,
    plants,
    created_at,
    updated_at
FROM tasks
WHERE farm_id = 16 
  AND date = '2026-01-07'
ORDER BY status, created_at;

-- Compter les tâches par statut pour le 7 janvier
SELECT 
    status,
    COUNT(*) as count,
    ARRAY_AGG(title) as titles,
    ARRAY_AGG(is_active) as is_active_values
FROM tasks
WHERE farm_id = 16 
  AND date = '2026-01-07'
GROUP BY status;

-- Afficher toutes les tâches actives du 7 janvier (selon notre filtre)
SELECT 
    id,
    title,
    status,
    is_active,
    date
FROM tasks
WHERE farm_id = 16 
  AND date = '2026-01-07'
  AND is_active = true;

-- Compter toutes les tâches de la ferme 16
SELECT 
    COUNT(*) as total_tasks,
    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_tasks,
    SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_tasks,
    SUM(CASE WHEN status = 'terminee' THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN status = 'en_attente' THEN 1 ELSE 0 END) as planned_tasks,
    SUM(CASE WHEN status = 'en_cours' THEN 1 ELSE 0 END) as in_progress_tasks
FROM tasks
WHERE farm_id = 16;

-- Afficher les observations du 7 janvier
SELECT 
    id,
    title,
    category,
    is_active,
    DATE(created_at AT TIME ZONE 'Europe/Paris') as date_created,
    created_at
FROM observations
WHERE farm_id = 16 
  AND DATE(created_at AT TIME ZONE 'Europe/Paris') = '2026-01-07'
ORDER BY created_at;

-- Vérifier les types de données
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name IN ('status', 'is_active', 'date', 'type')
ORDER BY column_name;
