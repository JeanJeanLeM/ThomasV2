-- Migration: Fix Harvest Status
-- Date: 2026-01-08
-- Description: Corriger le statut des récoltes existantes qui sont marquées 'en_attente' au lieu de 'terminee'

-- ============================================================================
-- CORRECTION DES RÉCOLTES EXISTANTES
-- ============================================================================

-- Identifier les récoltes avec un mauvais statut
SELECT 
    id,
    title,
    action,
    status,
    type,
    created_at
FROM tasks 
WHERE action = 'harvest' 
  AND status = 'en_attente'
  AND is_active = true
ORDER BY created_at DESC;

-- Corriger le statut des récoltes
UPDATE tasks 
SET 
    status = 'terminee',
    type = 'tache',
    updated_at = NOW()
WHERE action = 'harvest' 
  AND status = 'en_attente'
  AND is_active = true;

-- Vérification après correction
SELECT 
    COUNT(*) as total_harvest_tasks,
    COUNT(CASE WHEN status = 'terminee' THEN 1 END) as terminee_count,
    COUNT(CASE WHEN status = 'en_attente' THEN 1 END) as en_attente_count,
    COUNT(CASE WHEN type = 'tache' THEN 1 END) as tache_count,
    COUNT(CASE WHEN type = 'autre' THEN 1 END) as autre_count
FROM tasks 
WHERE action = 'harvest' 
  AND is_active = true;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

-- Cette migration corrige le bug identifié dans aiChatService.ts où les récoltes
-- étaient incorrectement marquées avec status='en_attente' au lieu de 'terminee'
-- 
-- Problème original:
-- status: action.action_type === 'task_done' ? 'terminee' : 'en_attente'
-- 
-- Correction appliquée:
-- status: (action.action_type === 'task_done' || action.action_type === 'harvest') ? 'terminee' : 'en_attente'
--
-- Cette migration nettoie les données existantes pour être cohérentes avec le nouveau code.