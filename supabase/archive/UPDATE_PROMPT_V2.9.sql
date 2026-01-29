-- ============================================================================
-- Script Rapide: Mise à jour du Prompt v2.9 Multi-Cultures
-- ============================================================================
-- Description: Met à jour le prompt v2.9 s'il existe, sinon le crée
-- Usage: Exécuter ce script si vous avez déjà la v2.9 et voulez juste la mettre à jour
-- ============================================================================

-- Option 1: Supprimer et recréer (simple et propre)
DELETE FROM chat_prompts 
WHERE name = 'thomas_agent_system' AND version = '2.9';

-- Désactiver les anciennes versions
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'thomas_agent_system' 
  AND version != '2.9';

-- Puis exécuter la migration 037 complète
-- OU utiliser l'option 2 ci-dessous

-- ============================================================================
-- Option 2: Mise à jour directe (si vous êtes sûr que v2.9 existe)
-- ============================================================================

/*
UPDATE chat_prompts
SET 
  content = '... [contenu du prompt v2.9 de la migration 037] ...',
  is_active = true,
  updated_at = NOW()
WHERE name = 'thomas_agent_system' 
  AND version = '2.9';

-- Désactiver les autres versions
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'thomas_agent_system' 
  AND version != '2.9';
*/

-- ============================================================================
-- Vérification
-- ============================================================================

SELECT 
  name,
  version,
  is_active,
  LENGTH(content) as content_length,
  CASE 
    WHEN content LIKE '%is_multi_crop%' THEN '✅ Contient multi-crop'
    ELSE '❌ Ne contient PAS multi-crop'
  END as multi_crop_check,
  created_at,
  updated_at
FROM chat_prompts
WHERE name = 'thomas_agent_system'
ORDER BY version DESC
LIMIT 5;
