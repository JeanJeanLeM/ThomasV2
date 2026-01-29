-- Thomas V2 - Simple Seed Data for Testing
-- This creates minimal test data without auth dependencies

-- =============================================
-- SIMPLE TEST DATA (No auth.users dependencies)
-- =============================================

-- Generate fixed UUIDs for consistency
DO $$
DECLARE
  thomas_uuid UUID := '11111111-1111-1111-1111-111111111111';
  marie_uuid UUID := '22222222-2222-2222-2222-222222222222';
  pierre_uuid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN

-- =============================================
-- TEST FARMS (Direct insert, no owner validation)
-- =============================================

INSERT INTO public.farms (
  name, 
  description, 
  address, 
  postal_code, 
  city, 
  region, 
  total_area, 
  farm_type, 
  owner_id
) VALUES 
(
  'Ferme Bio des Collines',
  'Exploitation maraîchère biologique spécialisée dans les légumes de saison.',
  '123 Chemin des Maraîchers',
  '69420',
  'Condrieu',
  'Auvergne-Rhône-Alpes',
  5.2,
  'maraichage',
  thomas_uuid
),
(
  'GAEC du Soleil Levant',
  'Groupement agricole d''exploitation en commun.',
  '456 Route de la Vallée',
  '38160',
  'Saint-Marcellin',
  'Auvergne-Rhône-Alpes',
  12.8,
  'mixte',
  thomas_uuid
),
(
  'Les Jardins de Thomas',
  'Petite exploitation familiale en permaculture.',
  '789 Impasse des Jardins',
  '26000',
  'Valence',
  'Auvergne-Rhône-Alpes',
  2.1,
  'maraichage',
  thomas_uuid
)
ON CONFLICT DO NOTHING;

-- =============================================
-- TEST PLOTS
-- =============================================

INSERT INTO public.plots (
  farm_id,
  name,
  code,
  type,
  length,
  width,
  description
) VALUES 
-- Plots for Ferme Bio des Collines (farm_id = 1)
(1, 'Serre Nord', 'SN1', 'serre_plastique', 30.0, 8.0, 'Serre principale'),
(1, 'Serre Sud', 'SS1', 'serre_plastique', 25.0, 8.0, 'Serre secondaire'),
(1, 'Tunnel 1', 'T1', 'tunnel', 50.0, 4.0, 'Tunnel bâché'),
(1, 'Plein Champ A', 'PCA', 'plein_champ', 100.0, 50.0, 'Grande parcelle'),

-- Plots for GAEC du Soleil Levant (farm_id = 2)
(2, 'Serre Principale', 'SP', 'serre_verre', 40.0, 12.0, 'Grande serre en verre'),
(2, 'Verger', 'VER', 'plein_champ', 200.0, 100.0, 'Verger avec arbres fruitiers'),

-- Plots for Les Jardins de Thomas (farm_id = 3)
(3, 'Mandala 1', 'M1', 'plein_champ', 15.0, 15.0, 'Jardin mandala'),
(3, 'Serre Familiale', 'SF', 'serre_plastique', 12.0, 6.0, 'Petite serre')
ON CONFLICT DO NOTHING;

-- =============================================
-- TEST MATERIALS
-- =============================================

INSERT INTO public.materials (
  farm_id,
  name,
  category,
  model,
  brand,
  description,
  cost
) VALUES 
-- Materials for Ferme Bio des Collines
(1, 'Tracteur Compact', 'tracteurs', 'L3301', 'Kubota', 'Tracteur compact 33CV', 28500.00),
(1, 'Rotavator', 'outils_tracteur', 'RT125', 'Kuhn', 'Rotavator 1.25m', 3200.00),
(1, 'Bêche-lame', 'outils_manuels', 'Pro', 'Opinel', 'Bêche professionnelle', 45.00),
(1, 'Cagettes Plastique', 'materiel_marketing', 'CP30', 'Gilac', 'Cagettes 30x20x10', 8.50),

-- Materials for GAEC du Soleil Levant
(2, 'Tracteur Principal', 'tracteurs', 'M7040', 'Kubota', 'Tracteur 70CV', 45000.00),
(2, 'Charrue', 'outils_tracteur', '3 Corps', 'Kverneland', 'Charrue 3 corps', 5500.00),

-- Materials for Les Jardins de Thomas
(3, 'Motoculteur', 'petit_equipement', 'F220', 'Honda', 'Motoculteur léger', 1200.00),
(3, 'Grelinette', 'outils_manuels', '5 Dents', 'Biogrif', 'Grelinette 5 dents', 85.00)
ON CONFLICT DO NOTHING;

-- =============================================
-- TEST TASKS
-- =============================================

INSERT INTO public.tasks (
  farm_id,
  user_id,
  title,
  description,
  category,
  type,
  date,
  time,
  duration_minutes,
  status,
  priority,
  plot_ids,
  material_ids,
  notes
) VALUES 
-- Tasks for Ferme Bio des Collines
(
  1,
  thomas_uuid,
  'Semis de radis sous tunnel',
  'Semis de radis variété Cherry Belle sous tunnel.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '2 days',
  '08:30:00',
  90,
  'en_attente',
  'moyenne',
  ARRAY[3], -- Tunnel 1
  ARRAY[3], -- Bêche
  'Vérifier humidité du sol'
),
(
  1,
  thomas_uuid,
  'Récolte tomates cerises',
  'Récolte des tomates cerises dans la serre nord.',
  'production',
  'tache',
  CURRENT_DATE,
  '07:00:00',
  120,
  'en_cours',
  'haute',
  ARRAY[1], -- Serre Nord
  ARRAY[4], -- Cagettes
  'Récolte quotidienne'
),
(
  2,
  thomas_uuid,
  'Préparation sol verger',
  'Labour et préparation du sol pour nouvelles plantations.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '5 days',
  '09:00:00',
  240,
  'en_attente',
  'haute',
  ARRAY[6], -- Verger
  ARRAY[5, 6], -- Tracteur + Charrue
  'Attendre conditions météo'
),
(
  3,
  thomas_uuid,
  'Préparation compost',
  'Retournement du compost et ajout de matière verte.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '1 day',
  '10:00:00',
  60,
  'en_attente',
  'basse',
  ARRAY[8], -- Serre Familiale (zone compost)
  ARRAY[8], -- Grelinette
  'Compost en maturation'
)
ON CONFLICT DO NOTHING;

END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Uncomment these to verify data was inserted:
-- SELECT 'Farms created:' as info, COUNT(*) as count FROM public.farms;
-- SELECT 'Plots created:' as info, COUNT(*) as count FROM public.plots;
-- SELECT 'Materials created:' as info, COUNT(*) as count FROM public.materials;
-- SELECT 'Tasks created:' as info, COUNT(*) as count FROM public.tasks;

-- =============================================
-- NOTES
-- =============================================

/*
IMPORTANT: 
- This seed data uses fixed UUIDs that don't correspond to real auth.users
- Data will be created but may not be visible due to RLS policies
- For full testing, create real users via Supabase Auth first
- Or temporarily disable RLS for testing:
  
  ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.plots DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
*/
