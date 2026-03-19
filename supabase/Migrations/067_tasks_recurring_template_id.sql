-- Migration 067: Link tasks to recurring templates for generation and deduplication
-- Allows generating tasks from recurring_task_templates and avoid duplicates.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurring_template_id uuid REFERENCES public.recurring_task_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.recurring_template_id IS 'Template source when task was auto-generated from recurring task; used to avoid overlapping generation';

-- Unique constraint: one generated task per template per date (no overlapping)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_recurring_template_date
  ON public.tasks (recurring_template_id, date)
  WHERE recurring_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring_template_id
  ON public.tasks (recurring_template_id)
  WHERE recurring_template_id IS NOT NULL;
