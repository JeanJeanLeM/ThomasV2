-- Migration 020: Création du bucket photos pour le chat et les tâches
-- Date: 2024-12-16
-- Description: Ajouter le bucket photos et les politiques RLS

-- 1. Créer le bucket photos s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Politiques RLS pour le bucket photos

-- Politique pour l'upload des photos
-- Les utilisateurs peuvent uploader des photos dans leur ferme
CREATE POLICY "Users can upload photos to their farm" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid() IS NOT NULL AND
  -- Vérifier que l'utilisateur est membre de la ferme (extrait du path)
  EXISTS (
    SELECT 1 FROM farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id::text = (string_to_array(name, '/'))[2] -- farm_id est le 2ème élément du path
    AND fm.is_active = true
  )
);

-- Politique pour la lecture des photos
-- Les utilisateurs peuvent voir les photos de leurs fermes
CREATE POLICY "Users can view photos from their farms" ON storage.objects
FOR SELECT USING (
  bucket_id = 'photos' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id::text = (string_to_array(name, '/'))[2] -- farm_id est le 2ème élément du path
    AND fm.is_active = true
  )
);

-- Politique pour la suppression des photos
-- Les utilisateurs peuvent supprimer leurs propres photos ou celles de leur ferme (si manager/owner)
CREATE POLICY "Users can delete their own photos or farm photos if manager" ON storage.objects
FOR DELETE USING (
  bucket_id = 'photos' AND
  auth.uid() IS NOT NULL AND
  (
    -- L'utilisateur peut supprimer ses propres photos
    (string_to_array(name, '/'))[3] LIKE '%' || auth.uid()::text || '%'
    OR
    -- Ou si l'utilisateur est manager/owner de la ferme
    EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.user_id = auth.uid()
      AND fm.farm_id::text = (string_to_array(name, '/'))[2]
      AND fm.role IN ('owner', 'manager')
      AND fm.is_active = true
    )
  )
);

-- 3. Commentaires pour documentation
COMMENT ON POLICY "Users can upload photos to their farm" ON storage.objects IS 
'Permet aux membres d''une ferme d''uploader des photos dans le dossier de leur ferme';

COMMENT ON POLICY "Users can view photos from their farms" ON storage.objects IS 
'Permet aux membres d''une ferme de voir toutes les photos de leur ferme';

COMMENT ON POLICY "Users can delete their own photos or farm photos if manager" ON storage.objects IS 
'Permet aux utilisateurs de supprimer leurs propres photos ou toutes les photos s''ils sont manager/owner';

-- 4. Vérification des politiques créées
DO $$
BEGIN
    RAISE NOTICE 'Migration 020 terminée: Bucket photos créé avec politiques RLS';
    RAISE NOTICE 'Structure du path: photos/{category}/{farm_id}/{timestamp}_{filename}';
    RAISE NOTICE 'Catégories supportées: chat, tasks, observations, documents';
END $$;