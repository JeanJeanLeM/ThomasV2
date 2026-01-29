-- SOLUTION TEMPORAIRE: Désactiver RLS sur le bucket photos pour tester
-- ⚠️ ATTENTION: Ceci désactive la sécurité temporairement - À réactiver après les tests

-- 1. Vérifier l'état actuel du bucket photos
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'photos';

-- 2. Vérifier les politiques RLS existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND (policyname LIKE '%photos%' OR policyname LIKE '%1io9m69%');

-- 3. Supprimer TOUTES les politiques du bucket photos
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND (policyname LIKE '%photos%' OR policyname LIKE '%1io9m69%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Politique supprimée: %', policy_record.policyname;
    END LOOP;
END $$;

-- 4. Créer une politique temporaire très permissive
CREATE POLICY "photos_temp_allow_all" ON storage.objects
FOR ALL 
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- 5. Vérifier que la politique a été créée
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname = 'photos_temp_allow_all';

-- 6. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Politique temporaire créée pour le bucket photos';
    RAISE NOTICE '⚠️  ATTENTION: Cette politique est très permissive';
    RAISE NOTICE '🔧 À remplacer par des politiques sécurisées après les tests';
END $$;