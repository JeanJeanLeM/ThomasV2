-- Script simple pour insérer des documents de test
-- Utilise la ferme ID 16 mentionnée dans l'erreur

-- Vérifier d'abord que la ferme existe
SELECT 
  'Ferme trouvée:' as info,
  id as farm_id,
  name as farm_name,
  owner_id
FROM public.farms 
WHERE id = 16;

-- Vérifier qu'il y a des utilisateurs
SELECT 
  'Utilisateur trouvé:' as info,
  id as user_id,
  email
FROM auth.users 
LIMIT 1;

-- Insérer des documents de test pour la ferme ID 16
INSERT INTO public.documents (
  farm_id,
  user_id,
  name,
  description,
  category,
  file_name,
  file_type,
  file_size,
  file_path,
  mime_type,
  storage_bucket
) VALUES 
(
  16, -- farm_id existant
  (SELECT id FROM auth.users LIMIT 1),
  'Analyse de sol parcelle Nord 2024',
  'Analyse chimique complète du sol de la parcelle Nord effectuée en novembre 2024',
  'analyse-sol',
  'analyse_sol_nord_2024.pdf',
  'pdf',
  2457600, -- 2.4 MB en bytes
  'documents/analyses/analyse_sol_nord_2024.pdf',
  'application/pdf',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Certificat Agriculture Biologique',
  'Certificat bio valide jusqu''en décembre 2025',
  'certifications',
  'certificat_bio_2024.pdf',
  'pdf',
  1258291, -- 1.2 MB en bytes
  'documents/certifications/certificat_bio_2024.pdf',
  'application/pdf',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Photos récolte automne 2024',
  'Collection de photos de la récolte d''automne - tomates, courgettes, aubergines',
  'photos',
  'photos_recolte_automne_2024.zip',
  'zip',
  16777216, -- 16 MB en bytes
  'documents/photos/photos_recolte_automne_2024.zip',
  'application/zip',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Contrat vente directe Marché Bio',
  'Contrat avec le marché bio local pour la vente directe',
  'contrats',
  'contrat_marche_bio_2024.docx',
  'docx',
  876544, -- 856 KB en bytes
  'documents/contrats/contrat_marche_bio_2024.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Plan parcellaire ferme',
  'Plan détaillé de toutes les parcelles avec dimensions et cultures',
  'cartes',
  'plan_parcellaire_2024.pdf',
  'pdf',
  4194304, -- 4 MB en bytes
  'documents/cartes/plan_parcellaire_2024.pdf',
  'application/pdf',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Facture semences bio',
  'Facture d''achat des semences biologiques pour la saison 2024',
  'recus',
  'facture_semences_bio_2024.pdf',
  'pdf',
  524288, -- 512 KB en bytes
  'documents/recus/facture_semences_bio_2024.pdf',
  'application/pdf',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Manuel tracteur Kubota',
  'Manuel d''utilisation et d''entretien du tracteur Kubota L3301',
  'manuels',
  'manuel_kubota_l3301.pdf',
  'pdf',
  8388608, -- 8 MB en bytes
  'documents/manuels/manuel_kubota_l3301.pdf',
  'application/pdf',
  'documents'
),
(
  16,
  (SELECT id FROM auth.users LIMIT 1),
  'Rapport rendement 2024',
  'Rapport détaillé des rendements par parcelle et par culture pour 2024',
  'rapports',
  'rapport_rendement_2024.xlsx',
  'xlsx',
  2097152, -- 2 MB en bytes
  'documents/rapports/rapport_rendement_2024.xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'documents'
);

-- Afficher le résumé des documents insérés
SELECT 
  '✅ Documents insérés avec succès' as status,
  COUNT(*) as nombre_documents,
  SUM(file_size) as taille_totale_bytes,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_totale_mb,
  farm_id
FROM public.documents 
WHERE farm_id = 16
GROUP BY farm_id;

-- Vérifier les catégories
SELECT 
  category,
  COUNT(*) as nb_documents,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_mb
FROM public.documents 
WHERE farm_id = 16
GROUP BY category
ORDER BY category;













