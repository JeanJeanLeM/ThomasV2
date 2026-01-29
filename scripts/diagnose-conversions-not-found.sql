-- Diagnostic: Conversions non trouvées malgré leur existence
-- Problème: "📊 Conversions: Aucune" alors que des conversions existent

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VÉRIFIER L'EXISTENCE DES CONVERSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Toutes les conversions "caisse" pour tomates (tous utilisateurs)
SELECT 
  '1. Conversions caisse/tomate (tous users)' as diagnostic,
  id,
  user_id,
  farm_id,
  container_name,
  crop_name,
  conversion_value,
  conversion_unit,
  is_active,
  created_at
FROM user_conversion_units
WHERE (container_name ILIKE '%caisse%' OR slugs @> ARRAY['caisse', 'caisses'])
  AND (crop_name ILIKE '%tomate%' OR crop_name IS NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VÉRIFIER LE STATUT is_active
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '2. Conversions caisse par statut is_active' as diagnostic,
  is_active,
  COUNT(*) as count,
  string_agg(DISTINCT container_name || COALESCE(' (' || crop_name || ')', ''), ', ') as conversions
FROM user_conversion_units
WHERE container_name ILIKE '%caisse%'
GROUP BY is_active;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CONVERSIONS PAR USER_ID ET FARM_ID
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '3. Conversions par user/farm' as diagnostic,
  user_id,
  farm_id,
  COUNT(*) as total_conversions,
  COUNT(CASE WHEN is_active THEN 1 END) as active_conversions,
  string_agg(
    DISTINCT container_name || 
    COALESCE(' (' || crop_name || ')', '') || 
    CASE WHEN NOT is_active THEN ' [INACTIVE]' ELSE '' END, 
    ', '
  ) as conversions_list
FROM user_conversion_units
GROUP BY user_id, farm_id
ORDER BY user_id, farm_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SIMULER LA REQUÊTE DE buildUserContext
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: Remplacez USER_ID et FARM_ID par les valeurs réelles de votre session

DO $$
DECLARE
  test_user_id UUID;
  test_farm_id INTEGER;
  conversions_count INTEGER;
BEGIN
  -- Obtenir le premier user_id avec des conversions
  SELECT user_id, farm_id INTO test_user_id, test_farm_id
  FROM user_conversion_units
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ Aucune conversion trouvée dans la base de données';
    RETURN;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '4. TEST AVEC USER_ID: % et FARM_ID: %', test_user_id, test_farm_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  -- Simuler la requête buildUserContext (SANS filtre user_id)
  SELECT COUNT(*) INTO conversions_count
  FROM user_conversion_units
  WHERE farm_id = test_farm_id
    AND is_active = true;
  
  RAISE NOTICE '✅ Conversions actives trouvées avec filtres (farm_id + is_active): %', conversions_count;
  
  -- Sans le filtre is_active
  SELECT COUNT(*) INTO conversions_count
  FROM user_conversion_units
  WHERE farm_id = test_farm_id;
  
  RAISE NOTICE '📊 Conversions TOTALES (sans filtre is_active): %', conversions_count;
END $$;

-- Requête détaillée avec la première farm
SELECT 
  '4. Simulation buildUserContext (première farm)' as diagnostic,
  u.id as conversion_id,
  u.user_id,
  u.farm_id,
  u.container_name,
  u.crop_name,
  u.conversion_value,
  u.conversion_unit,
  u.is_active,
  u.slugs,
  u.description
FROM user_conversion_units u
WHERE u.farm_id = (SELECT farm_id FROM user_conversion_units LIMIT 1)
  AND u.is_active = true
ORDER BY u.container_name, u.crop_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VÉRIFIER LES SESSIONS DE CHAT RÉCENTES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '5. Sessions de chat récentes avec user/farm' as diagnostic,
  cs.id as session_id,
  cs.user_id,
  cs.farm_id,
  cs.created_at,
  (SELECT COUNT(*) 
   FROM user_conversion_units ucu 
   WHERE ucu.user_id = cs.user_id 
     AND ucu.farm_id = cs.farm_id 
     AND ucu.is_active = true
  ) as conversions_actives_disponibles
FROM chat_sessions cs
ORDER BY cs.created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. DIAGNOSTIC FINAL ET RECOMMANDATIONS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  total_conversions INTEGER;
  inactive_conversions INTEGER;
  users_with_conversions INTEGER;
BEGIN
  SELECT COUNT(*), 
         COUNT(CASE WHEN NOT is_active THEN 1 END),
         COUNT(DISTINCT user_id)
  INTO total_conversions, inactive_conversions, users_with_conversions
  FROM user_conversion_units;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 DIAGNOSTIC FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total conversions dans la DB: %', total_conversions;
  RAISE NOTICE 'Conversions INACTIVES: %', inactive_conversions;
  RAISE NOTICE 'Utilisateurs avec conversions: %', users_with_conversions;
  RAISE NOTICE '';
  
  IF total_conversions = 0 THEN
    RAISE NOTICE '❌ PROBLÈME: Aucune conversion dans la table user_conversion_units';
    RAISE NOTICE '   → Solution: Créer les conversions via l''interface utilisateur';
  ELSIF inactive_conversions = total_conversions THEN
    RAISE NOTICE '❌ PROBLÈME: TOUTES les conversions sont inactives (is_active = false)';
    RAISE NOTICE '   → Solution: Activer les conversions avec UPDATE user_conversion_units SET is_active = true';
  ELSIF inactive_conversions > 0 THEN
    RAISE NOTICE '⚠️ ATTENTION: % conversions sont inactives', inactive_conversions;
    RAISE NOTICE '   → Vérifier si les conversions "caisse de tomate" sont actives';
  ELSE
    RAISE NOTICE '✅ Conversions présentes et actives dans la DB';
    RAISE NOTICE '   → Vérifier que farm_id correspond à la session de chat';
    RAISE NOTICE '   → NOTE: Les conversions sont partagées au niveau de la ferme (pas de filtre user_id)';
  END IF;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SOLUTION RAPIDE: Activer toutes les conversions si nécessaire
-- ═══════════════════════════════════════════════════════════════════════════

-- ⚠️ DÉCOMMENTER UNIQUEMENT SI VOUS VOULEZ ACTIVER TOUTES LES CONVERSIONS
-- UPDATE user_conversion_units 
-- SET is_active = true 
-- WHERE is_active = false;
-- 
-- SELECT 'Conversions activées: ' || COUNT(*) as result
-- FROM user_conversion_units
-- WHERE is_active = true;
