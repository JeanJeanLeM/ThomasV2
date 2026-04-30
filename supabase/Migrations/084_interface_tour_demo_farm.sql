-- Migration 084: Shared demo farm for interface tour
-- Creates a read-only demo farm and seeds multi-week tasks/observations

BEGIN;

DO $$
DECLARE
  v_owner_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_farm_id integer;
  v_plot_id integer;
  v_plot2_id integer;
  v_su1_id integer;
  v_su2_id integer;
  v_su3_id integer;
BEGIN
  INSERT INTO public.farms (name, description, farm_type, owner_id, country, is_active)
  VALUES (
    'Ferme Demo Thomas Interface Tour',
    'Ferme de demonstration partagee en lecture seule pour onboarding interface.',
    'maraichage',
    v_owner_id,
    'France',
    true
  )
  ON CONFLICT DO NOTHING;

  SELECT id
  INTO v_farm_id
  FROM public.farms
  WHERE name = 'Ferme Demo Thomas Interface Tour'
    AND owner_id = v_owner_id
    AND is_active = true
  ORDER BY id
  LIMIT 1;

  IF v_farm_id IS NULL THEN
    RAISE EXCEPTION 'Unable to create or find demo farm';
  END IF;

  INSERT INTO public.farm_members (farm_id, user_id, role, permissions, is_active)
  VALUES (
    v_farm_id,
    v_owner_id,
    'owner',
    jsonb_build_object(
      'can_edit_farm', true,
      'can_export_data', true,
      'can_manage_tasks', true,
      'can_invite_members', true,
      'can_view_analytics', true
    ),
    true
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.plots (
    farm_id,
    name,
    type,
    length,
    width,
    description,
    is_active
  )
  VALUES
    (v_farm_id, 'Parcelle Nord', 'plein_champ', 40, 24, 'Parcelle principale demo', true),
    (v_farm_id, 'Serre 1', 'serre_plastique', 30, 8, 'Serre demo', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_plot_id
  FROM public.plots
  WHERE farm_id = v_farm_id AND name = 'Parcelle Nord'
  ORDER BY id
  LIMIT 1;

  SELECT id INTO v_plot2_id
  FROM public.plots
  WHERE farm_id = v_farm_id AND name = 'Serre 1'
  ORDER BY id
  LIMIT 1;

  INSERT INTO public.surface_units (plot_id, name, type, sequence_number, length, width, area, is_active)
  VALUES
    (v_plot_id, 'Planche 01', 'planche', 1, 40, 1, 40, true),
    (v_plot_id, 'Planche 02', 'planche', 2, 40, 1, 40, true),
    (v_plot2_id, 'Planche S1-01', 'planche', 1, 30, 1, 30, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_su1_id FROM public.surface_units WHERE plot_id = v_plot_id AND name = 'Planche 01' ORDER BY id LIMIT 1;
  SELECT id INTO v_su2_id FROM public.surface_units WHERE plot_id = v_plot_id AND name = 'Planche 02' ORDER BY id LIMIT 1;
  SELECT id INTO v_su3_id FROM public.surface_units WHERE plot_id = v_plot2_id AND name = 'Planche S1-01' ORDER BY id LIMIT 1;

  INSERT INTO public.tasks (
    farm_id, user_id, title, category, type, date, duration_minutes, status, priority, action, plants, plot_ids, surface_unit_ids, number_of_people, notes, is_active
  )
  VALUES
    (v_farm_id, v_owner_id, 'Plantation de laitues', 'production', 'tache', CURRENT_DATE - INTERVAL '12 day', 120, 'terminee', 'moyenne', 'planter', ARRAY['laitue'], ARRAY[v_plot_id], ARRAY[v_su1_id], 2, 'Plantation en plein champ', true),
    (v_farm_id, v_owner_id, 'Desherbage de carottes', 'production', 'tache', CURRENT_DATE - INTERVAL '9 day', 90, 'terminee', 'moyenne', 'desherber', ARRAY['carotte'], ARRAY[v_plot_id], ARRAY[v_su2_id], 1, 'Passage manuel', true),
    (v_farm_id, v_owner_id, 'Recolte de fraises', 'production', 'tache', CURRENT_DATE - INTERVAL '5 day', 150, 'terminee', 'haute', 'recolter', ARRAY['fraise'], ARRAY[v_plot2_id], ARRAY[v_su3_id], 3, 'Preparation marche local', true),
    (v_farm_id, v_owner_id, 'Recolte de tulipes', 'production', 'tache', CURRENT_DATE - INTERVAL '2 day', 80, 'terminee', 'moyenne', 'recolter', ARRAY['tulipe'], ARRAY[v_plot_id], ARRAY[v_su1_id], 2, 'Lot fleuriste', true),
    (v_farm_id, v_owner_id, 'Taille de tomates', 'production', 'tache', CURRENT_DATE + INTERVAL '1 day', 110, 'en_attente', 'moyenne', 'tailler', ARRAY['tomate'], ARRAY[v_plot2_id], ARRAY[v_su3_id], 2, 'Prevision semaine', true),
    (v_farm_id, v_owner_id, 'Vente au marche', 'marketing', 'tache', CURRENT_DATE + INTERVAL '2 day', 180, 'en_attente', 'haute', 'vendre', ARRAY['fraise','laitue'], ARRAY[v_plot_id], ARRAY[v_su1_id], 2, 'Stand hebdomadaire', true),
    (v_farm_id, v_owner_id, 'Livraison AMAP', 'marketing', 'tache', CURRENT_DATE + INTERVAL '3 day', 120, 'en_attente', 'moyenne', 'livrer', ARRAY['tomate'], ARRAY[v_plot2_id], ARRAY[v_su3_id], 1, 'Point de livraison ville', true),
    (v_farm_id, v_owner_id, 'Reparation tracteur', 'general', 'tache', CURRENT_DATE + INTERVAL '5 day', 90, 'en_attente', 'haute', 'reparer', ARRAY[]::text[], ARRAY[v_plot_id], ARRAY[v_su2_id], 1, 'Maintenance preventive', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.observations (
    farm_id, user_id, title, category, nature, crop, plot_ids, surface_unit_ids, severity, status, is_active
  )
  VALUES
    (
      v_farm_id,
      v_owner_id,
      'Observation oidium sur courgette',
      'maladies',
      'Apparition de taches blanches sur feuilles de courgette, controle recommande.',
      'courgette',
      ARRAY[v_plot_id],
      ARRAY[v_su2_id],
      'moyen',
      'active',
      true
    )
  ON CONFLICT DO NOTHING;
END $$;

COMMIT;
