-- Migration: Fix Duplicate Tasks from Action Edits
-- Date: 2026-01-08
-- Description: Désactiver les tâches dupliquées créées lors de l'édition d'actions

-- ============================================================================
-- IDENTIFICATION DES DOUBLONS
-- ============================================================================

-- Trouver les tâches potentiellement dupliquées
-- (même utilisateur, même action, même culture, dates proches)
WITH duplicate_candidates AS (
  SELECT 
    t1.id as task1_id,
    t2.id as task2_id,
    t1.title,
    t1.date as date1,
    t2.date as date2,
    t1.created_at as created1,
    t2.created_at as created2,
    t1.action,
    t1.plants,
    t1.user_id,
    t1.farm_id
  FROM tasks t1
  INNER JOIN tasks t2 
    ON t1.user_id = t2.user_id 
    AND t1.farm_id = t2.farm_id
    AND t1.action = t2.action
    AND t1.plants = t2.plants
    AND t1.id < t2.id  -- Éviter les doublons dans les résultats
    AND ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) < 300  -- Créées à moins de 5 minutes d'intervalle
  WHERE t1.is_active = true 
    AND t2.is_active = true
    AND t1.status = t2.status  -- Même statut (terminee)
    AND t1.title = t2.title    -- Même titre
)
SELECT 
  task1_id as "Ancienne Tâche (à désactiver)",
  task2_id as "Nouvelle Tâche (à garder)",
  title as "Titre",
  date1 as "Date Ancienne",
  date2 as "Date Nouvelle",
  action as "Action",
  plants as "Cultures"
FROM duplicate_candidates
ORDER BY created2 DESC;

-- ============================================================================
-- COMMENTAIRES AVANT APPLICATION
-- ============================================================================

-- ⚠️ VÉRIFICATION MANUELLE REQUISE
-- 
-- 1. Examinez les résultats ci-dessus
-- 2. Identifiez les vrais doublons (même action, créées rapidement l'une après l'autre)
-- 3. Si vous êtes sûr, décommentez et exécutez la commande UPDATE ci-dessous
--
-- Cette requête désactivera automatiquement les anciennes tâches dupliquées
-- en gardant les plus récentes actives.

-- ============================================================================
-- DÉSACTIVATION DES DOUBLONS (À DÉCOMMENTER APRÈS VÉRIFICATION)
-- ============================================================================

/*
WITH duplicate_candidates AS (
  SELECT 
    t1.id as old_task_id,
    t2.id as new_task_id,
    t1.created_at as created1,
    t2.created_at as created2
  FROM tasks t1
  INNER JOIN tasks t2 
    ON t1.user_id = t2.user_id 
    AND t1.farm_id = t2.farm_id
    AND t1.action = t2.action
    AND t1.plants = t2.plants
    AND t1.id < t2.id
    AND ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) < 300
  WHERE t1.is_active = true 
    AND t2.is_active = true
    AND t1.status = t2.status
    AND t1.title = t2.title
)
UPDATE tasks
SET 
  is_active = false,
  updated_at = NOW(),
  notes = COALESCE(notes, '') || E'\n[AUTO-DÉSACTIVÉ] Doublon détecté lors de l''édition d''action'
WHERE id IN (SELECT old_task_id FROM duplicate_candidates);

-- Afficher le résultat
SELECT 
  COUNT(*) as "Tâches désactivées",
  'Doublons supprimés avec succès' as "Status"
FROM tasks 
WHERE notes LIKE '%AUTO-DÉSACTIVÉ%' 
  AND is_active = false
  AND updated_at > NOW() - INTERVAL '1 minute';
*/

-- ============================================================================
-- VÉRIFICATION APRÈS NETTOYAGE
-- ============================================================================

-- Compter les tâches par utilisateur et ferme
SELECT 
  user_id,
  farm_id,
  is_active,
  COUNT(*) as task_count,
  COUNT(CASE WHEN status = 'terminee' THEN 1 END) as completed_count,
  COUNT(CASE WHEN status = 'en_attente' THEN 1 END) as pending_count
FROM tasks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, farm_id, is_active
ORDER BY farm_id, is_active DESC;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

-- Cette migration identifie et désactive les tâches dupliquées créées lors
-- de l'édition d'actions dans le chat.
--
-- Problème résolu:
-- - Avant: Éditer une action créait une nouvelle tâche (doublon)
-- - Après: Éditer une action met à jour la tâche existante
--
-- Cette migration nettoie les doublons créés avant la correction du code.
--
-- Critères de détection de doublons:
-- - Même utilisateur, ferme, action, titre, cultures, statut
-- - Créées à moins de 5 minutes d'intervalle
-- - Garde la plus récente, désactive l'ancienne