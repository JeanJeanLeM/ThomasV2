-- Migration 074: Ajout de tasks.standard_action (FK vers task_standard_actions.code)

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS standard_action VARCHAR(64)
    REFERENCES public.task_standard_actions(code) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_standard_action ON public.tasks(standard_action);

COMMENT ON COLUMN public.tasks.standard_action IS
  'Code d''action standard choisi parmi task_standard_actions.code (ex: recolter, tailler). NULL si non classifié.';
