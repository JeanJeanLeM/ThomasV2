-- INSTRUCTIONS: Copiez et collez ce code dans l'éditeur SQL de Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/[votre-project]/sql

-- 1. Supprimer les anciennes politiques (si elles existent)
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_3" ON storage.objects;

-- 2. Créer les nouvelles politiques générales

-- Politique SELECT (lecture) - Les utilisateurs peuvent voir les photos des fermes dont ils sont membres
CREATE POLICY "photos_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'photos' 
  AND EXISTS (
    SELECT 1 FROM farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = CAST(split_part(name, '/', 2) AS INTEGER)
    AND fm.status = 'active'
  )
);

-- Politique INSERT (upload) - Les utilisateurs peuvent uploader dans les fermes dont ils sont membres
CREATE POLICY "photos_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1 FROM farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id = CAST(split_part(name, '/', 2) AS INTEGER)
    AND fm.status = 'active'
  )
);

-- Politique UPDATE - Les utilisateurs peuvent modifier leurs propres fichiers
CREATE POLICY "photos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photos'
  AND owner = auth.uid()
);

-- Politique DELETE - Les utilisateurs peuvent supprimer leurs propres fichiers
CREATE POLICY "photos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photos'
  AND owner = auth.uid()
);

-- 3. Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%photos%';