-- Mise à jour du prompt thomas_agent_system v2.12 (VERSION FINALE)
-- Amélioration chirurgicale de la détection du nombre de personnes
-- Problème: "avec un stagiaire" détecté comme 1 personne au lieu de 2
-- Solution: Clarifier la règle pour que "avec [personne]" = utilisateur + personne(s)

-- ÉTAPE 1: Diagnostic - Afficher toutes les lignes contenant "number_of_people" ou "duration"
DO $$
DECLARE
  full_content TEXT;
  search_pattern TEXT;
  found_lines TEXT[];
  i INTEGER;
BEGIN
  -- Récupérer le contenu v2.11
  SELECT content INTO full_content
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.11'
  LIMIT 1;
  
  IF full_content IS NULL THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.11 non trouvé';
  END IF;
  
  RAISE NOTICE '📋 Recherche de la ligne number_of_people dans v2.11...';
  
  -- Chercher toutes les lignes contenant "number_of_people"
  SELECT array_agg(line) INTO found_lines
  FROM (
    SELECT unnest(string_to_array(full_content, E'\n')) as line
  ) lines
  WHERE line ~* 'number_of_people';
  
  IF found_lines IS NOT NULL AND array_length(found_lines, 1) > 0 THEN
    RAISE NOTICE '✅ Lignes trouvées contenant "number_of_people":';
    FOR i IN 1..array_length(found_lines, 1) LOOP
      RAISE NOTICE '   [%] %', i, found_lines[i];
    END LOOP;
  ELSE
    RAISE WARNING '⚠️ Aucune ligne "number_of_people" trouvée. Recherche de "duration" pour contexte...';
    -- Chercher "duration" comme référence
    SELECT array_agg(line) INTO found_lines
    FROM (
      SELECT unnest(string_to_array(full_content, E'\n')) as line
    ) lines
    WHERE line ~* 'duration';
    
    IF found_lines IS NOT NULL AND array_length(found_lines, 1) > 0 THEN
      RAISE NOTICE '📋 Lignes "duration" trouvées (pour référence de format):';
      FOR i IN 1..LEAST(array_length(found_lines, 1), 3) LOOP
        RAISE NOTICE '   [%] %', i, found_lines[i];
      END LOOP;
    END IF;
  END IF;
END $$;

-- ÉTAPE 2: Supprimer la version 2.12 si elle existe déjà (pour réessayer)
DELETE FROM chat_prompts
WHERE name = 'thomas_agent_system' AND version = '2.12';

-- ÉTAPE 3: Créer la version 2.12 avec remplacement intelligent
DO $$
DECLARE
  old_content TEXT;
  new_content TEXT;
  old_examples JSONB;
  replacement_text TEXT := '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)';
  lines TEXT[];
  new_lines TEXT[];
  i INTEGER;
  line_found BOOLEAN := false;
  insert_after_duration BOOLEAN := false;
BEGIN
  -- Récupérer le contenu v2.11
  SELECT content, examples
  INTO old_content, old_examples
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.11'
  LIMIT 1;
  
  IF old_content IS NULL THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.11 non trouvé';
  END IF;
  
  -- Convertir en array de lignes
  lines := string_to_array(old_content, E'\n');
  new_lines := lines;
  
  -- Chercher et remplacer la ligne number_of_people
  FOR i IN 1..array_length(lines, 1) LOOP
    -- Chercher une ligne contenant number_of_people
    IF lines[i] ~* 'number_of_people' AND lines[i] ~* 'Nombre de personnes' THEN
      -- Remplacer cette ligne
      new_lines[i] := replacement_text;
      line_found := true;
      RAISE NOTICE '✅ Ligne number_of_people trouvée et remplacée à la position %', i;
      EXIT; -- Sortir après le premier remplacement
    END IF;
  END LOOP;
  
  -- Si pas trouvé, chercher "duration" et insérer après
  IF NOT line_found THEN
    RAISE NOTICE '⚠️ Ligne number_of_people non trouvée. Recherche de "duration" pour insertion...';
    FOR i IN 1..array_length(lines, 1) LOOP
      IF lines[i] ~* 'duration' AND lines[i] ~* '\*\*' THEN
        -- Insérer la nouvelle ligne après "duration"
        new_lines := array_cat(
          new_lines[1:i],
          array_cat(
            ARRAY[replacement_text],
            new_lines[i+1:array_length(new_lines, 1)]
          )
        );
        line_found := true;
        RAISE NOTICE '✅ Ligne number_of_people insérée après "duration" à la position %', i+1;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Si toujours pas trouvé, utiliser regexp_replace comme fallback
  IF NOT line_found THEN
    RAISE WARNING '⚠️ Utilisation de regexp_replace comme fallback...';
    new_content := regexp_replace(
      old_content,
      '(- \*\*number_of_people\*\*:[^\n]*)',
      replacement_text,
      'gi'
    );
    
    -- Si le remplacement n'a rien changé, essayer d'insérer après une section appropriée
    IF new_content = old_content THEN
      -- Chercher une section "extracted_data" ou similaire
      new_content := regexp_replace(
        old_content,
        '(- \*\*duration\*\*:[^\n]*)',
        E'\\1\n' || replacement_text,
        'gi'
      );
      
      IF new_content = old_content THEN
        RAISE EXCEPTION '❌ Impossible de trouver où insérer la ligne number_of_people';
      END IF;
    END IF;
  ELSE
    -- Reconstruire le contenu depuis les lignes modifiées
    new_content := array_to_string(new_lines, E'\n');
  END IF;
  
  -- Vérifier que le remplacement a bien été fait
  IF new_content LIKE '%"avec [personne]"=2%' OR new_content LIKE '%avec \[personne\]=2%' OR new_content LIKE '%"avec un stagiaire"=2%' THEN
    RAISE NOTICE '✅ Vérification: amélioration présente dans le nouveau contenu';
  ELSE
    RAISE WARNING '⚠️ Vérification: amélioration non détectée après remplacement';
    RAISE NOTICE '🔍 Contenu de la ligne number_of_people dans le nouveau contenu:';
    -- Extraire et afficher la ligne
    SELECT substring(new_content FROM '- \*\*number_of_people\*\*:[^\n]+') INTO replacement_text;
    RAISE NOTICE '   %', COALESCE(replacement_text, 'NON TROUVÉE');
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

-- ÉTAPE 5: Vérification détaillée finale
DO $$
DECLARE
  new_line TEXT;
  has_improvement BOOLEAN;
  has_total BOOLEAN;
  has_stagiaire_example BOOLEAN;
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
  
  -- Vérifier si l'amélioration est présente (plusieurs variantes)
  has_improvement := full_content LIKE '%"avec [personne]"=2%' 
                  OR full_content LIKE '%avec \[personne\]=2%'
                  OR full_content LIKE '%"avec un stagiaire"=2%';
  has_total := full_content LIKE '%number_of_people%TOTAL%';
  has_stagiaire_example := full_content LIKE '%"avec un stagiaire"=2%';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 RÉSULTAT DE LA MISE À JOUR';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📝 Nouvelle ligne number_of_people:';
  RAISE NOTICE '   %', COALESCE(new_line, '❌ NON TROUVÉE');
  RAISE NOTICE '';
  
  IF has_improvement THEN
    RAISE NOTICE '✅ Amélioration appliquée avec succès !';
    IF has_stagiaire_example THEN
      RAISE NOTICE '   ✓ Exemple "avec un stagiaire"=2 présent';
    END IF;
    IF has_total THEN
      RAISE NOTICE '   ✓ Mot "TOTAL" présent';
    END IF;
  ELSIF has_total THEN
    RAISE WARNING '⚠️ Le mot TOTAL est présent mais "avec [personne]"=2 non trouvé';
  ELSE
    RAISE WARNING '❌ Amélioration non trouvée dans le contenu';
  END IF;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ÉTAPE 6: Résultat final pour affichage
SELECT 
  name, 
  version, 
  is_active,
  length(content) as content_length,
  CASE 
    WHEN content LIKE '%"avec [personne]"=2%' THEN '✅ Amélioration appliquée'
    WHEN content LIKE '%avec \[personne\]=2%' THEN '✅ Amélioration appliquée (échappé)'
    WHEN content LIKE '%"avec un stagiaire"=2%' THEN '✅ Amélioration appliquée (exemple stagiaire)'
    WHEN content LIKE '%number_of_people%TOTAL%' AND content LIKE '%stagiaire%' THEN '⚠️ Partiellement appliquée (TOTAL + stagiaire)'
    WHEN content LIKE '%number_of_people%TOTAL%' THEN '⚠️ Partiellement appliquée (TOTAL présent)'
    ELSE '❌ Amélioration non trouvée'
  END as verification,
  substring(content FROM '- \*\*number_of_people\*\*:[^\n]+') as number_of_people_line
FROM chat_prompts 
WHERE name = 'thomas_agent_system' 
  AND version = '2.12';
