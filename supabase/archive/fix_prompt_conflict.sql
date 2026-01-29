-- Désactiver tous les anciens prompts thomas_agent_system sauf la version 2.2
UPDATE public.chat_prompts 
SET is_active = false 
WHERE name = 'thomas_agent_system' 
  AND version != '2.2';

-- Vérifier que seule la version 2.2 est active
SELECT 
  name,
  version,
  is_active,
  created_at,
  CASE 
    WHEN content LIKE '%EXTRAIRE TOUJOURS le problème spécifique dans "issue"%' THEN 'Contient fix issue'
    ELSE 'Ne contient pas fix issue'
  END as has_issue_fix
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
  AND is_active = true
ORDER BY version DESC;
