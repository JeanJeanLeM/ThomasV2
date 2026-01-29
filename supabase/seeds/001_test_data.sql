-- Thomas V2 - Seed Data for Testing
-- This file provides sample data for development and testing

-- =============================================
-- SEED DATA WITH GENERATED UUIDs
-- =============================================

-- Note: This creates test data with generated UUIDs
-- In production, users are created via Supabase Auth signup
-- This is only for development/testing purposes

DO $$
DECLARE
  thomas_uuid UUID;
  marie_uuid UUID;
  pierre_uuid UUID;
BEGIN
  -- Generate UUIDs for test users (these will be used as if they were real auth.users IDs)
  thomas_uuid := gen_random_uuid();
  marie_uuid := gen_random_uuid();
  pierre_uuid := gen_random_uuid();

  -- Create profiles for the test users
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name
  ) VALUES 
  (thomas_uuid, 'thomas.test@gmail.com', 'Thomas', 'Test'),
  (marie_uuid, 'marie.martin@ferme.fr', 'Marie', 'Martin'),
  (pierre_uuid, 'pierre.durand@conseil.fr', 'Pierre', 'Durand')
  ON CONFLICT (id) DO NOTHING;

  -- =============================================
  -- TEST FARMS
  -- =============================================

  -- Insert test farms using the generated UUIDs
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
    'Exploitation maraîchère biologique spécialisée dans les légumes de saison. Production diversifiée sur 5 hectares avec serres et plein champ.',
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
    'Groupement agricole d''exploitation en commun. Culture de fruits et légumes avec vente directe et AMAP.',
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
    'Petite exploitation familiale en permaculture. Focus sur la biodiversité et les variétés anciennes.',
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

  -- Add members to farms using the generated UUIDs
  INSERT INTO public.farm_members (
    farm_id,
    user_id,
    role,
    permissions
  ) VALUES 
  -- Marie Martin as Manager of Ferme Bio des Collines
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
  -- Pierre Durand as Advisor for GAEC du Soleil Levant
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
-- Plots for Ferme Bio des Collines
(1, 'Serre Nord', 'SN1', 'serre_plastique', 30.0, 8.0, 'Serre principale pour cultures précoces et tardives'),
(1, 'Serre Sud', 'SS1', 'serre_plastique', 25.0, 8.0, 'Serre secondaire pour plants et semis'),
(1, 'Tunnel 1', 'T1', 'tunnel', 50.0, 4.0, 'Tunnel bâché pour cultures intermédiaires'),
(1, 'Tunnel 2', 'T2', 'tunnel', 50.0, 4.0, 'Tunnel bâché pour cultures intermédiaires'),
(1, 'Plein Champ A', 'PCA', 'plein_champ', 100.0, 50.0, 'Grande parcelle pour cultures de plein champ'),
(1, 'Plein Champ B', 'PCB', 'plein_champ', 80.0, 40.0, 'Parcelle en rotation avec légumineuses'),

-- Plots for GAEC du Soleil Levant
(2, 'Serre Principale', 'SP', 'serre_verre', 40.0, 12.0, 'Grande serre en verre chauffée'),
(2, 'Pépinière', 'PEP', 'pepiniere', 20.0, 10.0, 'Espace dédié à la production de plants'),
(2, 'Verger', 'VER', 'plein_champ', 200.0, 100.0, 'Verger avec arbres fruitiers variés'),

-- Plots for Les Jardins de Thomas
(3, 'Mandala 1', 'M1', 'plein_champ', 15.0, 15.0, 'Jardin mandala en permaculture'),
(3, 'Serre Familiale', 'SF', 'serre_plastique', 12.0, 6.0, 'Petite serre pour la famille'),
(3, 'Compost & Préparations', 'CP', 'autre', 10.0, 8.0, 'Zone de compostage et préparations biodynamiques')
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
  cost,
  purchase_date
) VALUES 
-- Materials for Ferme Bio des Collines
(1, 'Tracteur Compact', 'tracteurs', 'L3301', 'Kubota', 'Tracteur compact 33CV pour travail en serre', 28500.00, '2023-03-15'),
(1, 'Rotavator', 'outils_tracteur', 'RT125', 'Kuhn', 'Rotavator 1.25m pour préparation du sol', 3200.00, '2023-03-15'),
(1, 'Bêche-lame', 'outils_manuels', 'Pro', 'Opinel', 'Bêche professionnelle manche long', 45.00, '2023-01-10'),
(1, 'Serfouette', 'outils_manuels', 'Forgée', 'Leborgne', 'Serfouette forgée 16cm', 32.00, '2023-01-10'),
(1, 'Cagettes Plastique', 'materiel_marketing', 'CP30', 'Gilac', 'Cagettes 30x20x10 pour récolte', 8.50, '2023-02-20'),

-- Materials for GAEC du Soleil Levant
(2, 'Tracteur Principal', 'tracteurs', 'M7040', 'Kubota', 'Tracteur 70CV pour gros travaux', 45000.00, '2022-09-10'),
(2, 'Charrue', 'outils_tracteur', '3 Corps', 'Kverneland', 'Charrue 3 corps réversible', 5500.00, '2022-09-10'),
(2, 'Planteuse', 'outils_tracteur', 'PP4', 'Checchi & Magli', 'Planteuse 4 rangs pour plants', 12000.00, '2023-04-05'),

-- Materials for Les Jardins de Thomas
(3, 'Motoculteur', 'petit_equipement', 'F220', 'Honda', 'Motoculteur léger pour petites surfaces', 1200.00, '2023-05-12'),
(3, 'Grelinette', 'outils_manuels', '5 Dents', 'Biogrif', 'Grelinette 5 dents pour aération du sol', 85.00, '2023-01-15'),
(3, 'Arrosoir Cuivre', 'outils_manuels', '10L', 'Haws', 'Arrosoir en cuivre traditionnel', 120.00, '2023-02-28')
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
  'Semis de radis variété Cherry Belle sous tunnel T1. Prévoir 3 lignes espacées de 15cm.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '2 days',
  '08:30:00',
  90,
  'en_attente',
  'moyenne',
  ARRAY[3], -- Tunnel 1
  ARRAY[4], -- Serfouette
  'Vérifier l''humidité du sol avant semis'
),
  (
    1,
    thomas_uuid,
    'Récolte tomates cerises',
  'Récolte des tomates cerises dans la serre nord. Trier par calibre.',
  'production',
  'tache',
  CURRENT_DATE,
  '07:00:00',
  120,
  'en_cours',
  'haute',
  ARRAY[1], -- Serre Nord
  ARRAY[5], -- Cagettes
  'Récolte quotidienne en saison'
),
  (
    1,
    marie_uuid,
    'Observation pucerons',
  'Contrôle présence pucerons sur aubergines serre sud. Noter intensité et localisation.',
  'production',
  'observation',
  CURRENT_DATE - INTERVAL '1 day',
  '16:00:00',
  30,
  'terminee',
  'moyenne',
  ARRAY[2], -- Serre Sud
  NULL,
  'RAS - pas de pucerons détectés'
),

  -- Tasks for GAEC du Soleil Levant
  (
    2,
    thomas_uuid,
    'Préparation sol verger',
  'Labour et préparation du sol pour nouvelles plantations d''arbres fruitiers.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '5 days',
  '09:00:00',
  240,
  'en_attente',
  'haute',
  ARRAY[9], -- Verger
  ARRAY[6, 7], -- Tracteur + Charrue
  'Attendre conditions météo favorables'
),

  -- Tasks for Les Jardins de Thomas
  (
    3,
    thomas_uuid,
    'Préparation compost',
  'Retournement du compost et ajout de matière verte. Contrôle température.',
  'production',
  'tache',
  CURRENT_DATE + INTERVAL '1 day',
  '10:00:00',
  60,
  'en_attente',
  'basse',
  ARRAY[12], -- Compost & Préparations
  ARRAY[10], -- Grelinette
  'Compost en cours de maturation'
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
    message,
    invitation_token
  ) VALUES 
  (
    1,
    thomas_uuid,
    'nouveau.employe@email.fr',
    'employee',
    'Bonjour ! Je vous invite à rejoindre notre ferme bio. Vous pourrez suivre nos cultures et participer aux tâches quotidiennes.',
    'test-invitation-token-001'
  ),
  (
    2,
    thomas_uuid,
    'expert.conseil@agro.fr',
    'advisor',
    'Nous aimerions bénéficier de votre expertise en tant que conseiller technique pour notre GAEC.',
    'test-invitation-token-002'
  )
  ON CONFLICT DO NOTHING;

END $$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.farms IS 'Données de test pour les fermes Thomas V2';
COMMENT ON TABLE public.farm_members IS 'Membres de test avec différents rôles';
COMMENT ON TABLE public.plots IS 'Parcelles et serres de test avec dimensions réalistes';
COMMENT ON TABLE public.materials IS 'Matériel agricole de test avec prix et modèles réels';
COMMENT ON TABLE public.tasks IS 'Tâches de test couvrant différents types et statuts';
COMMENT ON TABLE public.farm_invitations IS 'Invitations de test pour nouveaux membres';

-- =============================================
-- NOTES FOR DEVELOPMENT
-- =============================================

/*
IMPORTANT: Ce fichier de seed contient des UUIDs de test qui doivent être remplacés
par de vrais UUIDs d'utilisateurs après leur inscription via Supabase Auth.

Pour utiliser ces données de test :
1. Créer les comptes utilisateurs via l'interface d'auth
2. Récupérer leurs vrais UUIDs depuis auth.users
3. Mettre à jour les données avec les vrais UUIDs
4. Ou utiliser une fonction pour mapper automatiquement les emails vers les UUIDs

Utilisateurs de test recommandés :
- thomas.test@gmail.com (Propriétaire principal)
- marie.martin@ferme.fr (Manager)
- pierre.durand@conseil.fr (Conseiller)
*/
