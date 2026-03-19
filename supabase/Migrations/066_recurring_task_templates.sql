-- Migration 066: Recurring task templates + weekly_work_hours on profiles
-- Table recurring_task_templates for recurring tasks (dates relative, no year).
-- User weekly work hours stored in profiles for % coverage stat.

-- ============================================================================
-- 1. Add weekly_work_hours to profiles (user preference for % coverage calc)
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_work_hours integer DEFAULT 35;

COMMENT ON COLUMN public.profiles.weekly_work_hours IS 'Heures travaillées par semaine (pour calcul % couverture tâches récurrentes)';

-- ============================================================================
-- 2. Create recurring_task_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id integer NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Détails tâche
  name character varying NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 200),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  action character varying,
  category character varying NOT NULL CHECK (category IN ('production', 'marketing', 'administratif', 'general')),
  culture character varying,
  number_of_people integer NOT NULL DEFAULT 1 CHECK (number_of_people > 0),
  notes text,

  -- Relations (arrays like tasks table)
  plot_ids integer[] DEFAULT '{}',
  surface_unit_ids integer[] DEFAULT '{}',
  material_ids integer[] DEFAULT '{}',

  -- Récurrence : dates relatives (mois 1-12, pas d'année)
  start_month integer CHECK (start_month IS NULL OR (start_month >= 1 AND start_month <= 12)),
  end_month integer CHECK (end_month IS NULL OR (end_month >= 1 AND end_month <= 12)),
  start_day integer CHECK (start_day IS NULL OR (start_day >= 1 AND start_day <= 31)),
  end_day integer CHECK (end_day IS NULL OR (end_day >= 1 AND end_day <= 31)),
  is_permanent boolean NOT NULL DEFAULT false,

  -- Périodicité
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=dim, 6=sam
  frequency_type character varying NOT NULL CHECK (frequency_type IN ('weekly', 'biweekly', 'monthly')),
  frequency_interval integer NOT NULL DEFAULT 1 CHECK (frequency_interval > 0),

  -- Statut
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recurring_task_templates IS 'Modèles de tâches récurrentes (dates relatives, ex: tous les samedis nov-fév)';
COMMENT ON COLUMN public.recurring_task_templates.day_of_week IS '0=dimanche, 1=lundi, ..., 6=samedi';
COMMENT ON COLUMN public.recurring_task_templates.frequency_type IS 'weekly=chaque semaine, biweekly=une sur deux, monthly=une fois par mois';

-- ============================================================================
-- 3. RLS
-- ============================================================================
ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recurring_task_templates for their farms"
  ON public.recurring_task_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = recurring_task_templates.farm_id
        AND fm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = recurring_task_templates.farm_id
        AND fm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Index for list by farm
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recurring_task_templates_farm_id
  ON public.recurring_task_templates(farm_id);

CREATE INDEX IF NOT EXISTS idx_recurring_task_templates_farm_active
  ON public.recurring_task_templates(farm_id, is_active);
