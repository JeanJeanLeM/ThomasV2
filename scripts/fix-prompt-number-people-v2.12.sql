-- Correction du prompt thomas_agent_system v2.12 (MISE À JOUR DIRECTE)
-- Amélioration chirurgicale de la détection du nombre de personnes
-- Problème: "avec un stagiaire" détecté comme 1 personne au lieu de 2
-- Solution: Clarifier la règle pour que "avec [personne]" = utilisateur + personne(s)
-- NOTE: Ce script met à jour directement la version 2.12 existante

-- ÉTAPE 1: Diagnostic - Afficher la ligne actuelle dans v2.12
DO $$
DECLARE
  full_content TEXT;
  found_lines TEXT[];
  i INTEGER;
BEGIN
  -- Récupérer le contenu v2.12
  SELECT content INTO full_content
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.12'
  LIMIT 1;
  
  IF full_content IS NULL THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.12 non trouvé';
  END IF;
  
  RAISE NOTICE '📋 Recherche de la ligne number_of_people dans v2.12...';
  
  -- Chercher toutes les lignes contenant "number_of_people"
  SELECT array_agg(line) INTO found_lines
  FROM (
    SELECT unnest(string_to_array(full_content, E'\n')) as line
  ) lines
  WHERE line ~* 'number_of_people';
  
  IF found_lines IS NOT NULL AND array_length(found_lines, 1) > 0 THEN
    RAISE NOTICE '📝 Lignes actuelles contenant "number_of_people":';
    FOR i IN 1..array_length(found_lines, 1) LOOP
      RAISE NOTICE '   [%] %', i, found_lines[i];
    END LOOP;
  ELSE
    RAISE WARNING '⚠️ Aucune ligne "number_of_people" trouvée dans v2.12';
  END IF;
END $$;

-- ÉTAPE 2: Mettre à jour directement la version 2.12
DO $$
DECLARE
  old_content TEXT;
  new_content TEXT;
  replacement_text TEXT := '- **number_of_people**: Nombre de personnes TOTAL (1 par défaut, "seul"=1, "avec [personne]"=2, "avec 2 personnes"=3, "équipe"=3+, "stagiaire"=+1 donc "avec un stagiaire"=2)';
  lines TEXT[];
  new_lines TEXT[];
  i INTEGER;
  line_found BOOLEAN := false;
  replacement_done BOOLEAN := false;
BEGIN
  -- Récupérer le contenu v2.12
  SELECT content INTO old_content
  FROM chat_prompts
  WHERE name = 'thomas_agent_system' AND version = '2.12'
  LIMIT 1;
  
  IF old_content IS NULL THEN
    RAISE EXCEPTION '❌ Prompt thomas_agent_system v2.12 non trouvé';
  END IF;
  
  -- Convertir en array de lignes
  lines := string_to_array(old_content, E'\n');
  new_lines := lines;
  
  -- Stratégie 1: Chercher et remplacer la ligne number_of_people existante
  FOR i IN 1..array_length(lines, 1) LOOP
    -- Chercher une ligne contenant number_of_people (plusieurs patterns possibles)
    IF lines[i] ~* 'number_of_people' THEN
      -- Remplacer cette ligne
      new_lines[i] := replacement_text;
      line_found := true;
      replacement_done := true;
      RAISE NOTICE '✅ Ligne number_of_people trouvée et remplacée à la position %', i;
      RAISE NOTICE '   Ancienne: %', lines[i];
      RAISE NOTICE '   Nouvelle: %', replacement_text;
      EXIT; -- Sortir après le premier remplacement
    END IF;
  END LOOP;
  
  -- Stratégie 2: Si pas trouvé, chercher "duration" et insérer après
  IF NOT line_found THEN
    RAISE NOTICE '⚠️ Ligne number_of_people non trouvée. Recherche de "duration" pour insertion...';
    FOR i IN 1..array_length(lines, 1) LOOP
      -- Chercher une ligne avec duration et markdown bold
      IF lines[i] ~* 'duration' AND (lines[i] ~* '\*\*' OR lines[i] ~* '^\s*-\s+\*\*') THEN
        -- Insérer la nouvelle ligne après "duration"
        new_lines := array_cat(
          new_lines[1:i],
          array_cat(
            ARRAY[replacement_text],
            new_lines[i+1:array_length(new_lines, 1)]
          )
        );
        replacement_done := true;
        RAISE NOTICE '✅ Ligne number_of_people insérée après "duration" à la position %', i+1;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Stratégie 3: Si toujours pas trouvé, utiliser regexp_replace comme fallback
  IF NOT replacement_done THEN
    RAISE WARNING '⚠️ Utilisation de regexp_replace comme fallback...';
    new_content := regexp_replace(
      old_content,
      '(- \*\*number_of_people\*\*:[^\n]*)',
      replacement_text,
      'gi'
    );
    
    -- Si le remplacement n'a rien changé, essayer d'insérer après "duration"
    IF new_content = old_content THEN
      new_content := regexp_replace(
        old_content,
        '(- \*\*duration\*\*:[^\n]*)',
        E'\\1\n' || replacement_text,
        'gi'
      );
      
      IF new_content = old_content THEN
        RAISE EXCEPTION '❌ Impossible de trouver où insérer/modifier la ligne number_of_people';
      END IF;
    END IF
  ELSE
    -- Reconstruire le contenu depuis les lignes modifiées
    new_content := array_to_string(new_lines, E'\n');
  END IF;
  
  -- Vérifier que le remplacement a bien été fait
  IF new_content LIKE '%"avec [personne]"=2%' 
     OR new_content LIKE '%avec \[personne\]=2%' 
     OR new_content LIKE '%"avec un stagiaire"=2%' THEN
    RAISE NOTICE '✅ Vérification: amélioration présente dans le nouveau contenu';
  ELSE
    RAISE WARNING '⚠️ Vérification: amélioration non détectée après remplacement';
    -- Extraire et afficher la ligne pour diagnostic
    DECLARE
      extracted_line TEXT;
    BEGIN
      SELECT substring(new_content FROM '- \*\*number_of_people\*\*:[^\n]+') INTO extracted_line;
      RAISE NOTICE '🔍 Ligne number_of_people extraite: %', COALESCE(extracted_line, 'NON TROUVÉE');
    END;
  END IF;
  
  -- Mettre à jour directement la version 2.12
  UPDATE chat_prompts
  SET 
    content = new_content,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{updated_at}',
      to_jsonb(NOW())
    ) || jsonb_build_object(
      'fix_applied', NOW(),
      'fix_type', 'number_of_people_clarification'
    )
  WHERE name = 'thomas_agent_system' 
    AND version = '2.12';
  
  RAISE NOTICE '✅ Version 2.12 mise à jour avec succès';
END $$;

-- ÉTAPE 3: Vérification détaillée finale
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
    RAISE EXCEPTION '❌ Version 2.12 non trouvée après mise à jour';
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
  RAISE NOTICE '📋 RÉSULTAT DE LA CORRECTION';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📝 Ligne number_of_people après correction:';
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

-- ÉTAPE 4: Résultat final pour affichage
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
