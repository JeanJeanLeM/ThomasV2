-- SOLUTION FORCE: Permettre tout accès au bucket photos temporairement
-- ⚠️ ATTENTION: Très permissif, à utiliser uniquement pour déboguer

-- 1. Supprimer TOUTES les politiques existantes sur storage.objects
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_3" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_temp_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_temp_allow_all" ON storage.objects;

-- 2. Créer une politique ultra-permissive pour le bucket photos
CREATE POLICY "photos_allow_everything" ON storage.objects
FOR ALL 
TO public
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- 3. Vérifier que la politique est créée
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname = 'photos_allow_everything';