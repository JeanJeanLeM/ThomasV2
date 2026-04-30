-- Migration 085: Task members (profile-level attribution on tasks)
-- Adds a junction table to map tasks to specific farm members.

CREATE TABLE IF NOT EXISTS public.task_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role character varying NOT NULL DEFAULT 'participant',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_members_task_id ON public.task_members(task_id);
CREATE INDEX IF NOT EXISTS idx_task_members_user_id ON public.task_members(user_id);

ALTER TABLE public.task_members ENABLE ROW LEVEL SECURITY;

-- Members can read task_members if they can access the parent task's farm.
CREATE POLICY "Users can view task members for accessible farms"
  ON public.task_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_members.task_id
        AND t.farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
          UNION
          SELECT farm_id FROM public.farm_members
          WHERE user_id = auth.uid() AND is_active = true
        )
    )
  );

-- Members can manage task_members if they can manage tasks in the task farm.
CREATE POLICY "Farm members can manage task members"
  ON public.task_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_members.task_id
        AND t.farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
          UNION
          SELECT farm_id FROM public.farm_members
          WHERE user_id = auth.uid() AND is_active = true
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_members.task_id
        AND t.farm_id IN (
          SELECT id FROM public.farms WHERE owner_id = auth.uid()
          UNION
          SELECT farm_id FROM public.farm_members
          WHERE user_id = auth.uid() AND is_active = true
        )
    )
  );

COMMENT ON TABLE public.task_members IS 'Members attributed to a task (profile-level attribution).';
COMMENT ON COLUMN public.task_members.role IS 'participant, lead, reviewer, etc.';
