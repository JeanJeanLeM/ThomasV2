-- SOLUTION TEMPORAIRE SIMPLE - Pour tester rapidement
-- ⚠️  ATTENTION: Cette politique est permissive et doit être remplacée par une plus sécurisée en production

-- Supprimer toutes les politiques existantes du bucket photos
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1io9m69_3" ON storage.objects;

-- Politique temporaire permissive pour tous les utilisateurs authentifiés
CREATE POLICY "photos_temp_policy" ON storage.objects
FOR ALL USING (
  bucket_id = 'photos'
  AND auth.uid() IS NOT NULL
);

-- Cette politique permet à tout utilisateur authentifié de:
-- - Lire toutes les photos
-- - Uploader des photos
-- - Modifier/supprimer ses propres photos
--
-- ⚠️ À remplacer par les politiques sécurisées une fois les tests terminés