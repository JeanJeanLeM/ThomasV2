-- Script pour vérifier les données existantes avant d'insérer des documents

-- 1. Vérifier les fermes disponibles
SELECT 
  '🏠 FERMES DISPONIBLES' as section,
  '' as spacer,
  '' as spacer2;

SELECT 
  id as farm_id,
  name as farm_name,
  owner_id,
  is_active,
  created_at::date as created_date
FROM public.farms 
WHERE is_active = true
ORDER BY id;

-- 2. Vérifier les utilisateurs disponibles
SELECT 
  '' as spacer,
  '👤 UTILISATEURS DISPONIBLES' as section,
  '' as spacer2;

SELECT 
  au.id as user_id,
  au.email,
  p.first_name,
  p.last_name,
  au.created_at::date as created_date
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at
LIMIT 5;

-- 3. Vérifier les membres de fermes
SELECT 
  '' as spacer,
  '🤝 MEMBRES DE FERMES' as section,
  '' as spacer2;

SELECT 
  fm.farm_id,
  f.name as farm_name,
  fm.user_id,
  au.email,
  fm.role,
  fm.is_active
FROM public.farm_members fm
JOIN public.farms f ON fm.farm_id = f.id
JOIN auth.users au ON fm.user_id = au.id
WHERE fm.is_active = true
ORDER BY fm.farm_id, fm.role;

-- 4. Vérifier les documents existants
SELECT 
  '' as spacer,
  '📄 DOCUMENTS EXISTANTS' as section,
  '' as spacer2;

SELECT 
  farm_id,
  COUNT(*) as nb_documents,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_totale_mb
FROM public.documents 
WHERE is_active = true
GROUP BY farm_id
ORDER BY farm_id;

-- 5. Recommandation pour l'insertion
SELECT 
  '' as spacer,
  '💡 RECOMMANDATION' as section,
  '' as spacer2;

SELECT 
  'Utilisez farm_id = ' || f.id || ' pour la ferme "' || f.name || '"' as recommandation,
  'Utilisez user_id = ' || fm.user_id || ' (' || au.email || ')' as utilisateur_recommande
FROM public.farms f
JOIN public.farm_members fm ON f.id = fm.farm_id
JOIN auth.users au ON fm.user_id = au.id
WHERE f.is_active = true 
  AND fm.is_active = true 
  AND fm.role IN ('owner', 'manager')
ORDER BY f.id
LIMIT 1;













