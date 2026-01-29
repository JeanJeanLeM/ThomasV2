-- Fix conflit intent_classification
-- Date: 07/01/2026
-- Context: Deux prompts intent_classification actifs causent des erreurs de classification

-- Désactiver le prompt v1.0 (trop court, basique)
UPDATE chat_prompts 
SET is_active = false 
WHERE name = 'intent_classification' 
  AND version = '1.0';

-- Vérifier que seul v2.1 reste actif
SELECT 
  id,
  name,
  version,
  is_active,
  LENGTH(content) as content_length,
  created_at
FROM chat_prompts 
WHERE name = 'intent_classification'
ORDER BY version DESC;
