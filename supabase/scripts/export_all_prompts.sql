-- Export complet de tous les prompts thomas_agent_system pour sauvegarde
SELECT 
  name,
  version,
  is_active,
  created_at,
  LENGTH(content) as content_length,
  content,
  examples,
  metadata
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
ORDER BY version DESC, created_at DESC;
