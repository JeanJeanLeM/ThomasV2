-- ============================================
-- TESTS FONCTIONNALITÉS THOMAS V2 ACTUELLES
-- Testez ces requêtes dans Supabase SQL Editor
-- ============================================

-- 🏡 Test 1: Créer une ferme de test
INSERT INTO farms (name, description, farm_type, owner_id, address, city, region) 
VALUES (
    'Ferme de Test Thomas V2',
    'Ferme pour tester toutes les fonctionnalités',
    'maraichage',
    (SELECT id FROM auth.users LIMIT 1), -- Premier utilisateur
    '123 Route des Tests',
    'Villeneuve-les-Tests',
    'Île-de-France'
);

-- Récupérer l'ID de la ferme créée
-- SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2';

-- 🚜 Test 2: Créer parcelles variées
INSERT INTO plots (farm_id, name, code, type, length, width, description, aliases, llm_keywords) VALUES
-- Serre plastique
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Serre Principale',
    'SP1',
    'serre_plastique',
    30.0,
    8.0,
    'Grande serre pour tomates et concombres',
    ARRAY['serre1', 'sp1', 'principale', 'grande serre'],
    ARRAY['serre', 'plastique', 'tomate', 'concombre']
),
-- Tunnel
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Tunnel Nord',
    'TN',
    'tunnel',
    20.0,
    4.0,
    'Tunnel pour salades et radis',
    ARRAY['tunnel', 'tn', 'nord'],
    ARRAY['tunnel', 'salade', 'radis']
),
-- Plein champ
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Champ Est',
    'CE',
    'plein_champ',
    50.0,
    25.0,
    'Grande parcelle pour courges',
    ARRAY['champ', 'ce', 'est'],
    ARRAY['plein_champ', 'courge', 'est']
);

-- 📐 Test 3: Créer unités de surface pour chaque parcelle
-- Planches pour serre
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, length, width, llm_keywords) 
SELECT 
    p.id,
    'Planche ' || generate_series,
    'P' || generate_series,
    'planche',
    generate_series,
    6.0,
    1.2,
    ARRAY['planche', 'p' || generate_series::text, 'planche ' || generate_series::text]
FROM plots p, generate_series(1, 4)
WHERE p.name = 'Serre Principale';

-- Rangs pour plein champ  
INSERT INTO surface_units (plot_id, name, code, type, sequence_number, length, width, llm_keywords)
SELECT 
    p.id,
    'Rang ' || chr(64 + generate_series), -- A, B, C, D
    'R' || chr(64 + generate_series),
    'rang',
    generate_series,
    50.0,
    1.0,
    ARRAY['rang', 'r' || chr(64 + generate_series), 'rang ' || chr(64 + generate_series)]
FROM plots p, generate_series(1, 4)
WHERE p.name = 'Champ Est';

-- 🔧 Test 4: Créer matériel varié
INSERT INTO materials (farm_id, name, category, model, brand, description, cost) VALUES
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Motoculteur Honda',
    'tracteurs',
    'F560',
    'Honda',
    'Motoculteur pour travail du sol',
    2500.00
),
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Serfouette',
    'outils_manuels',
    'Classique',
    'Opinel',
    'Outil de désherbage manuel',
    25.00
),
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'Arrosoir 10L',
    'petit_equipement',
    '10L',
    'Plastique',
    'Arrosoir pour semis',
    15.00
);

-- ⚖️ Test 5: Créer conversions utilisateur
INSERT INTO user_conversion_units (user_id, farm_id, container_name, crop_name, conversion_value, conversion_unit) VALUES
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'caisse',
    'tomate',
    8.0,
    'kg'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'botte',
    'radis',
    0.5,
    'kg'
),
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    'panier',
    'salade',
    2.0,
    'kg'
);

-- ✅ Test 6: Créer tâches effectuées avec données IA
INSERT INTO tasks (
    farm_id, user_id, title, description, action, category, type,
    date, time, duration_minutes, status, priority,
    plot_ids, surface_unit_ids, material_ids,
    plants, ai_confidence, notes
) VALUES
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    (SELECT id FROM auth.users LIMIT 1),
    'Plantation tomates serre principale',
    'Plantation de 48 plants de tomates variété Cœur de Bœuf',
    'planter',
    'production',
    'tache',
    CURRENT_DATE,
    '08:00:00',
    120, -- 2 heures
    'terminee',
    'moyenne',
    ARRAY[(SELECT id FROM plots WHERE name = 'Serre Principale')],
    ARRAY[(SELECT id FROM surface_units WHERE name = 'Planche 1')],
    ARRAY[(SELECT id FROM materials WHERE name = 'Serfouette')],
    ARRAY['tomate', 'cœur de bœuf'],
    0.95,
    'Plants bien repris, arrosage fait'
),
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    (SELECT id FROM auth.users LIMIT 1),
    'Récolte radis tunnel',
    'Récolte des radis maturés',
    'récolter',
    'production',
    'tache',
    CURRENT_DATE - INTERVAL '1 day',
    '07:30:00',
    45,
    'terminee',
    'moyenne',
    ARRAY[(SELECT id FROM plots WHERE name = 'Tunnel Nord')],
    ARRAY[(SELECT id FROM surface_units WHERE name = 'Planche 1' LIMIT 1)],
    ARRAY[(SELECT id FROM materials WHERE name = 'Arrosoir 10L')],
    ARRAY['radis'],
    0.90,
    '15 bottes récoltées, qualité excellente'
);

-- 👁️ Test 7: Créer observations diverses
INSERT INTO observations (
    farm_id, user_id, title, category, nature, crop,
    plot_ids, surface_unit_ids, status
) VALUES
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    (SELECT id FROM auth.users LIMIT 1),
    'Pucerons sur tomates',
    'ravageurs',
    'Présence de pucerons verts sur les jeunes pousses de tomates, concentration modérée',
    'tomate',
    ARRAY[(SELECT id FROM plots WHERE name = 'Serre Principale')],
    ARRAY[(SELECT id FROM surface_units WHERE name = 'Planche 2')],
    'active'
),
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    (SELECT id FROM auth.users LIMIT 1),
    'Croissance exceptionnelle radis',
    'croissance',
    'Radis particulièrement développés cette semaine, taille uniforme',
    'radis',
    ARRAY[(SELECT id FROM plots WHERE name = 'Tunnel Nord')],
    ARRAY[(SELECT id FROM surface_units WHERE code LIKE 'P%' LIMIT 1)],
    'active'
);

-- 💬 Test 8: Créer session chat Thomas avec messages
INSERT INTO chat_sessions (farm_id, user_id, chat_type, title) VALUES
(
    (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2'),
    (SELECT id FROM auth.users LIMIT 1),
    'general',
    'Chat Thomas - Ferme Test'
);

-- Messages de test
INSERT INTO chat_messages (session_id, role, content, ai_confidence) VALUES
(
    (SELECT id FROM chat_sessions WHERE title = 'Chat Thomas - Ferme Test'),
    'user',
    'Bonjour Thomas, j''ai planté des tomates dans la serre principale aujourd''hui, planches 1 et 2. Durée 2 heures.',
    null
),
(
    (SELECT id FROM chat_sessions WHERE title = 'Chat Thomas - Ferme Test'),
    'assistant',
    'Parfait ! J''ai bien compris votre travail de plantation. Les tomates ont été plantées dans la Serre Principale sur les planches 1 et 2, durée 2 heures. Voulez-vous que je crée une tâche avec ces informations ?',
    0.95
),
(
    (SELECT id FROM chat_sessions WHERE title = 'Chat Thomas - Ferme Test'),
    'user',
    'J''ai observé des pucerons sur les tomates planche 2.',
    null
),
(
    (SELECT id FROM chat_sessions WHERE title = 'Chat Thomas - Ferme Test'),
    'assistant',
    'Je note cette observation de pucerons sur les tomates de la planche 2. C''est important pour le suivi. Voulez-vous que j''enregistre cette observation avec plus de détails ?',
    0.88
);

-- ============================================
-- REQUÊTES DE VÉRIFICATION
-- ============================================

-- Vérifier les données créées
SELECT '=== RÉSUMÉ FERME TEST ===' as info;

-- Ferme et stats
SELECT 
    f.name,
    f.farm_type,
    f.city,
    (SELECT COUNT(*) FROM plots WHERE farm_id = f.id) as parcelles_count,
    (SELECT COUNT(*) FROM surface_units su JOIN plots p ON su.plot_id = p.id WHERE p.farm_id = f.id) as unites_surface_count,
    (SELECT COUNT(*) FROM materials WHERE farm_id = f.id) as materiel_count,
    (SELECT COUNT(*) FROM tasks WHERE farm_id = f.id) as taches_count,
    (SELECT COUNT(*) FROM observations WHERE farm_id = f.id) as observations_count
FROM farms f 
WHERE f.name = 'Ferme de Test Thomas V2';

-- Parcelles avec unités de surface
SELECT 
    p.name as parcelle,
    p.type,
    p.surface_area,
    STRING_AGG(su.name, ', ') as unites_surface
FROM plots p
LEFT JOIN surface_units su ON p.id = su.plot_id
WHERE p.farm_id = (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2')
GROUP BY p.id, p.name, p.type, p.surface_area
ORDER BY p.name;

-- Tâches avec détails
SELECT 
    t.title,
    t.action,
    t.date,
    t.duration_minutes,
    t.status,
    STRING_AGG(DISTINCT p.name, ', ') as parcelles,
    STRING_AGG(DISTINCT m.name, ', ') as materiel_utilise,
    ARRAY_TO_STRING(t.plants, ', ') as cultures
FROM tasks t
LEFT JOIN plots p ON p.id = ANY(t.plot_ids)
LEFT JOIN materials m ON m.id = ANY(t.material_ids)
WHERE t.farm_id = (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2')
GROUP BY t.id, t.title, t.action, t.date, t.duration_minutes, t.status, t.plants
ORDER BY t.date DESC;

-- Messages chat Thomas
SELECT 
    cs.title as session,
    cm.role,
    SUBSTRING(cm.content, 1, 100) || '...' as message_preview,
    cm.ai_confidence,
    cm.created_at
FROM chat_sessions cs
JOIN chat_messages cm ON cs.id = cm.session_id
WHERE cs.farm_id = (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2')
ORDER BY cm.created_at;

-- Conversions utilisateur
SELECT 
    container_name || ' ' || crop_name as conversion,
    conversion_value,
    conversion_unit
FROM user_conversion_units
WHERE farm_id = (SELECT id FROM farms WHERE name = 'Ferme de Test Thomas V2');

SELECT '=== TESTS TERMINÉS ===' as info;




