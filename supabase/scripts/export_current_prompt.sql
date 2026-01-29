-- Export du prompt thomas_agent_system actuel pour analyse
-- Date: 07/01/2026
-- Contexte: Fix classification actions agricoles vs demandes d'aide

SELECT 
  name,
  version,
  is_active,
  created_at,
  LENGTH(content) as content_length,
  content
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
  AND is_active = true
ORDER BY version DESC
LIMIT 1;
