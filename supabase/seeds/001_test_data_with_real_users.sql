-- Thomas V2 - Test Data with Real Users
-- Run this AFTER 000_create_test_users.sql

-- =============================================
-- TEST DATA WITH REAL AUTH USERS
-- =============================================

DO $$
DECLARE
  thomas_uuid UUID;
  marie_uuid UUID;
  pierre_uuid UUID;
BEGIN
  -- Get the UUIDs of the test users we just created
  SELECT id INTO thomas_uuid FROM auth.users WHERE email = 'thomas.test@gmail.com';
  SELECT id INTO marie_uuid FROM auth.users WHERE email = 'marie.martin@ferme.fr';
  SELECT id INTO pierre_uuid FROM auth.users WHERE email = 'pierre.durand@conseil.fr';

  -- Verify we found the users
  IF thomas_uuid IS NULL THEN
    RAISE EXCEPTION 'Thomas test user not found. Run 000_create_test_users.sql first.';
  END IF;

  RAISE NOTICE 'Using UUIDs: Thomas=%, Marie=%, Pierre=%', thomas_uuid, marie_uuid, pierre_uuid;

  -- =============================================
  -- TEST FARMS
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
  -- TEST FARM MEMBERS
  -- =============================================

  INSERT INTO public.farm_members (
    farm_id,
    user_id,
    role,
    permissions
  ) VALUES 
  -- Marie as Manager of Ferme Bio des Collines
  (
    1,
    marie_uuid,
    'manager',
    '{
      "can_edit_farm": true,
      "can_invite_members": true,
      "can_manage_tasks": true,
      "can_view_analytics": true,
      "can_export_data": false
    }'::jsonb
  ),
  -- Pierre as Advisor for GAEC du Soleil Levant
  (
    2,
    pierre_uuid,
    'advisor',
    '{
      "can_edit_farm": false,
      "can_invite_members": false,
      "can_manage_tasks": true,
      "can_view_analytics": true,
      "can_export_data": true
    }'::jsonb
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
    marie_uuid,
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
    pierre_uuid,
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
    ARRAY[8], -- Serre Familiale
    ARRAY[8], -- Grelinette
    'Compost en maturation'
  )
  ON CONFLICT DO NOTHING;

  -- =============================================
  -- TEST INVITATIONS
  -- =============================================

  INSERT INTO public.farm_invitations (
    farm_id,
    invited_by,
    email,
    role,
    message
  ) VALUES 
  (
    1,
    thomas_uuid,
    'nouveau.employe@email.fr',
    'employee',
    'Bonjour ! Je vous invite à rejoindre notre ferme bio.'
  ),
  (
    2,
    thomas_uuid,
    'expert.conseil@agro.fr',
    'advisor',
    'Nous aimerions bénéficier de votre expertise technique.'
  )
  ON CONFLICT DO NOTHING;

END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify all data was created
SELECT 'Farms' as table_name, COUNT(*) as count FROM public.farms
UNION ALL
SELECT 'Farm Members', COUNT(*) FROM public.farm_members
UNION ALL
SELECT 'Plots', COUNT(*) FROM public.plots
UNION ALL
SELECT 'Materials', COUNT(*) FROM public.materials
UNION ALL
SELECT 'Tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'Invitations', COUNT(*) FROM public.farm_invitations
ORDER BY table_name;
