-- Mise à jour du prompt thomas_agent_system v2.12 (CORRIGÉ)
-- Amélioration chirurgicale de la détection du nombre de personnes
-- Problème: "avec un stagiaire" détecté comme 1 personne au lieu de 2
-- Solution: Clarifier la règle pour que "avec [personne]" = utilisateur + personne(s)

-- ÉTAPE 1: Afficher la ligne actuelle pour diagnostic
DO $$
DECLARE
  current_line TEXT;
  full_content TEXT;
BEGIN
  SELECT content INTO full_content
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.11'
  LIMIT 1;
  
  -- Extraire la ligne number_of_people pour diagnostic
  SELECT substring(full_content FROM '- \*\*number_of_people\*\*:[^\n]+') INTO current_line;
  
  RAISE NOTICE '📋 Ligne actuelle number_of_people: %', COALESCE(current_line, 'NON TROUVÉE');
END $$;

-- ÉTAPE 2: Supprimer la version 2.12 si elle existe déjà (pour réessayer)
DELETE FROM chat_prompts
WHERE name = 'thomas_agent_system' AND version = '2.12';

-- ÉTAPE 3: Créer la version 2.12 avec remplacement programmatique robuste
DO $$
DECLARE
  old_content TEXT;
  new_content TEXT;
  old_examples JSONB;
  old_metadata JSONB;
  replacement_text TEXT := '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)';
  pattern_found BOOLEAN := false;
BEGIN
  -- Récupérer le contenu v2.11
  SELECT content, examples, metadata
  INTO old_content, old_examples, old_metadata
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.11'
  LIMIT 1;
  
  IF old_content IS NULL THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.11 non trouvé';
  END IF;
  
  -- Essayer plusieurs stratégies de remplacement
  new_content := old_content;
  
  -- Stratégie 1: Pattern standard avec espaces
  IF new_content ~* '- \*\*number_of_people\*\*:\s*Nombre de personnes\s*\([^)]+\)' THEN
    new_content := regexp_replace(
      new_content,
      '- \*\*number_of_people\*\*:\s*Nombre de personnes\s*\([^)]+\)',
      replacement_text,
      'gi'
    );
    pattern_found := true;
    RAISE NOTICE '✅ Remplacement effectué avec pattern standard';
  -- Stratégie 2: Pattern sans espaces autour des deux-points
  ELSIF new_content ~* '- \*\*number_of_people\*\*:Nombre de personnes\([^)]+\)' THEN
    new_content := regexp_replace(
      new_content,
      '- \*\*number_of_people\*\*:Nombre de personnes\([^)]+\)',
      replacement_text,
      'gi'
    );
    pattern_found := true;
    RAISE NOTICE '✅ Remplacement effectué avec pattern sans espaces';
  -- Stratégie 3: Pattern très large (cherche juste number_of_people jusqu'à la fin de la ligne)
  ELSIF new_content ~* 'number_of_people' THEN
    new_content := regexp_replace(
      new_content,
      '- \*\*number_of_people\*\*:[^\n]+',
      replacement_text,
      'gi'
    );
    pattern_found := true;
    RAISE NOTICE '✅ Remplacement effectué avec pattern large';
  ELSE
    RAISE WARNING '⚠️ Aucun pattern number_of_people trouvé dans le contenu';
  END IF;
  
  -- Vérifier que le remplacement a bien été fait
  IF new_content LIKE '%"avec [personne]"=2%' OR new_content LIKE '%avec \[personne\]=2%' THEN
    RAISE NOTICE '✅ Vérification: amélioration présente dans le nouveau contenu';
  ELSE
    RAISE WARNING '⚠️ Vérification: amélioration non détectée après remplacement';
  END IF;
  
  -- Insérer la nouvelle version
  INSERT INTO chat_prompts (name, content, examples, version, is_active, metadata)
  VALUES (
    'thomas_agent_system',
    new_content,
    old_examples,
    '2.12',
    true,
    jsonb_build_object(
      'previous_version', '2.11',
      'updated_at', NOW(),
      'change_type', 'surgical_improvement',
      'improvement', 'Clarification détection nombre de personnes: "avec [personne]" = utilisateur + personne(s)'
    )
  );
  
  RAISE NOTICE '✅ Version 2.12 créée avec succès';
END $$;

-- ÉTAPE 4: Désactiver l'ancienne version
UPDATE chat_prompts 
SET is_active = false
WHERE name = 'thomas_agent_system' 
  AND version = '2.11';

-- ÉTAPE 5: Vérification détaillée
DO $$
DECLARE
  new_line TEXT;
  has_improvement BOOLEAN;
  has_total BOOLEAN;
  full_content TEXT;
BEGIN
  SELECT content INTO full_content
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.12'
  LIMIT 1;
  
  IF full_content IS NULL THEN
    RAISE EXCEPTION '❌ Version 2.12 non trouvée après création';
  END IF;
  
  -- Extraire la nouvelle ligne
  SELECT substring(full_content FROM '- \*\*number_of_people\*\*:[^\n]+') INTO new_line;
  
  -- Vérifier si l'amélioration est présente
  has_improvement := full_content LIKE '%"avec [personne]"=2%' OR full_content LIKE '%avec \[personne\]=2%';
  has_total := full_content LIKE '%number_of_people%TOTAL%';
  
  RAISE NOTICE '📋 Nouvelle ligne number_of_people: %', COALESCE(new_line, 'NON TROUVÉE');
  
  IF has_improvement THEN
    RAISE NOTICE '✅ Amélioration appliquée avec succès !';
  ELSIF has_total THEN
    RAISE WARNING '⚠️ Le mot TOTAL est présent mais "avec [personne]"=2 non trouvé';
  ELSE
    RAISE WARNING '❌ Amélioration non trouvée dans le contenu';
    RAISE NOTICE '🔍 Recherche de variations...';
    IF full_content LIKE '%number_of_people%' THEN
      RAISE NOTICE '   - Le champ number_of_people existe';
    END IF;
    IF full_content LIKE '%stagiaire%' THEN
      RAISE NOTICE '   - Le mot "stagiaire" existe';
    END IF;
  END IF;
END $$;

-- ÉTAPE 6: Résultat final
SELECT 
  name, 
  version, 
  is_active,
  length(content) as content_length,
  CASE 
    WHEN content LIKE '%"avec [personne]"=2%' THEN '✅ Amélioration appliquée'
    WHEN content LIKE '%avec \[personne\]=2%' THEN '✅ Amélioration appliquée (échappé)'
    WHEN content LIKE '%number_of_people%TOTAL%' AND content LIKE '%"avec un stagiaire"=2%' THEN '✅ Amélioration appliquée (variante)'
    WHEN content LIKE '%number_of_people%TOTAL%' THEN '⚠️ Partiellement appliquée (TOTAL présent)'
    ELSE '❌ Amélioration non trouvée'
  END as verification,
  substring(content FROM '- \*\*number_of_people\*\*:[^\n]+') as number_of_people_line
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
  AND version = '2.12';
