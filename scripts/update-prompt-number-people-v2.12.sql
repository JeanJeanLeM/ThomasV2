-- Mise à jour du prompt thomas_agent_system v2.12
-- Amélioration chirurgicale de la détection du nombre de personnes
-- Problème: "avec un stagiaire" détecté comme 1 personne au lieu de 2
-- Solution: Clarifier la règle pour que "avec [personne]" = utilisateur + personne(s)

-- Vérifier que le prompt v2.11 existe
DO $$
DECLARE
  prompt_exists BOOLEAN;
  old_text TEXT;
  new_text TEXT;
BEGIN
  -- Vérifier existence
  SELECT EXISTS(
    SELECT 1 FROM chat_prompts 
    WHERE name = 'thomas_agent_system' AND version = '2.11'
  ) INTO prompt_exists;
  
  IF NOT prompt_exists THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.11 non trouvé. Veuillez vérifier la version actuelle.';
  END IF;
  
  RAISE NOTICE '✅ Prompt v2.11 trouvé, création de la version 2.12...';
END $$;

-- Récupérer le prompt actuel v2.11 et créer v2.12 avec amélioration
INSERT INTO chat_prompts (name, content, examples, version, is_active, metadata)
SELECT 
  name,
  -- Amélioration chirurgicale: remplacer uniquement la ligne number_of_people
  -- Supporte plusieurs variantes de la ligne pour robustesse
  CASE 
    -- Variante 1: avec "détecter"
    WHEN content LIKE '%number_of_people%: Nombre de personnes (1 par défaut, détecter "seul"=1, "avec quelqu''un"=2, "équipe"=3+, "stagiaire"=+1)%' THEN
      REPLACE(
        content,
        '- **number_of_people**: Nombre de personnes (1 par défaut, détecter "seul"=1, "avec quelqu''un"=2, "équipe"=3+, "stagiaire"=+1)',
        '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)'
      )
    -- Variante 2: sans "détecter"
    WHEN content LIKE '%number_of_people%: Nombre de personnes (1 par défaut, "seul"=1, "avec quelqu''un"=2, "équipe"=3+, "stagiaire"=+1)%' THEN
      REPLACE(
        content,
        '- **number_of_people**: Nombre de personnes (1 par défaut, "seul"=1, "avec quelqu''un"=2, "équipe"=3+, "stagiaire"=+1)',
        '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)'
      )
    -- Fallback: utiliser regex pour trouver et remplacer
    ELSE
      regexp_replace(
        content,
        '- \*\*number_of_people\*\*: Nombre de personnes \([^)]+\)',
        '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)',
        'g'
      )
  END as content,
  examples,
  '2.12',
  true,
  jsonb_build_object(
    'previous_version', version,
    'updated_at', NOW(),
    'change_type', 'surgical_improvement',
    'improvement', 'Clarification détection nombre de personnes: "avec [personne]" = utilisateur + personne(s)'
  )
FROM chat_prompts
WHERE name = 'thomas_agent_system' 
  AND version = '2.11'
LIMIT 1;

-- Désactiver l'ancienne version
UPDATE chat_prompts 
SET is_active = false
WHERE name = 'thomas_agent_system' 
  AND version = '2.11';

-- Vérification
SELECT 
  name, 
  version, 
  is_active,
  length(content) as content_length,
  CASE 
    WHEN content LIKE '%"avec [personne]"=2%' THEN '✅ Amélioration appliquée'
    ELSE '❌ Amélioration non trouvée'
  END as verification
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
  AND version = '2.12';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Prompt thomas_agent_system mis à jour en v2.12 avec amélioration détection nombre de personnes !';
  RAISE NOTICE '📝 Changement: "avec [personne]" = utilisateur + personne(s) maintenant explicite';
END $$;
