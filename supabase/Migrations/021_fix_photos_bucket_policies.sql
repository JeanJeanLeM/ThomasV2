-- Migration pour corriger les politiques RLS du bucket photos
-- Cette migration remplace les politiques existantes par des politiques plus générales

-- Supprimer toutes les politiques existantes du bucket photos
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_3" ON storage.objects;

-- Politique générale pour SELECT (lecture) - Les utilisateurs peuvent voir les photos des fermes dont ils sont membres
CREATE POLICY "photos_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'photos' 
  AND (
    -- L'utilisateur est propriétaire du fichier (basé sur le user_id dans le path)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- L'utilisateur est membre de la ferme (basé sur le farm_id dans le path)
    EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.user_id = auth.uid()
      AND fm.farm_id = CAST((storage.foldername(name))[2] AS INTEGER)
      AND fm.status = 'active'
    )
  )
);

-- Politique générale pour INSERT (upload) - Les utilisateurs peuvent uploader dans les fermes dont ils sont membres
CREATE POLICY "photos_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photos'
  AND (
    -- L'utilisateur uploade dans sa propre ferme
    EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.user_id = auth.uid()
      AND fm.farm_id = CAST((storage.foldername(name))[2] AS INTEGER)
      AND fm.status = 'active'
    )
  )
);

-- Politique générale pour UPDATE - Les utilisateurs peuvent modifier leurs propres fichiers
CREATE POLICY "photos_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'photos'
  AND owner = auth.uid()
) WITH CHECK (
  bucket_id = 'photos'
  AND owner = auth.uid()
);

-- Politique générale pour DELETE - Les utilisateurs peuvent supprimer leurs propres fichiers
CREATE POLICY "photos_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photos'
  AND owner = auth.uid()
);

-- Vérifier que le bucket photos existe et est configuré correctement
DO $$
BEGIN
  -- Vérifier si le bucket existe
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'photos') THEN
    -- Créer le bucket s'il n'existe pas
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'photos',
      'photos',
      true,
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;
END $$;

-- Commentaire explicatif de la structure des paths
-- Structure attendue des fichiers dans le bucket photos:
-- photos/
--   ├── tasks/{farm_id}/{timestamp}_{filename}
--   ├── observations/{farm_id}/{timestamp}_{filename}
--   ├── chat/{farm_id}/{timestamp}_{filename}
--   └── documents/{farm_id}/{timestamp}_{filename}
--
-- Exemples:
-- - photos/chat/16/1765908741602_image.jpg
-- - photos/tasks/16/1765908741602_task_photo.jpg
-- - photos/observations/16/1765908741602_observation.jpg