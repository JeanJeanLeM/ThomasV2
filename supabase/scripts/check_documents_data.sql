-- Script simple pour vérifier les données de documents actuelles

-- 1. Compter les documents par ferme
SELECT 
  '📊 DOCUMENTS PAR FERME' as section;

SELECT 
  d.farm_id,
  f.name as farm_name,
  COUNT(d.id) as nb_documents,
  ROUND(SUM(d.file_size)::numeric / (1024*1024), 2) as taille_totale_mb,
  STRING_AGG(DISTINCT d.category, ', ') as categories
FROM public.documents d
JOIN public.farms f ON d.farm_id = f.id
WHERE d.is_active = true
GROUP BY d.farm_id, f.name
ORDER BY d.farm_id;

-- 2. Lister quelques documents exemple
SELECT 
  '📄 EXEMPLES DE DOCUMENTS' as section;

SELECT 
  d.farm_id,
  d.name,
  d.category,
  d.file_type,
  ROUND(d.file_size::numeric / (1024*1024), 2) as size_mb,
  d.created_at::date as created_date
FROM public.documents d
WHERE d.is_active = true
ORDER BY d.created_at DESC
LIMIT 10;

-- 3. Statistiques générales
SELECT 
  '📈 STATISTIQUES GÉNÉRALES' as section;

SELECT 
  COUNT(*) as total_documents,
  COUNT(DISTINCT farm_id) as fermes_avec_documents,
  COUNT(DISTINCT category) as categories_utilisees,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_totale_mb,
  ROUND(AVG(file_size)::numeric / (1024*1024), 2) as taille_moyenne_mb
FROM public.documents 
WHERE is_active = true;
