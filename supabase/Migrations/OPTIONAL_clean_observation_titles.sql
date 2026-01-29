-- ============================================
-- MIGRATION OPTIONNELLE : Nettoyage des titres d'observations
-- ============================================
-- 
-- Cette migration normalise les titres d'observations pour suivre
-- le format standard: "[issue] - [crop]"
-- 
-- Exemples:
--   "J'ai observé des pucerons sur tomates" → "pucerons - tomates"
--   "J'ai vu des dégâts de mineuse sur courgettes" → "dégâts de mineuse - courgettes"
--
-- ⚠️  IMPORTANT: Cette migration est OPTIONNELLE
-- L'application gère automatiquement le formatage à l'affichage via observationFormatters.ts
-- Cette migration ne fait que nettoyer les données existantes en DB pour cohérence.
--
-- COMMENT UTILISER:
-- 1. Faire un backup de la table observations
-- 2. Exécuter cette migration
-- 3. Vérifier les résultats avec les requêtes de contrôle en bas
-- 4. Si problème, rollback depuis le backup
-- ============================================

-- Fonction pour extraire l'issue et la crop d'un titre en format libre
CREATE OR REPLACE FUNCTION parse_observation_title(title TEXT)
RETURNS TABLE(issue TEXT, crop TEXT) AS $$
BEGIN
  -- Pattern 1: "J'ai observé [issue] sur [crop]"
  IF title ~* 'j''ai (observé|vu|remarqué|constaté)(.+?)sur(.+)' THEN
    RETURN QUERY
    SELECT 
      regexp_replace(
        regexp_replace(title, '^.*?(observé|vu|remarqué|constaté)\s+(des?\s+|les?\s+)?', '', 'i'),
        '\s+sur\s+(les?\s+|des?\s+)?.*$', '', 'i'
      ) AS issue,
      regexp_replace(title, '^.*sur\s+(les?\s+|des?\s+)?', '', 'i') AS crop;
    RETURN;
  END IF;
  
  -- Pattern 2: "[issue] sur [crop]" (sans J'ai)
  IF title ~* '(.+?)\s+sur\s+(.+)' AND NOT title ~* '^(j''ai|observation)' THEN
    RETURN QUERY
    SELECT 
      regexp_replace(split_part(title, ' sur ', 1), '^(des?\s+|les?\s+)', '', 'i') AS issue,
      regexp_replace(split_part(title, ' sur ', 2), '^(des?\s+|les?\s+)', '', 'i') AS crop;
    RETURN;
  END IF;
  
  -- Pattern 3: "[issue] - [crop]" (déjà bon format)
  IF title ~ '.+ - .+' THEN
    RETURN QUERY
    SELECT 
      trim(split_part(title, ' - ', 1)) AS issue,
      trim(split_part(title, ' - ', 2)) AS crop;
    RETURN;
  END IF;
  
  -- Pas de pattern reconnu, retourner NULL
  RETURN QUERY SELECT NULL::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- APERÇU DES CHANGEMENTS (sans modification)
-- ============================================
-- Exécutez cette requête pour voir les changements avant de les appliquer

SELECT 
  id,
  title AS titre_original,
  CASE 
    WHEN p.issue IS NOT NULL AND p.crop IS NOT NULL 
    THEN p.issue || ' - ' || p.crop
    ELSE title
  END AS nouveau_titre,
  CASE 
    WHEN p.issue IS NOT NULL AND p.crop IS NOT NULL THEN '✅ Sera modifié'
    ELSE '⚠️ Inchangé'
  END AS statut
FROM observations
CROSS JOIN LATERAL parse_observation_title(observations.title) AS p
ORDER BY statut DESC, created_at DESC;

-- ============================================
-- APPLICATION DES CHANGEMENTS
-- ============================================
-- ⚠️  ATTENTION: Décommenter et exécuter seulement après avoir vérifié l'aperçu

/*
BEGIN;

-- Mettre à jour les titres qui peuvent être parsés
UPDATE observations
SET title = p.issue || ' - ' || p.crop
FROM (
  SELECT 
    id,
    (parse_observation_title(title)).*
  FROM observations
) AS p
WHERE observations.id = p.id
  AND p.issue IS NOT NULL 
  AND p.crop IS NOT NULL;

-- Afficher le résumé des modifications
DO $$
DECLARE
  modified_count INTEGER;
BEGIN
  GET DIAGNOSTICS modified_count = ROW_COUNT;
  RAISE NOTICE '✅ % observations modifiées', modified_count;
END $$;

COMMIT;
*/

-- ============================================
-- REQUÊTES DE CONTRÔLE QUALITÉ
-- ============================================

-- Vérifier les observations qui n'ont pas été modifiées
/*
SELECT 
  id,
  title,
  category,
  created_at
FROM observations
WHERE title NOT LIKE '% - %'
  AND title !~* '^observation'
ORDER BY created_at DESC;
*/

-- Compter les formats de titres
/*
SELECT 
  CASE
    WHEN title ~ '^.+ - .+$' THEN 'Format standard (issue - crop)'
    WHEN title ~* '^j''ai (observé|vu|remarqué)' THEN 'Format texte libre (J''ai observé...)'
    WHEN title ~* '^observation' THEN 'Format avec préfixe Observation'
    ELSE 'Autre format'
  END AS format_type,
  count(*) as count
FROM observations
GROUP BY format_type
ORDER BY count DESC;
*/

-- ============================================
-- NETTOYAGE (optionnel après migration)
-- ============================================
-- Supprimer la fonction temporaire si vous n'en avez plus besoin
-- DROP FUNCTION IF EXISTS parse_observation_title(TEXT);

-- ============================================
-- NOTES DE MIGRATION
-- ============================================
-- 
-- Cette migration est compatible avec:
-- - src/utils/observationFormatters.ts
-- - src/services/aiChatService.ts (createObservationFromAction)
-- - src/services/agent/tools/agricultural/ObservationTool.ts
--
-- Les nouvelles observations créées via le chat utilisent déjà
-- le bon format: "[issue] - [crop]"
--
-- Cette migration ne fait que nettoyer l'historique existant.
-- ============================================



