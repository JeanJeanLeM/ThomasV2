-- Vérifier quelle version du prompt thomas_agent_system est active
SELECT 
  name,
  version,
  is_active,
  created_at,
  LENGTH(content) as content_length,
  CASE 
    WHEN content LIKE '%EXTRAIRE TOUJOURS le problème spécifique dans "issue"%' THEN 'Contient fix issue'
    ELSE 'Ne contient pas fix issue'
  END as has_issue_fix
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
ORDER BY version DESC, created_at DESC;
