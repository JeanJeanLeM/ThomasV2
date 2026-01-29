-- ============================================
-- TESTS VALIDATION MIGRATION THOMAS V2
-- Environnement: DEV
-- ============================================

\echo '🧪 TESTS VALIDATION MIGRATION THOMAS V2'
\echo '======================================='

-- Test 1: Vérification existence nouvelles tables
\echo '\n📋 Test 1: Nouvelles tables créées...'
SELECT 
    table_name,
    CASE WHEN table_name IN (
        'surface_units', 'chat_sessions', 'chat_messages', 'generated_actions',
        'observations', 'planned_tasks', 'user_conversion_units', 'offline_sync_queue'
    ) THEN '✅ OK' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'surface_units', 'chat_sessions', 'chat_messages', 'generated_actions',
    'observations', 'planned_tasks', 'user_conversion_units', 'offline_sync_queue'
)
ORDER BY table_name;

-- Test 2: Vérification extensions tables existantes  
\echo '\n🔧 Test 2: Extensions tables existantes...'

-- Plots extensions
SELECT 'plots' as table_name, 
       string_agg(column_name, ', ') as new_columns
FROM information_schema.columns 
WHERE table_name = 'plots' 
AND column_name IN ('aliases', 'llm_keywords', 'position', 'category');

-- Tasks extensions
SELECT 'tasks' as table_name,
       string_agg(column_name, ', ') as new_columns  
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('action', 'plants', 'surface_unit_ids', 'ai_confidence', 'chat_session_id');

-- Materials extensions
SELECT 'materials' as table_name,
       string_agg(column_name, ', ') as new_columns
FROM information_schema.columns
WHERE table_name = 'materials'  
AND column_name IN ('llm_keywords', 'maintenance_notes', 'usage_tracking');

-- Test 3: Vérification index LLM
\echo '\n⚡ Test 3: Index LLM et performance...'
SELECT 
    indexname,
    tablename,
    CASE WHEN indexdef LIKE '%gin%' THEN '✅ GIN Index' ELSE '📊 Standard' END as index_type
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (indexname LIKE '%llm%' OR indexname LIKE '%aliases%')
ORDER BY tablename, indexname;

-- Test 4: Vérification RLS activé
\echo '\n🔒 Test 4: Sécurité RLS...'
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS Activé' ELSE '❌ RLS Désactivé' END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('surface_units', 'chat_sessions', 'observations', 'planned_tasks')
ORDER BY tablename;

-- Test 5: Vérification triggers
\echo '\n⚙️ Test 5: Triggers automatiques...'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (trigger_name LIKE '%updated_at%' OR trigger_name LIKE '%llm%' OR trigger_name LIKE '%chat%')
ORDER BY event_object_table;

-- Test 6: Vérification vues créées
\echo '\n📊 Test 6: Vues utilitaires...'
SELECT 
    table_name as view_name,
    CASE WHEN table_type = 'VIEW' THEN '✅ Vue créée' ELSE '❌ Manquante' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'VIEW'  
AND table_name IN ('farms_with_stats', 'tasks_with_details', 'chat_sessions_with_stats', 'observations_with_location_details')
ORDER BY table_name;

-- Test 7: Données test chargées
\echo '\n🧪 Test 7: Données test présentes...'

-- Compter unités de surface
SELECT 
    'surface_units' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Données présentes' ELSE '⚠️ Aucune donnée' END as status
FROM surface_units;

-- Compter conversions test
SELECT 
    'user_conversion_units' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Données présentes' ELSE '⚠️ Aucune donnée' END as status
FROM user_conversion_units;

-- Compter sessions chat
SELECT 
    'chat_sessions' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Données présentes' ELSE '⚠️ Aucune donnée' END as status
FROM chat_sessions;

-- Test 8: Fonctions IA disponibles
\echo '\n🤖 Test 8: Fonctions IA...'
SELECT 
    routine_name,
    routine_type,
    CASE WHEN routine_name LIKE '%search%fuzzy%' THEN '✅ Recherche IA' 
         WHEN routine_name LIKE '%user_has_farm_access%' THEN '🔒 Sécurité'
         ELSE '🔧 Utilitaire' END as function_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('search_plots_fuzzy', 'search_surface_units_fuzzy', 'user_has_farm_access')
ORDER BY routine_name;

-- Test 9: Contraintes et validations
\echo '\n✅ Test 9: Contraintes de données...'
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name IN ('surface_units', 'observations', 'planned_tasks') 
AND constraint_type IN ('CHECK', 'FOREIGN KEY')
ORDER BY table_name, constraint_type;

-- Test 10: Statistiques finales
\echo '\n📈 Test 10: Statistiques migration...'

-- Compter toutes les tables
WITH table_stats AS (
    SELECT 'Tables totales' as metric, COUNT(*)::text as value
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    
    UNION ALL
    
    SELECT 'Vues créées' as metric, COUNT(*)::text as value  
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'VIEW'
    
    UNION ALL
    
    SELECT 'Index LLM' as metric, COUNT(*)::text as value
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE '%llm%'
    
    UNION ALL
    
    SELECT 'Fonctions IA' as metric, COUNT(*)::text as value
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name LIKE '%fuzzy%'
)
SELECT metric, value FROM table_stats;

\echo '\n🎉 TESTS DE VALIDATION TERMINÉS !'
\echo ''
\echo '📋 Si tous les tests montrent ✅, la migration est réussie.'
\echo '⚠️ Si des éléments sont ❌, vérifiez le fichier de migration.'
\echo ''

-- Optionnel: Test requête complexe exemple
\echo '🔍 Test requête exemple - Recherche parcelles:'
-- Cette requête teste la fonction de recherche floue
-- Décommentez pour tester si vous avez des données
-- SELECT * FROM search_plots_fuzzy(1, 'serre', 0.3) LIMIT 3;
