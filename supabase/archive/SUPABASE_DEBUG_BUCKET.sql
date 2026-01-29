-- Script de diagnostic pour le bucket photos
-- Exécutez ceci pour comprendre pourquoi l'upload échoue

-- 1. Vérifier si le bucket photos existe et ses paramètres
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'photos';

-- 2. Vérifier toutes les politiques RLS sur storage.objects
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
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 3. Vérifier l'utilisateur actuel et ses permissions
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as current_user_email;

-- 4. Vérifier les fermes de l'utilisateur actuel
SELECT 
    fm.farm_id,
    f.name as farm_name,
    f.farm_type,
    fm.status,
    fm.role
FROM farm_members fm
JOIN farms f ON f.id = fm.farm_id
WHERE fm.user_id = auth.uid();

-- 5. Tester les permissions sur storage.objects pour le bucket photos
SELECT 
    'Test permissions' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'photos' 
            LIMIT 1
        ) THEN 'Peut lire le bucket photos'
        ELSE 'Ne peut pas lire le bucket photos'
    END as result;

-- 6. Vérifier s'il y a des fichiers existants dans le bucket
SELECT 
    COUNT(*) as total_files,
    string_agg(DISTINCT split_part(name, '/', 1), ', ') as categories
FROM storage.objects 
WHERE bucket_id = 'photos';

-- 7. Informations sur la table storage.objects
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'storage' 
AND table_name = 'objects'
ORDER BY ordinal_position;