-- Script de diagnostic simplifié pour le bucket photos

-- 1. Vérifier si le bucket photos existe
SELECT 
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'photos';

-- 2. Vérifier l'utilisateur actuel
SELECT 
    auth.uid() as current_user_id;

-- 3. Vérifier toutes les politiques sur storage.objects
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 4. Compter les fichiers dans le bucket photos
SELECT 
    COUNT(*) as total_files_in_photos_bucket
FROM storage.objects 
WHERE bucket_id = 'photos';

-- 5. Test simple de permissions
SELECT 
    'Test de lecture' as test,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'SUCCÈS - Peut lire storage.objects'
        ELSE 'ÉCHEC - Ne peut pas lire storage.objects'
    END as result
FROM storage.objects 
WHERE bucket_id = 'photos' OR bucket_id IS NULL
LIMIT 1;